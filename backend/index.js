const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const WeatherService = require('./services/weatherService');
const ModelTrainer = require('./model/trainModel');


const app = express();
app.use(cors());
app.use(express.json());

// ✅ 注册 /user 路由模块
const userRouter = require('./routes/user')
app.use('/user', userRouter)


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

// // 测试接口：获取 traffic_accidents 表的第10行数据
// app.get('/test-row10', (req, res) => {
//   db.query('SELECT * FROM traffic_accidents LIMIT 1 OFFSET 9', (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: '数据库查询失败', details: err });
//     }
//     if (results.length === 0) {
//       return res.status(404).json({ message: '未找到第10行数据' });
//     }
//     res.json({ message: '第10行数据', data: results[0] });
//   });
// });

// 交通事故预测相关接口

// 全局变量存储模型训练器和模型加载状态
let modelTrainer = null;
let modelLoaded = false;

// 初始化模型训练器
const initModelTrainer = () => {
  if (!modelTrainer) {
    modelTrainer = new ModelTrainer();
  }
  return modelTrainer;
};

// 加载模型（如果尚未加载）
const loadModelIfNeeded = async () => {
  const trainer = initModelTrainer();

  if (!modelLoaded && trainer.isModelTrained()) {
    try {
      await trainer.loadTrainedModel();
      modelLoaded = true;
      console.log('模型已成功加载到内存');
    } catch (error) {
      console.error('模型加载失败:', error);
      throw error;
    }
  }

  return trainer;
};

// 检查模型状态
app.get('/api/model/status', (req, res) => {
  try {
    const trainer = initModelTrainer();
    const isTrained = trainer.isModelTrained();

    res.json({
      success: true,
      isTrained: isTrained,
      message: isTrained ? '模型已训练' : '模型未训练'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 预测单条数据
app.post('/api/predict', async (req, res) => {
  try {
    // 加载模型（如果尚未加载）
    const trainer = await loadModelIfNeeded();

    // 检查模型是否已训练
    if (!trainer.isModelTrained()) {
      return res.status(400).json({
        success: false,
        error: '模型尚未训练，请先使用命令行训练模型'
      });
    }

    const data = req.body;
    console.log('接收到预测数据:', data);

    // 验证必要字段
    const requiredFields = [
      'crash_date', 'traffic_control_device', 'weather_condition',
      'lighting_condition', 'trafficway_type',
      'alignment', 'roadway_surface_cond', 'road_defect',
      'intersection_related_i', 'crash_hour', 'crash_day_of_week', 'crash_month'
    ];

    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `缺少必要字段: ${missingFields.join(', ')}`
      });
    }

    // 进行预测
    const probability = trainer.predictor.predictSingle(data);

    res.json({
      success: true,
      probability: probability,  // 事故发生的概率 (0-1)
      risk_level: probability < 0.3 ? '低风险' : probability < 0.7 ? '中风险' : '高风险',
      message: '预测完成'
    });

  } catch (error) {
    console.error('预测时出错:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取特征重要性（如果模型已训练）
app.get('/api/model/importance', async (req, res) => {
  try {
    // 加载模型（如果尚未加载）
    const trainer = await loadModelIfNeeded();

    if (!trainer.isModelTrained()) {
      return res.status(400).json({
        success: false,
        error: '模型尚未训练，请先使用命令行训练模型'
      });
    }

    res.json({
      success: true,
      featureImportance: trainer.predictor.featureImportance
    });

  } catch (error) {
    console.error('获取特征重要性时出错:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 天气相关接口
const weatherService = new WeatherService();

// 处理路线规划请求
app.post('/api/plan', async (req, res) => {
  try {
    const routeData = req.body;
    console.log('收到前端路线规划请求:');
    console.dir(routeData, { depth: null });
    const result = await weatherService.handleRoutePlanning(routeData);

    if (result.success) {
      res.json({
        code: 200,
        message: '成功',
        data: result
      });
    } else {
      res.status(400).json({
        code: 400,
        message: result.error || '失败',
        data: null
      });
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
}); 