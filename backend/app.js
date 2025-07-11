// backend/app.js
const express = require('express')
const cors = require('cors')
const WeatherController = require('./controllers/weatherController')

const app = express()
const PORT = 3000

app.use(cors()) // 允许跨域
app.use(express.json()) // 解析 JSON 请求体

// 创建控制器实例
const weatherController = new WeatherController()

// 路由：接收前端的路线数据
app.post('/plan', async (req, res) => {
  const routeData = req.body

  // 打印接收到的数据
  console.log('接收:', JSON.stringify(routeData, null, 2))

  try {
    // 调用控制器处理路线规划
    const result = await weatherController.handleRoutePlanning(routeData)
    
    // 打印发送的数据
    console.log('发送:', JSON.stringify(result, null, 2))
    
    res.json(result)
  } catch (error) {
    console.error('路线规划处理失败:', error)
    const errorResponse = {
      success: false,
      error: '路线规划处理失败',
      timestamp: new Date().toISOString()
    }
    
    // 打印错误响应
    console.log('发送:', JSON.stringify(errorResponse, null, 2))
    
    res.status(500).json(errorResponse)
  }
})

// 启动服务
app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`)
})
