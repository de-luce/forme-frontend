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
        <span class="stat-pill">追番中 <strong>{{ counts.watching }}</strong></span>
        <span class="stat-pill">已看完 <strong>{{ counts.done }}</strong></span>
        <span v-if="filterStatus || search.trim()" class="stat-pill">当前显示 <strong>{{ filtered.length }}</strong> 部</span>
      </div>

      <div class="filters">
        <label for="filter-status">状态</label>
        <select id="filter-status" v-model="filterStatus">
          <option value="">全部</option>
          <option value="watching">追番中</option>
          <option value="done">已看完</option>
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
              <label for="currentEp">当前看到</label>
              <input id="currentEp" v-model.number="form.currentEp" type="number" min="0" step="1" placeholder="0" />
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
        <p v-if="!canReorder" class="reorder-hint">筛选或搜索时不可拖动排序；切回「全部」并清空搜索后可拖动整行调整顺序。</p>
        <p v-else class="reorder-hint">拖动整行可在同状态内调整顺序（按钮与状态下拉仍可正常点击）。</p>
        <div class="list">
          <p v-if="sortedFiltered.length === 0" class="empty">暂无条目，先在上方添加一部作品吧。</p>
          <template v-else>
            <div v-if="watchingList.length" class="status-section">
              <h3 class="status-heading">追番中 <span>{{ watchingList.length }}</span></h3>
              <VueDraggable
                class="drag-group"
                :model-value="watchingList"
                :disabled="!canReorder"
                :filter="dragFilter"
                :prevent-on-filter="true"
                animation="200"
                ghost-class="card-ghost"
                chosen-class="card-chosen"
                :class="{ 'is-reorderable': canReorder }"
                @update:model-value="onWatchingReorder"
              >
                <article
                  v-for="e in watchingList"
                  :key="e.id"
                  class="card"
                  :class="{ 'card-draggable': canReorder }"
                >
                  <div class="card-main">
                    <h3
                      class="title-copy no-drag"
                      :title="'点击复制：' + (e.title || '')"
                      role="button"
                      tabindex="0"
                      @click="copyTitle(e.title)"
                      @keydown.enter.prevent="copyTitle(e.title)"
                      @keydown.space.prevent="copyTitle(e.title)"
                    >
                      {{ e.title }}
                    </h3>
                    <div class="meta">
                      <label class="status-wrap no-drag">
                        <span class="sr-only">修改状态</span>
                        <select
                          class="badge-select"
                          :class="statusClass[normalizeStatus(e.status)]"
                          :value="normalizeStatus(e.status)"
                          @change="setEntryStatus(e, $event.target.value)"
                        >
                          <option value="watching">追番中</option>
                          <option value="done">已看完</option>
                        </select>
                      </label>
                    </div>
                    <div class="progress-line">
                      <span class="ep">第 {{ e.currentEp ?? 0 }} 话</span>
                    </div>
                  </div>
                  <div class="card-actions no-drag">
                    <button type="button" @click="epPlus(e)">+1 话</button>
                    <button type="button" @click="startEdit(e)">编辑</button>
                    <button type="button" class="danger" @click="remove(e.id)">删除</button>
                  </div>
                </article>
              </VueDraggable>
            </div>

            <div v-if="doneList.length" class="status-section">
              <h3 class="status-heading">已看完 <span>{{ doneList.length }}</span></h3>
              <VueDraggable
                class="drag-group"
                :model-value="doneList"
                :disabled="!canReorder"
                :filter="dragFilter"
                :prevent-on-filter="true"
                animation="200"
                ghost-class="card-ghost"
                chosen-class="card-chosen"
                :class="{ 'is-reorderable': canReorder }"
                @update:model-value="onDoneReorder"
              >
                <article
                  v-for="e in doneList"
                  :key="e.id"
                  class="card"
                  :class="{ 'card-draggable': canReorder }"
                >
                  <div class="card-main">
                    <h3
                      class="title-copy no-drag"
                      :title="'点击复制：' + (e.title || '')"
                      role="button"
                      tabindex="0"
                      @click="copyTitle(e.title)"
                      @keydown.enter.prevent="copyTitle(e.title)"
                      @keydown.space.prevent="copyTitle(e.title)"
                    >
                      {{ e.title }}
                    </h3>
                    <div class="meta">
                      <label class="status-wrap no-drag">
                        <span class="sr-only">修改状态</span>
                        <select
                          class="badge-select"
                          :class="statusClass[normalizeStatus(e.status)]"
                          :value="normalizeStatus(e.status)"
                          @change="setEntryStatus(e, $event.target.value)"
                        >
                          <option value="watching">追番中</option>
                          <option value="done">已看完</option>
                        </select>
                      </label>
                    </div>
                    <div class="progress-line">
                      <span class="ep">第 {{ e.currentEp ?? 0 }} 话</span>
                    </div>
                  </div>
                  <div class="card-actions no-drag">
                    <button type="button" @click="startEdit(e)">编辑</button>
                    <button type="button" class="danger" @click="remove(e.id)">删除</button>
                  </div>
                </article>
              </VueDraggable>
            </div>
          </template>
        </div>
      </section>
    </main>

    <div class="toast" :class="{ show: toastShow }" role="status">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { VueDraggable } from 'vue-draggable-plus';
import { statusClass, useWatchTracker } from '@/features/watch/composables/useWatchTracker.js';

/** 交互控件不触发整行拖动 */
const dragFilter = '.no-drag, .no-drag *';

const {
  entries,
  editingId,
  filterStatus,
  search,
  importInputRef,
  form,
  toastMsg,
  toastShow,
  canReorder,
  sortedFiltered,
  watchingList,
  doneList,
  filtered,
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
} = useWatchTracker();
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

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

.reorder-hint {
  margin: -4px 0 12px;
  font-size: 12px;
  color: var(--muted);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--grid);
  background: rgba(15, 23, 42, 0.35);
}

.status-heading {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.status-heading span {
  color: var(--text);
  font-weight: 700;
  margin-left: 4px;
}

.drag-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drag-group.is-reorderable .card-draggable {
  cursor: grab;
  touch-action: none;
}

.drag-group.is-reorderable .card-draggable:active {
  cursor: grabbing;
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

.card-ghost {
  opacity: 0.45;
}

.card-chosen {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  border-color: #a855f7;
}

@media (max-width: 560px) {
  .card {
    grid-template-columns: 1fr;
  }

  .card-actions {
    justify-content: flex-start;
  }
}

.title-copy {
  margin: 0 0 6px;
  font-size: 1rem;
  cursor: copy;
  width: fit-content;
  max-width: 100%;
  border-radius: 6px;
  padding: 2px 4px;
  margin-left: -4px;
  transition: background 0.15s;
}

.title-copy:hover {
  background: rgba(168, 85, 247, 0.12);
}

.title-copy:focus-visible {
  outline: 2px solid #a855f7;
  outline-offset: 2px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-wrap {
  margin: 0;
  display: inline-flex;
}

.badge-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 4px 28px 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M3 4.5L6 8l3-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.badge-select.watching {
  background-color: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.35);
}

.badge-select.done {
  background-color: rgba(100, 116, 139, 0.25);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.35);
}

.badge-select:hover {
  filter: brightness(1.08);
}

.progress-line {
  margin-top: 8px;
  font-size: 13px;
}

.ep {
  color: #a855f7;
  font-weight: 600;
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
