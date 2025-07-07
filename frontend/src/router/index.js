import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      name: 'prediction',
      component: () => import('@/views/AccidentPrediction.vue')
    },
    {
      path: '/analysis',
      name: 'analysis',
      component: () => import('@/views/DataAnalysis.vue')
    }
  ]
})

export default router