const express = require('express')
const cors = require('cors')
const WeatherController = require('./controllers/weatherController')

const app = express()
const PORT = 3000

app.use(cors()) // 允许跨域
app.use(express.json()) // 解析 JSON 请求体

// ✅ 注册 /user 路由模块
const userRouter = require('./routes/user')
app.use('/user', userRouter)

// ✅ 创建控制器实例
const weatherController = new WeatherController()

// ✅ 路线规划接口：处理路线数据
app.post('/plan', async (req, res) => {
  const routeData = req.body

  console.log('接收到路线规划请求：')
  console.log(JSON.stringify(routeData, null, 2))

  try {
    // 控制器处理
    const result = await weatherController.handleRoutePlanning(routeData)

    console.log('发送：')
    console.log(JSON.stringify(result, null, 2))

    res.json(result)
  } catch (error) {
    console.error('路线规划处理失败:', error)

    const errorResponse = {
      success: false,
      error: '路线规划处理失败',
      timestamp: new Date().toISOString()
    }

    console.log('发送：')
    console.log(JSON.stringify(errorResponse, null, 2))

    res.status(500).json(errorResponse)
  }
})

// ✅ 启动服务
app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`)
})
