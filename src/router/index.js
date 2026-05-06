import { createRouter, createWebHistory } from 'vue-router';

const HomeView = () => import('../views/HomeView.vue');
const AnimeView = () => import('../views/AnimeView.vue');
const StatsView = () => import('../views/StatsView.vue');

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/anime', name: 'anime', component: AnimeView },
    { path: '/stats', name: 'stats', component: StatsView },
  ],
});
