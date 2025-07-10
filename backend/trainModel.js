const tf = require('@tensorflow/tfjs');
const TrafficAccidentPredictor = require('./aiModel');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const dbConfig = require('./dbConfig');

class ModelTrainer {
  constructor() {
    this.predictor = new TrafficAccidentPredictor();
    this.modelPath = path.join(__dirname, 'trained_model');
    
    // 数据库配置
    this.dbConfig = {
      host: 'localhost',
      user: 'root', 
      password: 'Vvk@2778',
      database: 'traffic_prediction'
    };
  }

  // 从数据库获取训练数据
  async getDataFromDatabase(limit = 5000) {
    try {
      console.log('从数据库获取训练数据...');
      
      const connection = await mysql.createConnection(this.dbConfig);
      
      // 查询traffic_accidents表的数据
      const [rows] = await connection.execute(
        `SELECT 
          accident_points,
          crash_date,
          traffic_control_device,
          weather_condition,
          lighting_condition,
          first_crash_type,
          trafficway_type,
          alignment,
          roadway_surface_cond,
          road_defect,
          intersection_related_i,
          crash_hour,
          crash_day_of_week,
          crash_month
        FROM traffic_accidents 
        LIMIT ${parseInt(limit)}`
      );
      
      await connection.end();
      
      console.log(`成功从数据库获取 ${rows.length} 条记录`);
      return rows;
      
    } catch (error) {
      console.error('从数据库获取数据失败:', error);
      throw error;
    }
  }

  // 训练模型并保存（从数据库）
  async trainAndSaveModelFromDatabase(limit = 5000) {
    try {
      console.log('开始从数据库训练模型...');
      
      // 从数据库获取数据
      const data = await this.getDataFromDatabase(limit);
      
      if (data.length === 0) {
        throw new Error('数据库中没有找到训练数据');
      }
      
      // 训练模型
      const result = await this.predictor.trainWithData(data);
      
      if (result.success) {
        // 保存模型和预处理参数
        await this.saveModel();
        console.log('模型训练完成并已保存');
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('模型训练失败:', error);
      throw error;
    }
  }

  // 训练模型并保存（从文件）
  async trainAndSaveModel(dataPath) {
    try {
      console.log('开始训练模型...');
      
      // 训练模型
      const result = await this.predictor.loadAndTrain(dataPath);
      
      if (result.success) {
        // 保存模型和预处理参数
        await this.saveModel();
        console.log('模型训练完成并已保存');
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('模型训练失败:', error);
      throw error;
    }
  }

  // 保存模型和预处理参数
  async saveModel() {
    try {
      // 创建模型保存目录
      if (!fs.existsSync(this.modelPath)) {
        fs.mkdirSync(this.modelPath);
      }

      // 保存模型
      await this.predictor.model.save(`file://${this.modelPath}/model`);

      // 保存预处理参数
      const preprocessingParams = {
        labelEncoder: this.predictor.labelEncoder,
        scaler: {
          mean: await this.predictor.scaler.mean.array(),
          std: await this.predictor.scaler.std.array()
        },
        featureNames: this.predictor.featureNames,
        featureImportance: this.predictor.featureImportance
      };

      fs.writeFileSync(
        path.join(this.modelPath, 'preprocessing.json'),
        JSON.stringify(preprocessingParams, null, 2)
      );

      console.log('模型和预处理参数已保存');
    } catch (error) {
      console.error('保存模型失败:', error);
      throw error;
    }
  }

  // 加载已训练的模型
  async loadTrainedModel() {
    try {
      const modelPath = path.join(this.modelPath, 'model');
      const preprocessingPath = path.join(this.modelPath, 'preprocessing.json');

      if (!fs.existsSync(modelPath) || !fs.existsSync(preprocessingPath)) {
        throw new Error('模型文件不存在，请先训练模型');
      }

      // 加载模型
      this.predictor.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);

      // 加载预处理参数
      const preprocessingParams = JSON.parse(
        fs.readFileSync(preprocessingPath, 'utf8')
      );

      this.predictor.labelEncoder = preprocessingParams.labelEncoder;
      this.predictor.scaler = {
        mean: tf.tensor(preprocessingParams.scaler.mean),
        std: tf.tensor(preprocessingParams.scaler.std)
      };
      this.predictor.featureNames = preprocessingParams.featureNames;
      this.predictor.featureImportance = preprocessingParams.featureImportance || {};

      console.log('模型加载成功');
      return true;
    } catch (error) {
      console.error('加载模型失败:', error);
      throw error;
    }
  }

  // 检查模型是否存在
  isModelTrained() {
    const modelPath = path.join(this.modelPath, 'model');
    const preprocessingPath = path.join(this.modelPath, 'preprocessing.json');
    return fs.existsSync(modelPath) && fs.existsSync(preprocessingPath);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const trainer = new ModelTrainer();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  从文件训练: node trainModel.js <数据文件路径>');
    console.log('  从数据库训练: node trainModel.js --db [数据条数]');
    console.log('');
    console.log('示例:');
    console.log('  node trainModel.js ./data/traffic_accidents.xlsx');
    console.log('  node trainModel.js --db 5000');
    process.exit(1);
  }

  // 检查是否从数据库训练
  if (args[0] === '--db') {
    const limit = args[1] ? parseInt(args[1]) : 5000;
    console.log(`从数据库训练模型，使用前 ${limit} 条数据`);
    
    // 从数据库训练
    trainer.trainAndSaveModelFromDatabase(limit)
      .then(() => {
        console.log('模型训练完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('训练失败:', error.message);
        process.exit(1);
      });
  } else {
    // 从文件训练
    const dataPath = args[0];
    
    if (!fs.existsSync(dataPath)) {
      console.error('数据文件不存在:', dataPath);
      process.exit(1);
    }

    // 开始训练
    trainer.trainAndSaveModel(dataPath)
      .then(() => {
        console.log('模型训练完成！');
        process.exit(0);
      })
      .catch((error) => {
        console.error('训练失败:', error.message);
        process.exit(1);
      });
  }
}

module.exports = ModelTrainer; 