const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// 配置 MySQL 连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: 'lmc0315lmc',
  database: 'traffic_prediction'
});

db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('成功连接到MySQL数据库');
  }
});

// 测试接口
app.get('/test-mysql', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询失败', details: err });
    }
    res.json({ message: '数据库连接成功', result: results[0].solution });
  });
});

// 测试接口：获取 traffic_accidents 表的第10行数据
app.get('/test-row10', (req, res) => {
  db.query('SELECT * FROM traffic_accidents LIMIT 1 OFFSET 9', (err, results) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询失败', details: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: '未找到第10行数据' });
    }
    res.json({ message: '第10行数据', data: results[0] });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
}); 