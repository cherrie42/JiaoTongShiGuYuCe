const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const roadinfoRouter = require('./routes/roadinfo') // 这里改成你文件真实路径

const app = express()
const PORT = 5000

app.use(cors()) // 跨域允许前端调用
app.use(bodyParser.json()) // 解析 JSON 请求体

// 注册路由，所有 /api/plan 的请求都由 roadinfo 处理
app.use('/api/plan', roadinfoRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
