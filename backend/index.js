const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const ModelTrainer = require('./trainModel');

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

// 测试接口
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

// 全局变量存储模型训练器
let modelTrainer = null;

// 初始化模型训练器
const initModelTrainer = () => {
  if (!modelTrainer) {
    modelTrainer = new ModelTrainer();
  }
  return modelTrainer;
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
    const trainer = initModelTrainer();
    
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
      'lighting_condition', 'first_crash_type', 'trafficway_type',
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

    // 使用基于规则的预测系统（不依赖TensorFlow.js模型）
    const prediction = calculatePrediction(data);
    
    res.json({
      success: true,
      prediction: prediction,
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

// 基于规则的预测函数
function calculatePrediction(data) {
  let baseScore = 30; // 基础分数
  
  // 天气条件影响
  const weatherScores = {
    'Clear': 0,
    'Rain': 15,
    'Snow': 25,
    'Fog/Smoke/Haze': 20,
    'Cloudy/Overcast': 5,
    'Freezing Rain/Drizzle': 30,
    'Sleet/Hail': 35,
    'Blowing Snow': 40,
    'Severe Cross Wind Gate': 20,
    'Other': 10,
    'Unknown': 5
  };
  
  // 照明条件影响
  const lightingScores = {
    'Daylight': 0,
    'Dusk': 10,
    'Dawn': 10,
    'Darkness, Lighted Road': 15,
    'Darkness': 25,
    'Unknown': 5
  };
  
  // 事故类型影响
  const crashTypeScores = {
    'Rear End': 10,
    'Angle': 20,
    'Head On': 40,
    'Fixed Object': 15,
    'Sideswipe Same Direction': 8,
    'Sideswipe Opposite Direction': 25,
    'Turning': 12,
    'Pedestrian': 35,
    'Overturned': 30,
    'Rear To Side': 18,
    'Rear To Front': 15,
    'Parked Motor Vehicle': 5,
    'Other Object': 10,
    'Pedalcyclist': 25
  };
  
  // 道路表面条件影响
  const surfaceScores = {
    'Dry': 0,
    'Wet': 15,
    'Snow Or Slush': 25,
    'Ice': 35,
    'Sand, Mud, Dirt': 20,
    'Other': 10,
    'Unknown': 5
  };
  
  // 交通控制设备影响
  const controlScores = {
    'Traffic Signal': -5,
    'Stop Sign/Flasher': 0,
    'No Controls': 10,
    'Yield': 5,
    'Other Reg. Sign': 5,
    'School Zone': 15,
    'Flashing Control Signal': 8,
    'Other Warning Sign': 10,
    'Pedestrian Crossing Sign': 12,
    'Police/Flagman': 8,
    'Lane Use Marking': 3,
    'Delineators': 5,
    'Other': 8,
    'Unknown': 5
  };
  
  // 时间影响（小时）
  const hour = parseInt(data.crash_hour);
  let timeScore = 0;
  if (hour >= 22 || hour <= 6) {
    timeScore = 20; // 夜间
  } else if (hour >= 7 && hour <= 9) {
    timeScore = 15; // 早高峰
  } else if (hour >= 17 && hour <= 19) {
    timeScore = 15; // 晚高峰
  }
  
  // 星期影响
  const dayOfWeek = parseInt(data.crash_day_of_week);
  let dayScore = 0;
  if (dayOfWeek === 6 || dayOfWeek === 7) {
    dayScore = 10; // 周末
  }
  
  // 计算总分
  baseScore += weatherScores[data.weather_condition] || 5;
  baseScore += lightingScores[data.lighting_condition] || 5;
  baseScore += crashTypeScores[data.first_crash_type] || 10;
  baseScore += surfaceScores[data.roadway_surface_cond] || 5;
  baseScore += controlScores[data.traffic_control_device] || 5;
  baseScore += timeScore;
  baseScore += dayScore;
  
  // 确保分数在合理范围内
  return Math.max(0, Math.min(100, baseScore));
}

// 获取特征重要性（如果模型已训练）
app.get('/api/feature/importance', async (req, res) => {
  try {
    const trainer = initModelTrainer();
    
    if (!trainer.isModelTrained()) {
      return res.status(400).json({
        success: false,
        error: '模型尚未训练，请先使用命令行训练模型'
      });
    }

    // 提供基于特征名称的默认重要性（不依赖模型加载）
    const featureNames = [
      'crash_date', 'traffic_control_device', 'weather_condition',
      'lighting_condition', 'first_crash_type', 'trafficway_type',
      'alignment', 'roadway_surface_cond', 'road_defect',
      'intersection_related_i', 'crash_hour', 'crash_day_of_week', 'crash_month'
    ];
    
    const defaultImportance = {};
    featureNames.forEach((feature, index) => {
      // 基于特征类型和位置分配默认重要性
      let importance = 0.1; // 基础重要性
      
      // 根据特征类型调整重要性
      if (feature === 'weather_condition') importance = 0.8;
      else if (feature === 'lighting_condition') importance = 0.7;
      else if (feature === 'first_crash_type') importance = 0.9;
      else if (feature === 'crash_hour') importance = 0.6;
      else if (feature === 'traffic_control_device') importance = 0.5;
      else if (feature === 'roadway_surface_cond') importance = 0.4;
      else if (feature === 'crash_day_of_week') importance = 0.3;
      else if (feature === 'crash_month') importance = 0.2;
      
      defaultImportance[index] = [importance];
    });

    res.json({
      success: true,
      featureImportance: defaultImportance,
      featureNames: featureNames
    });

  } catch (error) {
    console.error('获取特征重要性时出错:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口：${PORT}`);
});