import { createRouter, createWebHistory } from 'vue-router'

// 懒加载页面组件
const HomeLayout = () => import('@/views/Home.vue') // 作为布局容器
const Dashboard = () => import('@/views/Dashboard.vue') // 首页卡片页面
const DataManagement = () => import('@/views/DataManagement.vue')
const AccidentPrediction = () => import('@/views/AccidentPrediction.vue')
const DataAnalysis = () => import('@/views/DataAnalysis.vue')
const RoutePlanning = () => import('@/views/RoutePlanning.vue')
const LoginRegister = () => import('@/views/LoginRegister.vue')
const UserManagement = () => import('@/views/UserManagement.vue') // ✅ 新增用户管理页面
const AIChat = () => import('@/views/AIChat.vue') // 新增：AI聊天页面

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
        path: '', // 访问 /home 默认展示首页
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'data',
        name: 'DataManagement',
        component: DataManagement
      },
      {
        path: 'prediction',
        name: 'AccidentPrediction',
        component: AccidentPrediction
      },
      {
        path: 'analysis',
        name: 'DataAnalysis',
        component: DataAnalysis
      },
      {
        path: 'route-planning',
        name: 'RoutePlanning',
        component: RoutePlanning
      },
      {
        path: 'user-management',
        name: 'UserManagement',
        component: UserManagement
      },
      {
        path: 'ai-chat', // 新增：AI聊天路由
        name: 'AIChat',
        component: AIChat
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
