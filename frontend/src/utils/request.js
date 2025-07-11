// src/utils/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 可添加 token（如有）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 后端统一格式：{ code: 200, message: '成功', data: {...} }
    const res = response.data
    if (res.code !== 200) {
      ElMessage.error(res.message || '接口请求出错')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res.data // ✅ 直接返回实际数据部分
  },
  error => {
    // 处理网络错误或后端返回非 2xx 错误
    ElMessage.error(error.response?.data?.message || '网络错误')
    return Promise.reject(error)
  }
)

export default service
