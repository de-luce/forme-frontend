<template>
  <div class="stats-page">
    <header>
      <div class="header-inner">
        <div class="left">
          <RouterLink class="nav-home" to="/">← 首页</RouterLink>
          <button type="button" :class="{ active: view === 'month' }" @click="switchView('month')">当月</button>
          <button type="button" :class="{ active: view === 'year' }" @click="switchView('year')">总览</button>
          <select v-model.number="selectedMonth" @change="onMonthChange">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <button type="button" @click="exportFullYearExcel">导出 Excel</button>
          <button type="button" @click="importInput?.click()">导入 Excel</button>
          <input ref="importInput" class="hidden" type="file" accept=".xlsx,.xls" @change="importFromExcel" />
        </div>
        <div class="header-summary">
          <div v-if="view === 'month'" class="card">本月：{{ format(monthTotal) }}</div>
          <div v-if="view === 'month'" class="card">{{ monthLeaveText }}</div>
        </div>
      </div>
    </header>

    <div class="container">
      <div v-show="view === 'month'" class="grid">
        <div
          v-for="d in monthDaysList"
          :key="d"
          :id="'day-' + selectedMonth + '-' + d"
          class="day"
          :class="{ today: isTodayCell(selectedMonth, d) }"
        >
          <div class="date">{{ selectedMonth }}/{{ d }}</div>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            spellcheck="false"
            :value="cellVal(selectedMonth, d)"
            placeholder="多久？"
            @input="onInput(selectedMonth, d, $event.target.value)"
            @blur="onBlur(selectedMonth, d, $event.target.value)"
          />
          <div class="diff" :class="diffClass(selectedMonth, d)">{{ diffLabel(selectedMonth, d) }}</div>
        </div>
      </div>

      <div v-show="view === 'year'" class="grid">
        <div v-for="m in 12" :key="m" class="day">
          <div class="date">{{ m }}月</div>
          <div class="diff" :class="yearDiffClass(m)">{{ yearDiffText(m) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import * as XLSX from 'xlsx-js-style';
import { apiUrl, apiHeaders, getApiBase } from '../api/config.js';
import {
  daysInMonth,
  parse,
  format,
  formatSignedDiff,
  normalize,
  dayKey,
  getMonthStats,
  buildExportRows,
  applyExportStyles,
  applyImportMatrix,
} from '../lib/workStatsCore.js';

const YEAR = new Date().getFullYear();
const TODAY = new Date();

const data = reactive({});
const selectedMonth = ref(TODAY.getMonth() + 1);
const view = ref('month');
const importInput = ref(null);

let workSaveTimer = null;

function cellVal(m, d) {
  return data[dayKey(YEAR, m, d)] || '';
}

function loadLocalWork() {
  try {
    const raw = localStorage.getItem('work-' + YEAR);
    const obj = raw ? JSON.parse(raw) : {};
    Object.keys(data).forEach((k) => delete data[k]);
    Object.assign(data, obj && typeof obj === 'object' ? obj : {});
  } catch {
    Object.keys(data).forEach((k) => delete data[k]);
  }
}

async function loadWorkFromServer() {
  if (!getApiBase()) {
    loadLocalWork();
    return;
  }
  try {
    const r = await fetch(apiUrl('/api/work/' + YEAR), { headers: apiHeaders(false) });
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
    const obj = await r.json();
    Object.keys(data).forEach((k) => delete data[k]);
    Object.assign(data, obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {});
    localStorage.setItem('work-' + YEAR, JSON.stringify({ ...data }));
  } catch (e) {
    console.error(e);
    loadLocalWork();
    alert('无法从服务器加载工时数据，已使用本地缓存');
  }
}

async function flushWorkSave() {
  try {
    const r = await fetch(apiUrl('/api/work/' + YEAR), {
      method: 'PUT',
      headers: apiHeaders(true),
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    localStorage.setItem('work-' + YEAR, JSON.stringify({ ...data }));
  } catch (e) {
    console.error(e);
    localStorage.setItem('work-' + YEAR, JSON.stringify({ ...data }));
    alert('保存到服务器失败（已写入本地缓存）');
  }
}

function save() {
  localStorage.setItem('work-' + YEAR, JSON.stringify({ ...data }));
  if (!getApiBase()) return;
  clearTimeout(workSaveTimer);
  workSaveTimer = setTimeout(flushWorkSave, 500);
}

function onInput(m, d, val) {
  const k = dayKey(YEAR, m, d);
  if (val) data[k] = val;
  else delete data[k];
  save();
}

function onBlur(m, d, val) {
  const n = normalize(val);
  const k = dayKey(YEAR, m, d);
  if (n) data[k] = n;
  else delete data[k];
  save();
}

const monthDaysList = computed(() => {
  const m = selectedMonth.value;
  const n = daysInMonth(YEAR, m);
  return Array.from({ length: n }, (_, i) => i + 1);
});

const monthTotal = computed(() => getMonthStats(YEAR, data, selectedMonth.value).total);

const monthLeaveText = computed(() =>
  monthTotal.value > 0 ? `可提前下班 ${format(monthTotal.value)}` : `需补 ${format(monthTotal.value)}`
);

function isTodayCell(m, d) {
  return m === TODAY.getMonth() + 1 && d === TODAY.getDate();
}

function diffLabel(m, d) {
  const v = data[dayKey(YEAR, m, d)];
  const p = parse(v);
  if (p == null) return '';
  const diff = p - STANDARD;
  return formatSignedDiff(diff);
}

function diffClass(m, d) {
  const v = data[dayKey(YEAR, m, d)];
  const p = parse(v);
  if (p == null) return '';
  const diff = p - STANDARD;
  return diff >= 0 ? 'pos' : 'neg';
}

function yearDiffText(m) {
  const { total, hasData } = getMonthStats(YEAR, data, m);
  return hasData ? format(total) : '—';
}

function yearDiffClass(m) {
  const { hasData } = getMonthStats(YEAR, data, m);
  return hasData ? 'pos' : 'year-no-data';
}

function switchView(v) {
  if (v === 'month') {
    selectedMonth.value = TODAY.getMonth() + 1;
    view.value = 'month';
    nextTick(() => scrollToTodayCell());
  } else {
    view.value = 'year';
  }
}

function onMonthChange() {
  nextTick(() => scrollToTodayCell());
}

function scrollToTodayCell() {
  const m = TODAY.getMonth() + 1;
  const d = TODAY.getDate();
  if (selectedMonth.value !== m) return;
  const el = document.getElementById(`day-${m}-${d}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const inp = el.querySelector('input');
  if (inp) inp.focus({ preventScroll: true });
}

const EXPORT_IDB_NAME = 'ForMeWorkHours';
const EXPORT_IDB_STORE = 'excelExportHandle';
const EXPORT_IDB_VER = 1;

function idbOpenExport() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EXPORT_IDB_NAME, EXPORT_IDB_VER);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(EXPORT_IDB_STORE)) {
        db.createObjectStore(EXPORT_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbAccess(mode, cb) {
  const db = await idbOpenExport();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EXPORT_IDB_STORE, mode);
    const store = tx.objectStore(EXPORT_IDB_STORE);
    let result;
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(result);
    cb(store, (v) => {
      result = v;
    }, reject);
  });
}

function idbPutExportHandle(key, handle) {
  return idbAccess('readwrite', (store) => {
    store.put(handle, key);
  });
}

function idbGetExportHandle(key) {
  return idbAccess('readonly', (store, setResult, reject) => {
    const q = store.get(key);
    q.onsuccess = () => setResult(q.result);
    q.onerror = () => reject(q.error);
  });
}

async function writeWorkbookXlsxReplace(wb, defaultFileName) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const idbKey = 'xlsx-export-' + YEAR;

  const writeToHandle = async (fileHandle) => {
    const writable = await fileHandle.createWritable();
    await writable.write(buf);
    await writable.close();
  };

  if (!window.showSaveFilePicker) {
    XLSX.writeFile(wb, defaultFileName);
    return;
  }

  let saved = null;
  try {
    saved = await idbGetExportHandle(idbKey);
  } catch (_) {}

  if (saved && typeof saved.createWritable === 'function') {
    try {
      let ok = (await saved.queryPermission({ mode: 'readwrite' })) === 'granted';
      if (!ok) ok = (await saved.requestPermission({ mode: 'readwrite' })) === 'granted';
      if (ok) {
        await writeToHandle(saved);
        return;
      }
    } catch (_) {}
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: defaultFileName,
      types: [
        {
          description: 'Excel 工作簿',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });
    await writeToHandle(fileHandle);
    await idbPutExportHandle(idbKey, fileHandle);
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    XLSX.writeFile(wb, defaultFileName);
  }
}

async function exportFullYearExcel() {
  const ws = XLSX.utils.aoa_to_sheet(buildExportRows(YEAR, data));
  ws['!cols'] = [{ wch: 6 }, ...Array(12).fill({ wch: 10 })];
  applyExportStyles(ws, YEAR, XLSX);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(YEAR));
  await writeWorkbookXlsxReplace(wb, `工时-${YEAR}-全日.xlsx`);
}

function importFromExcel(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const buf = new Uint8Array(e.target.result);
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
      applyImportMatrix(YEAR, data, matrix, XLSX);
      save();
      if (view.value === 'year') {
        view.value = 'month';
      }
    } catch (err) {
      alert('导入失败：' + (err && err.message ? err.message : String(err)));
    }
  };
  reader.readAsArrayBuffer(f);
}

onMounted(async () => {
  await loadWorkFromServer();
  await nextTick();
  scrollToTodayCell();
});
</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  background: #0b1220;
  color: #e5e7eb;
}

header {
  padding: 14px 20px;
  border-bottom: 1px solid #1f2937;
  display: flex;
  justify-content: center;
  position: sticky;
  top: 0;
  background: rgba(11, 18, 32, 0.92);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.header-inner {
  width: 100%;
  max-width: 1280px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.left {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.header-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.header-summary .card {
  padding: 8px 12px;
  font-size: 13px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
}

button {
  background: #1f2937;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #374151;
}

button.active {
  background: #3b82f6;
}

button.active:hover {
  background: #2563eb;
}

select {
  padding: 8px 10px;
  border-radius: 8px;
  background: #111;
  color: #fff;
  border: 1px solid #1f2937;
  font-size: 14px;
}

.container {
  padding: 20px;
  max-width: 1280px;
  margin: auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 12px;
}

.day {
  background: #111827;
  border-radius: 12px;
  padding: 14px 12px;
  border: 1px solid #1f2937;
}

.day.today {
  border: 1px solid #3b82f6;
}

.day input {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #1f2937;
  background: #020617;
  color: #fff;
  font-size: 15px;
}

.day .date {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

.diff {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  min-height: 1.3em;
}

.pos {
  color: #22c55e;
}

.neg {
  color: #ef4444;
}

.year-no-data {
  color: #6b7280;
  font-weight: 500;
}

.nav-home {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #1f2937;
  color: #e5e7eb;
  text-decoration: none;
  font-size: 14px;
  border: 1px solid #1f2937;
}

.nav-home:hover {
  background: #374151;
}

.hidden {
  display: none;
}
</style>
