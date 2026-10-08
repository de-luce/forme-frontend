<template>
  <div class="stats-page">
    <header>
      <div class="header-inner">
        <div class="left">
          <RouterLink class="nav-home" to="/">← 首页</RouterLink>
          <button type="button" :class="{ active: view === 'month' }" @click="switchView('month')">当月</button>
          <button type="button" @click="goToPreviousMonth">上月</button>
          <select v-model.number="selectedMonth" @change="onMonthChange">
            <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
          </select>
          <button type="button" @click="exportFullYearExcel">导出 Excel</button>
          <button type="button" @click="importInput?.click()">导入 Excel</button>
          <input ref="importInput" class="hidden" type="file" accept=".xlsx,.xls" @change="importFromExcel" />
        </div>
        <div class="header-end">
          <div class="header-summary">
            <div v-if="view === 'month'" class="summary">本月：{{ format(monthTotal) }}</div>
            <div v-if="view === 'month'" class="summary">{{ monthLeaveText }}</div>
          </div>
          <button type="button" :class="{ active: view === 'year' }" @click="switchView('year')">总览</button>
        </div>
      </div>
    </header>

    <div ref="containerRef" class="container">
      <div v-show="view === 'month'" :key="'month-' + selectedMonth" class="grid">
        <div
          v-for="d in monthDaysList"
          :key="selectedMonth + '-' + d"
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
import { ref } from 'vue';
import { useWorkStats } from '@/features/work/composables/useWorkStats.js';

const containerRef = ref(null);
const {
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
} = useWorkStats(containerRef);
</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--grid);
  display: flex;
  justify-content: center;
  position: sticky;
  top: 0;
  background: var(--header-bg);
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
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.header-end {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 0;
}

.header-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.summary {
  padding: 6px 0;
  font-size: 13px;
  color: var(--muted);
  border-bottom: 1px solid transparent;
  font-variant-numeric: tabular-nums;
}

.summary:first-child {
  color: var(--text);
  font-family: var(--font-mono);
  font-weight: 500;
}

button {
  background: transparent;
  border: 1px solid var(--grid);
  padding: 7px 12px;
  border-radius: 4px;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
}

button:hover {
  background: rgba(28, 25, 23, 0.04);
  border-color: #c4bbb0;
}

button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #f7f3ec;
}

button.active:hover {
  filter: brightness(1.05);
}

select {
  padding: 7px 10px;
  border-radius: 4px;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--grid);
  font-size: 13px;
}

.container {
  padding: 24px 20px 40px;
  max-width: 1280px;
  margin: auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 12px;
}

.day {
  background: var(--card);
  border-radius: 4px;
  padding: 14px 12px;
  border: 1px solid var(--grid);
}

.day.today {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.day input {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--grid);
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
  font-family: var(--font-mono);
}

.day input:focus {
  outline: 2px solid var(--accent-soft);
  border-color: var(--accent);
}

.day .date {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.diff {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  min-height: 1.3em;
  font-family: var(--font-mono);
}

.pos {
  color: var(--pos);
}

.neg {
  color: var(--neg);
}

.year-no-data {
  color: var(--muted);
  font-weight: 500;
  font-family: var(--font-body);
}

.nav-home {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-radius: 0;
  background: transparent;
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  border: none;
  border-bottom: 1px solid transparent;
  margin-right: 4px;
}

.nav-home:hover {
  background: transparent;
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.hidden {
  display: none;
}
</style>
