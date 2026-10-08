<template>
  <div class="home">
    <header class="top">
      <div class="brand">
        <h1>ForMe</h1>
        <p class="tag">桌面工具台</p>
      </div>
    </header>

    <div class="rule" aria-hidden="true" />

    <nav class="entries" aria-label="主导航">
      <RouterLink class="row" to="/anime">
        <span class="row-title">追番记录</span>
        <span class="row-desc">番剧进度与清单，按周整理</span>
      </RouterLink>
      <RouterLink class="row" to="/stats">
        <span class="row-title">工时统计</span>
        <span class="row-desc">每日工时与 Excel 导入导出</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home {
  min-height: 100vh;
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.top {
  display: flex;
  align-items: flex-end;
}

.brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.tag {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--muted);
}

.rule {
  height: 1px;
  background: var(--grid);
}

.entries {
  display: flex;
  flex-direction: column;
}

a.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 8px;
  border-bottom: 1px solid var(--grid);
  text-decoration: none;
  color: var(--text);
  transition: color 0.15s, background 0.15s;
}

a.row:first-child {
  border-top: 1px solid var(--grid);
}

a.row:hover,
a.row:hover .row-desc {
  color: var(--accent);
}

a.row:hover {
  background: rgba(15, 118, 110, 0.04);
}

a.row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.row-title {
  font-size: 1.125rem;
  font-weight: 600;
  transition: color 0.15s;
}

.row-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
  transition: color 0.15s;
}

@media (max-width: 480px) {
  .home {
    padding: 40px 20px 32px;
    gap: 28px;
  }
}
</style>
