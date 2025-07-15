// frontend/api/data.js
import request from '@/utils/request'

// 获取事故分页列表
export function getAccidents(params) {
  return request.get('/accidents', { params })
}

// 新增事故记录
export function createAccident(data) {
  return request.post('/accidents', data)
}

// 更新事故记录
export function updateAccident(id, data) {
  return request.put(`/accidents/${id}`, data)
}

// 删除事故记录
export function deleteAccident(id) {
  return request.delete(`/accidents/${id}`)
}
