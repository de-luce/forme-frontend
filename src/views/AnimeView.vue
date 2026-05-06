<template>
  <div class="anime-page">
    <header>
      <div class="header-row">
        <div class="header-inner">
          <div class="title-block">
            <RouterLink class="nav-back" to="/" title="首页">← 首页</RouterLink>
            <h1>追番记录</h1>
          </div>
          <div class="toolbar">
            <button type="button" @click="exportJson">导出 JSON</button>
            <button type="button" @click="triggerImport">导入 JSON</button>
            <input ref="importInputRef" type="file" class="hidden-input" accept=".json,application/json" @change="onImportFile" />
            <button type="button" class="danger" @click="clearAll">清空全部</button>
          </div>
        </div>
      </div>
    </header>

    <main>
      <div class="stats">
        <span class="stat-pill">共 <strong>{{ entries.length }}</strong> 部</span>
        <span class="stat-pill">想看 <strong>{{ counts.planned }}</strong></span>
        <span class="stat-pill">追番中 <strong>{{ counts.watching }}</strong></span>
        <span class="stat-pill">已看完 <strong>{{ counts.done }}</strong></span>
        <span class="stat-pill">搁置 <strong>{{ counts.hold }}</strong></span>
        <span v-if="filterStatus || search.trim()" class="stat-pill">当前显示 <strong>{{ filtered.length }}</strong> 部</span>
      </div>

      <div class="filters">
        <label for="filter-status">状态</label>
        <select id="filter-status" v-model="filterStatus">
          <option value="">全部</option>
          <option value="planned">想看</option>
          <option value="watching">追番中</option>
          <option value="done">已看完</option>
          <option value="hold">搁置</option>
        </select>
        <div class="search-wrap">
          <input v-model="search" type="search" placeholder="搜索标题…" autocomplete="off" />
        </div>
      </div>

      <section class="panel">
        <h2>{{ editingId ? '编辑条目' : '添加条目' }}</h2>
        <form @submit.prevent="submitForm">
          <div class="form-grid">
            <div class="field span-2">
              <label for="title">标题</label>
              <input id="title" v-model.trim="form.title" required maxlength="200" placeholder="作品名称" />
            </div>
            <div class="field">
              <label for="status">状态</label>
              <select id="status" v-model="form.status">
                <option value="planned">想看</option>
                <option value="watching">追番中</option>
                <option value="done">已看完</option>
                <option value="hold">搁置</option>
              </select>
            </div>
            <div class="field">
              <label for="currentEp">当前看到</label>
              <input id="currentEp" v-model.number="form.currentEp" type="number" min="0" step="1" placeholder="0" />
            </div>
            <div class="field">
              <label for="totalEp">总集数（可选）</label>
              <input id="totalEp" v-model.number="form.totalEp" type="number" min="0" step="1" placeholder="留空表示未知" />
            </div>
            <div class="field span-2">
              <label for="url">链接（可选）</label>
              <input id="url" v-model.trim="form.url" type="url" placeholder="Bangumi / B站 / 任意网址" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="primary">{{ editingId ? '更新' : '保存' }}</button>
            <button v-if="editingId" type="button" @click="cancelEdit">取消编辑</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>列表</h2>
        <div class="list">
          <p v-if="sortedFiltered.length === 0" class="empty">暂无条目，先在上方添加一部作品吧。</p>
          <article v-for="e in sortedFiltered" :key="e.id" class="card">
            <div class="card-main">
              <h3>{{ e.title }}</h3>
              <div class="meta">
                <span class="badge" :class="statusClass[e.status] || 'planned'">{{ statusLabel[e.status] || e.status }}</span>
              </div>
              <div class="progress-line">
                <span class="ep">第 {{ e.currentEp ?? 0 }} 话</span>
                <template v-if="e.totalEp != null"> / 共 {{ e.totalEp }} 话</template>
              </div>
              <div v-if="e.url" class="link-row">
                <a :href="e.url" target="_blank" rel="noopener noreferrer">打开链接</a>
              </div>
            </div>
            <div class="card-actions">
              <button type="button" @click="epPlus(e)">+1 话</button>
              <button type="button" @click="startEdit(e)">编辑</button>
              <button type="button" class="danger" @click="remove(e.id)">删除</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div class="toast" :class="{ show: toastShow }" role="status">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { apiUrl, apiHeaders, getApiBase } from '../api/config.js';

