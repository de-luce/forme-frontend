import { ref, reactive, computed, onMounted } from 'vue';
import { getApiBase } from '@/api/config.js';
import { fetchWatchList, saveWatchList } from '@/api/watchList.js';

const STORAGE_KEY = 'forme-anime-tracker-v1';
export const EXPORT_FILENAME = '追番数据.json';

export const statusLabel = {
  planned: '想看',
  watching: '追番中',
  done: '已看完',
  hold: '搁置',
};

export const statusClass = {
  planned: 'planned',
  watching: 'watching',
  done: 'done',
  hold: 'hold',
};

export function useAnimeTracker() {
  const entries = ref([]);
  const editingId = ref(null);
  const filterStatus = ref('');
  const search = ref('');
  const importInputRef = ref(null);

  const form = reactive({
    title: '',
    status: 'watching',
    currentEp: undefined,
    totalEp: undefined,
    url: '',
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

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  }

  function stripLegacyFields(e) {
    if (!e || typeof e !== 'object') return e;
    const { season, notes, ...rest } = e;
    return rest;
  }

  let saveTimer = null;

  function loadLocalOnly() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        entries.value = [];
        return;
      }
      const data = JSON.parse(raw);
      entries.value = Array.isArray(data) ? data.map(stripLegacyFields) : [];
    } catch {
      entries.value = [];
    }
  }

  async function load() {
    if (!getApiBase()) {
      loadLocalOnly();
      return;
    }
    try {
      const data = await fetchWatchList();
      entries.value = Array.isArray(data) ? data.map(stripLegacyFields) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value));
    } catch (e) {
      console.error(e);
      loadLocalOnly();
      toast('服务器不可用，已使用本地缓存');
    }
  }

  async function flushSave() {
    const list = entries.value.map(stripLegacyFields);
    entries.value = list;
    if (!getApiBase()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return;
    }
    try {
      await saveWatchList(list);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      toast('保存到服务器失败，已暂存本地');
    }
  }

  function save() {
    entries.value = entries.value.map(stripLegacyFields);
    if (!getApiBase()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value));
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  }

  const filtered = computed(() => {
    const st = filterStatus.value;
    const q = search.value.trim().toLowerCase();
    return entries.value.filter((e) => {
      if (st && e.status !== st) return false;
      if (!q) return true;
      return (e.title || '').toLowerCase().includes(q);
    });
  });

  const sortOrder = { watching: 0, planned: 1, hold: 2, done: 3 };

  const sortedFiltered = computed(() =>
    [...filtered.value].sort((a, b) => {
      const os = (sortOrder[a.status] ?? 9) - (sortOrder[b.status] ?? 9);
      if (os !== 0) return os;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    })
  );

  const counts = computed(() => {
    const c = { planned: 0, watching: 0, done: 0, hold: 0 };
    entries.value.forEach((e) => {
      if (c[e.status] !== undefined) c[e.status]++;
    });
    return c;
  });

  function parseOptionalInt(value) {
    if (value === '' || value == null) return null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function resetForm() {
    editingId.value = null;
    form.title = '';
    form.status = 'watching';
    form.currentEp = undefined;
    form.totalEp = undefined;
    form.url = '';
  }

  function submitForm() {
    if (!form.title.trim()) {
      toast('请填写标题');
      return;
    }
    const row = {
      title: form.title.trim(),
      status: form.status,
      currentEp: parseOptionalInt(form.currentEp) ?? 0,
      totalEp: parseOptionalInt(form.totalEp),
      url: form.url.trim() || '',
      updatedAt: Date.now(),
    };
    if (editingId.value) {
      const i = entries.value.findIndex((x) => x.id === editingId.value);
      if (i >= 0) {
        entries.value[i] = { ...entries.value[i], ...row };
        toast('已更新');
      }
    } else {
      entries.value.push({ id: uid(), ...row });
      toast('已添加');
    }
    save();
    resetForm();
  }

  function cancelEdit() {
    resetForm();
  }

  function epPlus(item) {
    item.currentEp = (item.currentEp ?? 0) + 1;
    if (item.totalEp != null && item.currentEp > item.totalEp) item.currentEp = item.totalEp;
    item.updatedAt = Date.now();
    save();
    toast('进度 +1');
  }

  function startEdit(item) {
    editingId.value = item.id;
    form.title = item.title;
    form.status = item.status;
    form.currentEp = item.currentEp != null ? item.currentEp : undefined;
    form.totalEp = item.totalEp != null ? item.totalEp : undefined;
    form.url = item.url || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function remove(id) {
    if (!confirm('确定删除这条记录？')) return;
    entries.value = entries.value.filter((x) => x.id !== id);
    if (editingId.value === id) resetForm();
    save();
    toast('已删除');
  }

  function normalizeImport(x) {
    return stripLegacyFields({
      id: x.id && typeof x.id === 'string' ? x.id : uid(),
      title: String(x.title || '').trim() || '未命名',
      status: ['planned', 'watching', 'done', 'hold'].includes(x.status) ? x.status : 'watching',
      currentEp: typeof x.currentEp === 'number' && x.currentEp >= 0 ? x.currentEp : 0,
      totalEp: typeof x.totalEp === 'number' && x.totalEp >= 0 ? x.totalEp : null,
      url: String(x.url || '').trim(),
      updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
    });
  }

  function mergeImported(normalized) {
    if (!confirm(`将导入 ${normalized.length} 条记录，会与现有数据合并，是否继续？`)) return;
    const ids = new Set(entries.value.map((e) => e.id));
    normalized.forEach((n) => {
      if (ids.has(n.id)) n.id = uid();
      entries.value.push(n);
      ids.add(n.id);
    });
    save();
    toast('导入完成');
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
        mergeImported(data.map(normalizeImport));
      } catch {
        toast('导入失败：文件格式不对');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function clearAll() {
    if (!confirm('确定清空全部记录？此操作不可撤销（可先导出备份）。')) return;
    entries.value = [];
    save();
    resetForm();
    toast('已清空');
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
    filtered,
    sortedFiltered,
    counts,
    submitForm,
    cancelEdit,
    epPlus,
    startEdit,
    remove,
    exportJson,
    triggerImport,
    onImportFile,
    clearAll,
  };
}
