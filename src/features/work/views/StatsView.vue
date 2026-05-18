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
            <div v-if="view === 'month'" class="card">本月：{{ format(monthTotal) }}</div>
            <div v-if="view === 'month'" class="card">{{ monthLeaveText }}</div>
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
