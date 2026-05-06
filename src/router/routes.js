/** 路由表：新增页面在此注册，保持 router/index 只做 createRouter */

const HomeView = () => import('@/views/HomeView.vue');
const AnimeView = () => import('@/views/AnimeView.vue');
const StatsView = () => import('@/views/StatsView.vue');

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/anime', name: 'anime', component: AnimeView },
  { path: '/stats', name: 'stats', component: StatsView },
];