const STORAGE_KEY = 'forme-anime-tracker-v1';
const EXPORT_FILENAME = '追番数据.json';

const statusLabel = {
  planned: '想看',
  watching: '追番中',
  done: '已看完',
  hold: '搁置',
};
const statusClass = {
  planned: 'planned',
  watching: 'watching',
  done: 'done',
  hold: 'hold',
};

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
  const API_BASE = getApiBase();
  if (API_BASE) {
    try {
      const r = await fetch(apiUrl('/api/watch'), { headers: apiHeaders(false) });
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      const data = await r.json();
      entries.value = Array.isArray(data) ? data.map(stripLegacyFields) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value));
    } catch (e) {
      console.error(e);
      loadLocalOnly();
      toast('服务器不可用，已使用本地缓存');
    }
    return;
  }
  loadLocalOnly();
}

async function flushSave() {
  const list = entries.value.map(stripLegacyFields);
  entries.value = list;
  const API_BASE = getApiBase();
  if (!API_BASE) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return;
  }
  try {
    const r = await fetch(apiUrl('/api/watch'), {
      method: 'PUT',
      headers: apiHeaders(true),
      body: JSON.stringify(list),
    });
    if (!r.ok) throw new Error(await r.text());
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

watch([filterStatus, search], () => {}, { flush: 'post' });

onMounted(() => {
  load();
});
</script>

<style scoped>
.anime-page {
  min-height: 100vh;
  background: radial-gradient(ellipse 120% 80% at 50% -20%, rgba(168, 85, 247, 0.12), transparent), var(--bg);
  color: var(--text);
}

header {
  padding: 0;
  border-bottom: 1px solid var(--grid);
  position: sticky;
  top: 0;
  background: rgba(11, 18, 32, 0.92);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.header-row {
  padding: 14px 20px;
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.nav-back {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--grid);
  border: 1px solid #374151;
  text-decoration: none;
  font-size: 13px;
  color: var(--text);
}

.nav-back:hover {
  background: #374151;
}

h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.hidden-input {
  display: none;
}

button,
.btn-file {
  background: var(--grid);
  border: 1px solid #374151;
  color: var(--text);
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

button:hover {
  background: #374151;
}

button.primary {
  background: #a855f7;
  border-color: #9333ea;
  color: #fff;
}

button.danger {
  border-color: #7f1d1d;
  color: #fca5a5;
}

main {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
}

.stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.stat-pill {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--card);
  border: 1px solid var(--grid);
  color: var(--muted);
}

.stat-pill strong {
  color: var(--text);
  margin-left: 4px;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}

.filters label {
  font-size: 12px;
  color: var(--muted);
}

select {
  background: var(--card);
  border: 1px solid var(--grid);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.search-wrap {
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}

.search-wrap input {
  width: 100%;
  background: var(--card);
  border: 1px solid var(--grid);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.panel {
  background: var(--card);
  border: 1px solid var(--grid);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field.span-2 {
  grid-column: span 2;
}

@media (max-width: 520px) {
  .field.span-2 {
    grid-column: span 1;
  }
}

.field label {
  font-size: 12px;
  color: var(--muted);
}

.field input {
  background: var(--bg);
  border: 1px solid var(--grid);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: var(--bg);
  border: 1px solid var(--grid);
  border-radius: 10px;
  padding: 14px 16px;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr auto;
  align-items: start;
}

@media (max-width: 560px) {
  .card {
    grid-template-columns: 1fr;
  }
}

.card-main h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.badge.planned {
  background: rgba(56, 189, 248, 0.15);
  color: #7dd3fc;
}
.badge.watching {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}
.badge.done {
  background: rgba(100, 116, 139, 0.25);
  color: #cbd5e1;
}
.badge.hold {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}

.progress-line {
  margin-top: 8px;
  font-size: 13px;
}

.ep {
  color: #a855f7;
  font-weight: 600;
}

.link-row {
  margin-top: 6px;
}

.link-row a {
  color: #a855f7;
  font-size: 13px;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.card-actions button {
  padding: 6px 10px;
  font-size: 12px;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted);
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--card);
  border: 1px solid var(--grid);
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  opacity: 0;
  transition: transform 0.25s, opacity 0.25s;
  z-index: 100;
  pointer-events: none;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
</style>
