import { createRouter, createWebHistory } from 'vue-router'

// 懒加载页面组件
const HomeLayout = () => import('@/views/Home.vue') // 作为布局容器
const Dashboard = () => import('@/views/Dashboard.vue') // 首页卡片页面
const DataManagement = () => import('@/views/DataManagement.vue')
const AccidentPrediction = () => import('@/views/AccidentPrediction.vue')
const DataAnalysis = () => import('@/views/DataAnalysis.vue')
const RoutePlanning = () => import('@/views/RoutePlanning.vue')
const LoginRegister = () => import('@/views/LoginRegister.vue')

const routes = [
  {
    path: '/',
    redirect: '/login' // 默认跳转到登录页
  },
  {
    path: '/login',
    name: 'LoginRegister',
    component: LoginRegister
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeLayout,
    children: [
      {
        path: '', // 默认子路由，访问 /home 时展示 Dashboard
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'data', // 访问 /home/data
        name: 'DataManagement',
        component: DataManagement
      },
      {
        path: 'prediction', // 访问 /home/prediction
        name: 'AccidentPrediction',
        component: AccidentPrediction
      },
      {
        path: 'analysis', // 访问 /home/analysis
        name: 'DataAnalysis',
        component: DataAnalysis
      },
      {
        path: 'route-planning', // 访问 /home/route-planning
        name: 'RoutePlanning',
        component: RoutePlanning,
        meta: { title: '路线规划' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
