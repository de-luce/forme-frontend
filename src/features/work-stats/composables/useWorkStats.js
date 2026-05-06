import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { getApiBase } from '@/api/config.js';
import { fetchWorkYear, saveWorkYear } from '@/api/workYear.js';
import {
  STANDARD,
  daysInMonth,
  parse,
  format,
  formatSignedDiff,
  normalize,
  dayKey,
  getMonthStats,
} from '@/domain/work-stats/workStatsCore.js';
import { useWorkStatsExcel } from './useWorkStatsExcel.js';

const YEAR = new Date().getFullYear();
const TODAY = new Date();

/**
 * 工时页状态与持久化。视图层只负责模板与 DOM ref（如 container）。
 */
export function useWorkStats(containerRef) {
  const data = reactive({});
  const selectedMonth = ref(TODAY.getMonth() + 1);
  const view = ref('month');
  const importInput = ref(null);

  let workSaveTimer = null;

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
      const obj = await fetchWorkYear(YEAR);
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
      await saveWorkYear(YEAR, data);
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

  const { exportFullYearExcel, importFromExcel } = useWorkStatsExcel(YEAR, data, save, view);

  function cellVal(m, d) {
    return data[dayKey(YEAR, m, d)] || '';
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

  function scrollMonthGridIntoView() {
    const wrap = containerRef.value;
    if (wrap) {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    view.value = 'month';
    nextTick(() => {
      const mToday = TODAY.getMonth() + 1;
      if (selectedMonth.value === mToday) {
        scrollToTodayCell();
      } else {
        scrollMonthGridIntoView();
      }
    });
  }

  onMounted(async () => {
    await loadWorkFromServer();
    await nextTick();
    scrollToTodayCell();
  });

  return {
    YEAR,
    TODAY,
    data,
    selectedMonth,
    view,
    importInput,
    format,
    cellVal,
    onInput,
    onBlur,
    monthDaysList,
    monthTotal,
    monthLeaveText,
    isTodayCell,
    diffLabel,
    diffClass,
    yearDiffText,
    yearDiffClass,
    switchView,
    onMonthChange,
    exportFullYearExcel,
    importFromExcel,
  };
}
