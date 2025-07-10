// src/api/route.js
import request from '@/utils/request'

/**
 * 发送路线规划信息到后端
 * @param {Object} data - 包含起点、终点、出发时间、车辆类型
 */
export const sendRouteData = (data) => {
  return request.post('/plan', data)
}
