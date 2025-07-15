const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3002

app.use(cors()) // 允许跨域
app.use(express.json()) // 解析 JSON 请求体

// ✅ 注册 /user 路由模块
const userRouter = require('./routes/user')
app.use('/user', userRouter)


// ✅ 启动服务
app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`)
})