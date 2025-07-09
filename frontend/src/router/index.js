import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/data',
    name: 'data',
    component: () => import('@/views/DataManagement.vue')
  },
  {
    path: '/prediction',
    name: 'AccidentPrediction',
    component: () => import('@/views/AccidentPrediction.vue')
  },
  {
    path: '/analysis',
    name: 'analysis',
    component: () => import('@/views/DataAnalysis.vue')
  },
  {
    path: '/route-planning',
    name: 'routePlanning',
    component: () => import('@/views/RoutePlanning.vue'),
    meta: { title: '路线规划' }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
