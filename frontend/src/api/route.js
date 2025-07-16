// src/api/route.js
import request from '@/utils/request'

/**
 * 发送路线规划信息到后端
 * @param {Object} data - 包含paths数组，每个path包含origin、destination、departTime、vehicleType、waypoints
 */
export const sendRouteData = (data) => {
  return request.post('/plan', data).then(response => {
    // 兼容处理：递归拆分risk对象
    function fixRiskFields(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(fixRiskFields);
      } else if (obj && typeof obj === 'object') {
        // 如果有risk字段且为对象，拆分
        if (obj.risk && typeof obj.risk === 'object' && obj.risk !== null) {
          // risk对象可能为 { risk: 数值, crashType: 类型 }
          obj.crashType = obj.risk.crashType ?? obj.crashType;
          obj.risk = obj.risk.risk ?? obj.risk;
        }
        // 递归处理所有子字段
        Object.values(obj).forEach(fixRiskFields);
      }
    }
    if (response && typeof response === 'object') {
      fixRiskFields(response);
    }
    // 将返回的数据存储到 localStorage
    if (response.success) {
      localStorage.setItem('routeData', JSON.stringify(response));
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
