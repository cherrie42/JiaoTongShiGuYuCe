const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// ✅ 添加这两行，注册 /user 路由模块
const userRouter = require('./routes/user')
app.use('/user', userRouter)

// 路线规划（原有逻辑保留）
app.post('/plan', (req, res) => {
  const { origin, destination, departTime, vehicleType } = req.body

  console.log('接收到路线规划请求：')
  console.log({ origin, destination, departTime, vehicleType })

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
