/** 路由表：按功能模块划分，与后端包名对应（work / watch / system） */

const HomeView = () => import('@/features/system/views/HomeView.vue');
const AnimeView = () => import('@/features/watch/views/AnimeView.vue');
const StatsView = () => import('@/features/work/views/StatsView.vue');

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/anime', name: 'anime', component: AnimeView },
  { path: '/stats', name: 'stats', component: StatsView },
];
