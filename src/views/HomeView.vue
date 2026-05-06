<template>
  <div class="home">
    <h1>ForMe</h1>
    <p class="sub">选择一个入口</p>
    <nav class="cards" aria-label="主导航">
      <RouterLink class="tile watch" to="/anime">
        <span class="tile-title">追番记录</span>
        <span class="tile-desc">番剧进度与清单</span>
      </RouterLink>
      <RouterLink class="tile stats" to="/stats">
        <span class="tile-title">工时统计</span>
        <span class="tile-desc">每日工时与 Excel 导入导出</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(ellipse 120% 80% at 50% -20%, rgba(168, 85, 247, 0.08), transparent), var(--bg);
}

h1 {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.sub {
  margin: 0 0 28px;
  font-size: 14px;
  color: var(--muted);
}

.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  width: 100%;
  max-width: 360px;
}

@media (min-width: 520px) {
  .cards {
    grid-template-columns: 1fr 1fr;
    max-width: 520px;
  }
}

a.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 20px 18px;
  border-radius: 12px;
  border: 1px solid var(--grid);
  background: var(--card);
  color: var(--text);
  text-decoration: none;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}

a.tile:hover {
  transform: translateY(-2px);
  border-color: #374151;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

a.tile:focus-visible {
  outline: 2px solid var(--accent-watch);
  outline-offset: 2px;
}

a.tile.stats:focus-visible {
  outline-color: var(--accent-stats);
}

.tile-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.tile-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
}

a.tile.watch .tile-title {
  color: var(--accent-watch);
}

a.tile.stats .tile-title {
  color: var(--accent-stats);
}
</style>
