// src/api/route.js
import request from '@/utils/request'

/**
 * 发送路线规划信息到后端
 * @param {Object} data - 包含paths数组，每个path包含origin、destination、departTime、vehicleType、waypoints
 */
export const sendRouteData = (data) => {
  return request.post('/plan', data).then(response => {
    // 将返回的数据存储到 localStorage
    if (response.data.success) {
      localStorage.setItem('routeData', JSON.stringify(response.data));
    }
    return response;
  });
}

/**
 * 从 localStorage 获取路线数据
 */
export const getRouteDataFromStorage = () => {
  const data = localStorage.getItem('routeData');
  return data ? JSON.parse(data) : null;
}

/**
 * 清除 localStorage 中的路线数据
 */
export const clearRouteDataFromStorage = () => {
  localStorage.removeItem('routeData');
}
