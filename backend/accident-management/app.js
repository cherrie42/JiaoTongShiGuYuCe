// app.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sequelize = require('./config/database');
const accidentRoutes = require('./routes/accidentRoutes');

const app = express();
const port = 4000; // 修改端口防止冲突

app.use(cors());
app.use(bodyParser.json());

// 根路径路由
app.get('/', (req, res) => {
  res.send('Welcome to the Traffic Accident Management API! Access /api/accidents for data.');
});

// 数据库连接测试
sequelize.authenticate()
  .then(() => console.log('✅ 数据库连接成功'))
  .catch(err => console.error('❌ 数据库连接失败:', err));

// 路由
app.use('/api/accidents', accidentRoutes);

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 服务运行在 http://localhost:${port}`);
});
