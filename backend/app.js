// app.js

const express = require('express')
const cors = require('cors')
const app = express()
const predictRouter = require('./routes/predict')

// 中间件
app.use(cors())                  // 允许跨域
app.use(express.json())         // 解析 JSON 请求体
app.use('/api', predictRouter)  // 注册路由：/api/predict

// 启动服务
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
