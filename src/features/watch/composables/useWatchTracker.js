import { ref, reactive, computed, onMounted } from 'vue';
import {
  createWatchEntry,
  deleteWatchEntry,
  fetchWatchList,
  replaceWatchList,
  updateWatchEntry,
} from '@/features/watch/api/watchApi.js';

export const EXPORT_FILENAME = '追番数据.json';

/** 仅支持：追番中、已看完；历史 planned/hold 在展示与保存时归入追番中 */
export const statusClass = {
  watching: 'watching',
  done: 'done',
};

export function normalizeStatus(s) {
  return s === 'done' ? 'done' : 'watching';
}

function stripLegacyFields(e) {
  if (!e || typeof e !== 'object') return e;
  const { season, notes, url, totalEp, ...rest } = e;
  return rest;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function normalizeSortOrder(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 追番：CRUD 接口 + 全量 replace（清空/合并导入）。
 */
export function useWatchTracker() {
  const entries = ref([]);
  const editingId = ref(null);
  const filterStatus = ref('');
  const search = ref('');
  const importInputRef = ref(null);

  const form = reactive({
    title: '',
    currentEp: undefined,
  });

  const toastMsg = ref('');
  const toastShow = ref(false);
  let toastTimer = null;

  function toast(msg) {
    toastMsg.value = msg;
    toastShow.value = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastShow.value = false;
    }, 2200);
  }

  /** 同 status 内按 sortOrder；若全为 0 则按 updatedAt 降序回填一次内存顺序 */
  function ensureSortOrders(list) {
    const byStatus = { watching: [], done: [] };
    list.forEach((e) => {
      const ns = normalizeStatus(e.status);
      byStatus[ns].push(e);
    });
    for (const status of ['watching', 'done']) {
      const group = byStatus[status];
      const allZero = group.every((e) => normalizeSortOrder(e.sortOrder) === 0);
      if (allZero && group.length > 1) {
        group
          .slice()
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .forEach((e, i) => {
            e.sortOrder = i;
          });
      } else {
        group.forEach((e) => {
          e.sortOrder = normalizeSortOrder(e.sortOrder);
        });
      }
    }
    return list;
  }

  async function load() {
    try {
      const data = await fetchWatchList();
      entries.value = Array.isArray(data)
        ? ensureSortOrders(
            data.map((row) => {
              const x = stripLegacyFields(row);
              return {
                ...x,
                status: normalizeStatus(x.status),
                sortOrder: normalizeSortOrder(x.sortOrder),
              };
            })
          )
        : [];
    } catch (e) {
      console.error(e);
      entries.value = [];
      toast('无法从服务器加载：' + (e && e.message ? e.message : String(e)));
    }
  }

  const canReorder = computed(() => !filterStatus.value && !search.value.trim());

  const filtered = computed(() => {
    const st = filterStatus.value;
    const q = search.value.trim().toLowerCase();
    return entries.value.filter((e) => {
      const ns = normalizeStatus(e.status);
      if (st && ns !== st) return false;
      if (!q) return true;
      return (e.title || '').toLowerCase().includes(q);
    });
  });

  const statusRank = { watching: 0, done: 1 };

  const sortedFiltered = computed(() =>
    [...filtered.value].sort((a, b) => {
      const os =
        (statusRank[normalizeStatus(a.status)] ?? 9) - (statusRank[normalizeStatus(b.status)] ?? 9);
      if (os !== 0) return os;
      const so = normalizeSortOrder(a.sortOrder) - normalizeSortOrder(b.sortOrder);
      if (so !== 0) return so;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    })
  );

  const watchingList = computed(() =>
    sortedFiltered.value.filter((e) => normalizeStatus(e.status) === 'watching')
  );

  const doneList = computed(() =>
    sortedFiltered.value.filter((e) => normalizeStatus(e.status) === 'done')
  );

  const counts = computed(() => {
    const c = { watching: 0, done: 0 };
    entries.value.forEach((e) => {
      if (normalizeStatus(e.status) === 'done') c.done++;
      else c.watching++;
    });
    return c;
  });

  function parseOptionalInt(value) {
    if (value === '' || value == null) return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return null;
    const n = parseInt(String(value).trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function topSortOrder(status) {
    const group = entries.value.filter((e) => normalizeStatus(e.status) === status);
    if (!group.length) return 0;
    return Math.min(...group.map((e) => normalizeSortOrder(e.sortOrder))) - 1;
  }

  function resetForm() {
    editingId.value = null;
    form.title = '';
    form.currentEp = undefined;
  }

  async function submitForm() {
    if (!form.title.trim()) {
      toast('请填写标题');
      return;
    }
    const row = {
      title: form.title.trim(),
      currentEp: parseOptionalInt(form.currentEp) ?? 0,
      updatedAt: Date.now(),
    };
    try {
      if (editingId.value) {
        const prev = entries.value.find((x) => x.id === editingId.value);
        const merged = stripLegacyFields({
          ...prev,
          ...row,
          id: editingId.value,
          sortOrder: normalizeSortOrder(prev?.sortOrder),
        });
        await updateWatchEntry(editingId.value, merged);
        toast('已更新');
      } else {
        await createWatchEntry(
          stripLegacyFields({
            id: uid(),
            status: 'watching',
            sortOrder: topSortOrder('watching'),
            ...row,
          })
        );
        toast('已添加');
      }
      await load();
    } catch (e) {
      toast('保存失败：' + (e && e.message ? e.message : String(e)));
    }
    resetForm();
  }

  function cancelEdit() {
    resetForm();
  }

  async function epPlus(item) {
    const nextEp = (item.currentEp ?? 0) + 1;
    try {
      await updateWatchEntry(
        item.id,
        stripLegacyFields({
          ...item,
          currentEp: nextEp,
          status: normalizeStatus(item.status),
          sortOrder: normalizeSortOrder(item.sortOrder),
        })
      );
      toast('进度 +1');
      await load();
    } catch (e) {
      toast('保存失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  function startEdit(item) {
    editingId.value = item.id;
    form.title = item.title;
    form.currentEp = item.currentEp != null ? item.currentEp : undefined;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function setEntryStatus(entry, newStatus) {
    const next = normalizeStatus(newStatus);
    if (normalizeStatus(entry.status) === next) return;
    try {
      await updateWatchEntry(
        entry.id,
        stripLegacyFields({
          ...entry,
          status: next,
          sortOrder: topSortOrder(next),
          updatedAt: Date.now(),
        })
      );
      toast('状态已更新');
      await load();
    } catch (e) {
      toast('状态保存失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  async function persistGroupOrder(status, orderedIds) {
    const idToOrder = new Map(orderedIds.map((id, i) => [id, i]));
    entries.value = entries.value.map((e) => {
      if (normalizeStatus(e.status) !== status || !idToOrder.has(e.id)) return e;
      return { ...e, sortOrder: idToOrder.get(e.id) };
    });
    const next = entries.value.map((e) => stripLegacyFields(e));
    try {
      await replaceWatchList(next);
      toast('顺序已保存');
    } catch (e) {
      toast('顺序保存失败：' + (e && e.message ? e.message : String(e)));
      await load();
    }
  }

  async function onWatchingReorder(newList) {
    if (!canReorder.value) return;
    await persistGroupOrder(
      'watching',
      newList.map((e) => e.id)
    );
  }

  async function onDoneReorder(newList) {
    if (!canReorder.value) return;
    await persistGroupOrder(
      'done',
      newList.map((e) => e.id)
    );
  }

  function copyTextFallback(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
    return ok;
  }

  async function copyTitle(text) {
    const t = (text || '').trim();
    if (!t) {
      toast('无标题可复制');
      return;
    }
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(t);
        toast('已复制标题');
        return;
      }
    } catch {
      /* HTTP 或权限不足时走回退 */
    }
    if (copyTextFallback(t)) {
      toast('已复制标题');
    } else {
      toast('复制失败，请手动选择标题复制');
    }
  }

  async function remove(id) {
    if (!confirm('确定删除这条记录？')) return;
    try {
      await deleteWatchEntry(id);
      if (editingId.value === id) resetForm();
      await load();
      toast('已删除');
    } catch (e) {
      toast('删除失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  function normalizeImport(x) {
    return stripLegacyFields({
      id: x.id && typeof x.id === 'string' ? x.id : uid(),
      title: String(x.title || '').trim() || '未命名',
      status: normalizeStatus(x.status),
      currentEp: typeof x.currentEp === 'number' && x.currentEp >= 0 ? x.currentEp : 0,
      sortOrder: normalizeSortOrder(x.sortOrder),
      updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
    });
  }

  async function mergeImported(normalized) {
    if (!confirm(`将导入 ${normalized.length} 条记录，会与现有数据合并，是否继续？`)) return;
    const ids = new Set(entries.value.map((e) => e.id));
    const merged = [...entries.value.map(stripLegacyFields)];
    normalized.forEach((n) => {
      if (ids.has(n.id)) n.id = uid();
      merged.push(n);
      ids.add(n.id);
    });
    try {
      await replaceWatchList(merged);
      await load();
      toast('导入完成');
    } catch (e) {
      toast('导入保存失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  function exportJson() {
    const json = JSON.stringify(entries.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = EXPORT_FILENAME;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出');
  }

  function triggerImport() {
    importInputRef.value?.click();
  }

  function onImportFile(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('格式应为数组');
        void mergeImported(data.map(normalizeImport));
      } catch {
        toast('导入失败：文件格式不对');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function clearAll() {
    if (!confirm('确定清空全部记录？此操作不可撤销（可先导出备份）。')) return;
    try {
      await replaceWatchList([]);
      await load();
      resetForm();
      toast('已清空');
    } catch (e) {
      toast('清空失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  onMounted(() => {
    load();
  });

  return {
    entries,
    editingId,
    filterStatus,
    search,
    importInputRef,
    form,
    toastMsg,
    toastShow,
    canReorder,
    filtered,
    sortedFiltered,
    watchingList,
    doneList,
    counts,
    normalizeStatus,
    submitForm,
    cancelEdit,
    epPlus,
    startEdit,
    setEntryStatus,
    onWatchingReorder,
    onDoneReorder,
    copyTitle,
    remove,
    exportJson,
    triggerImport,
    onImportFile,
    clearAll,
  };
}
