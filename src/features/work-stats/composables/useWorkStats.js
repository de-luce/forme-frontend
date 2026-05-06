import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { fetchWorkYear, putWorkDay, saveWorkYear } from '@/api/workYear.js';
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

function clonePlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 工时页：加载按年 GET；单日修改走 PUT/DELETE；Excel 导入走按年 PUT。
 */
export function useWorkStats(containerRef) {
  const data = reactive({});
  const selectedMonth = ref(TODAY.getMonth() + 1);
  const view = ref('month');
  const importInput = ref(null);

  /** @type {Record<string, ReturnType<typeof setTimeout>>} */
  const cellTimers = {};

  function clearCellTimer(m, d) {
    const k = `${m}-${d}`;
    if (cellTimers[k]) {
      clearTimeout(cellTimers[k]);
      delete cellTimers[k];
    }
  }

  function scheduleCellSync(m, d) {
    const k = `${m}-${d}`;
    clearCellTimer(m, d);
    cellTimers[k] = setTimeout(() => {
      delete cellTimers[k];
      void flushOneCell(m, d);
    }, 450);
  }

  async function flushOneCell(m, d) {
    const k = dayKey(YEAR, m, d);
    const raw = data[k];
    const str = raw != null ? String(raw).trim() : '';
    try {
      if (!str) {
        await putWorkDay(YEAR, m, d, '');
        delete data[k];
      } else {
        const n = normalize(str);
        await putWorkDay(YEAR, m, d, n);
        data[k] = n;
      }
    } catch (e) {
      alert('保存失败：' + (e && e.message ? e.message : String(e)));
    }
  }

  async function loadWorkFromServer() {
    try {
      const obj = await fetchWorkYear(YEAR);
      Object.keys(data).forEach((key) => delete data[key]);
      Object.assign(data, obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {});
    } catch (e) {
      console.error(e);
      alert('无法从服务器加载工时数据：' + (e && e.message ? e.message : String(e)));
    }
  }

  async function syncFullYearAfterImport() {
    await saveWorkYear(YEAR, clonePlain(data));
  }

  function onInput(m, d, val) {
    const k = dayKey(YEAR, m, d);
    if (val) data[k] = val;
    else delete data[k];
    scheduleCellSync(m, d);
  }

  function onBlur(m, d, val) {
    clearCellTimer(m, d);
    const k = dayKey(YEAR, m, d);
    const n = normalize(val);
    if (n) data[k] = n;
    else delete data[k];
    void flushOneCell(m, d);
  }

  const { exportFullYearExcel, importFromExcel } = useWorkStatsExcel(YEAR, data, syncFullYearAfterImport, view);

  function cellVal(m, d) {
    return data[dayKey(YEAR, m, d)] || '';
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

  function goToPreviousMonth() {
    selectedMonth.value = selectedMonth.value <= 1 ? 12 : selectedMonth.value - 1;
    onMonthChange();
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
    goToPreviousMonth,
    exportFullYearExcel,
    importFromExcel,
  };
}
