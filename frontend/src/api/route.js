// src/api/route.js
import request from '@/utils/request'

/**
 * 发送路线规划信息到后端
 * @param {Object} data - 包含paths数组，每个path包含origin、destination、departTime、vehicleType、waypoints
 */
export const sendRouteData = (data) => {
  return request.post('/plan', data)
}

/**
 * 获取路线风险分析数据
 * @returns {Promise} 路线风险分析结果
 * 接口/route-risk负责DataAnalysis的展示
 */
export const getRouteRiskAnalysis = () => {
  return request.get('/route-risk').then(response => {
    console.log('路线风险分析数据:', response.data)
    return response
  }).catch(error => {
    console.error('获取路线风险分析数据失败:', error)
    throw error
  })
}

/**
 * 获取路线规划及风险预测信息
 * @param {string} start - 起点城市
 * @param {string} end - 终点城市
 * @returns {Promise} 路线预测结果
 * 接口/predict/routes负责AccidentPrediction的展示
 */
export const getRoutePrediction = (start, end) => {
  return request.get('/predict/routes', {
    params: { start, end }
  }).then(response => {
    console.log('路线规划及风险预测数据:', response.data)
    return response
  }).catch(error => {
    console.error('获取路线规划及风险预测数据失败:', error)
    throw error
  })
}
