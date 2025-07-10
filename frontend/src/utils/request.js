// src/utils/request.js
import axios from 'axios'

const service = axios.create({
  baseURL: '/api', // 所有请求自动加上 /api 前缀
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 可在此添加 token 等 headers
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  response => response,
  error => {
    console.error('请求错误:', error.response || error.message)
    return Promise.reject(error)
  }
)

export default service
