const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const WeatherController = require('./controllers/weatherController');

const app = express();
app.use(cors());
app.use(express.json());

// 配置 MySQL 连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: 'Vvk@2778',
  database: 'traffic_prediction'
});

db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
  } else {
    console.log('成功连接到MySQL数据库');
  }
});

// 数据库连接测试接口
app.get('/test-mysql', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询失败', details: err });
    }
    res.json({ message: '数据库连接成功', result: results[0].solution });
  });
});



/* 天气相关接口*/
const weatherController = new WeatherController();
// 根据城市名称获取天气信息
app.get('/api/weather/city', weatherController.getWeatherByCity.bind(weatherController));

// 获取实时天气信息
app.get('/api/weather/live', weatherController.getLiveWeatherByCity.bind(weatherController));

// 路线规划并获取沿途天气信息
app.get('/api/weather/route', weatherController.getRouteWithWeather.bind(weatherController));

// 处理路线规划请求
app.post('/api/plan', async (req, res) => {
  try {
    const routeData = req.body;
    console.log('收到前端路线规划请求:', routeData);
    const result = await weatherController.handleRoutePlanning(routeData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('路线规划接口错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
});

// 获取路线风险分析数据
app.get('/api/route-risk', weatherController.getRouteRiskAnalysis.bind(weatherController));

// 获取路线规划及风险预测信息
app.get('/api/predict/routes', weatherController.getRoutePrediction.bind(weatherController));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
}); 