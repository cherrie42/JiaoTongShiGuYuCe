// backend/app.js
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors()) // 允许跨域
app.use(express.json()) // 解析 JSON 请求体

// 路由：接收前端的路线数据
app.post('/plan', (req, res) => {
  const { origin, destination, departTime, vehicleType } = req.body

  console.log('接收到路线规划请求：')
  console.log({ origin, destination, departTime, vehicleType })

  // 这里可以后续处理路线计算、存数据库、调用预测模型等
  // 现在先返回成功结果
  res.json({
    code: 200,
    success: true,
    message: '已接收路线信息',
    data: { routeId: Date.now() }
  })
})

// 启动服务
app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`)
})
