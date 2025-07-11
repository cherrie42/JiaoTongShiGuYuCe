// 使用 tfjs-node 来支持文件系统操作
const tf = require('@tensorflow/tfjs');
const TrafficAccidentPredictor = require('./aiModel');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const dbConfig = require('../dbConfig');

class ModelTrainer {
  constructor() {
    this.predictor = new TrafficAccidentPredictor();
    this.modelPath = path.join(__dirname, '..', 'trained_model');
    
    // 数据库配置
    this.dbConfig = {
      host: 'localhost',
      user: 'root', 
      password: 'lmc0315lmc',
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
          trafficway_type,
          alignment,
          roadway_surface_cond,
          road_defect,
          intersection_related_i,
          crash_hour,
          crash_day_of_week,
          crash_month
        FROM traffic_accidents 
        ORDER BY RAND()
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
      if (!fs.existsSync(this.modelPath)) {
        fs.mkdirSync(this.modelPath);
      }

      // 保存结构
      const modelTopology = this.predictor.model.toJSON();
      // toJSON() 返回的是字符串，需要先解析成对象
      const modelTopologyObj = JSON.parse(modelTopology);
      fs.writeFileSync(
        path.join(this.modelPath, 'model.json'),
        JSON.stringify(modelTopologyObj, null, 2)
      );

      // 保存权重
      const weights = await this.predictor.model.getWeights();
      const weightsData = [];
      for (let w of weights) {
        weightsData.push({
          data: Array.from(await w.data()),
          shape: w.shape,
          dtype: w.dtype
        });
      }
      fs.writeFileSync(
        path.join(this.modelPath, 'weights.json'),
        JSON.stringify(weightsData, null, 2)
      );

      // 保存预处理参数
      const preprocessingParams = {
        labelEncoder: this.predictor.labelEncoder,
        scaler: {
          mean: await this.predictor.scaler.mean.array(),
          std: await this.predictor.scaler.std.array()
        },
        featureNames: this.predictor.featureNames
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
      const modelJsonPath = path.join(this.modelPath, 'model.json');
      const weightsPath = path.join(this.modelPath, 'weights.json');
      const preprocessingPath = path.join(this.modelPath, 'preprocessing.json');

      if (!fs.existsSync(modelJsonPath) || !fs.existsSync(weightsPath) || !fs.existsSync(preprocessingPath)) {
        throw new Error('模型文件不存在，请先训练模型');
      }

      // 读取结构
      const modelTopology = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
      if (modelTopology.class_name !== 'Sequential') {
        throw new Error('只支持Sequential模型结构');
      }
      // 重建模型结构
      const model = tf.sequential();
      modelTopology.config.layers.forEach((layer, idx) => {
        if (layer.class_name === 'Dense') {
          const config = layer.config;
          const layerConfig = {
            units: config.units,
            activation: config.activation,
          };
          if (idx === 0) {
            layerConfig.inputShape = [config.batch_input_shape[1]];
          }
          model.add(tf.layers.dense(layerConfig));
        } else if (layer.class_name === 'Dropout') {
          const config = layer.config;
          model.add(tf.layers.dropout({
            rate: config.rate || 0.2
          }));
        } else {
          throw new Error(`暂不支持的层类型: ${layer.class_name}`);
        }
      });
      // 读取权重
      const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
      const weights = weightsData.map(w =>
        tf.tensor(w.data, w.shape, w.dtype)
      );
      model.setWeights(weights);
      this.predictor.model = model;

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

      console.log('模型加载成功');
      return true;
    } catch (error) {
      console.error('加载模型失败:', error);
      throw error;
    }
  }

  // 检查模型是否存在
  isModelTrained() {
    const modelJsonPath = path.join(this.modelPath, 'model.json');
    const weightsPath = path.join(this.modelPath, 'weights.json');
    const preprocessingPath = path.join(this.modelPath, 'preprocessing.json');
    return fs.existsSync(modelJsonPath) && fs.existsSync(weightsPath) && fs.existsSync(preprocessingPath);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const trainer = new ModelTrainer();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 交通事故预测模型训练工具');
    console.log('');
    console.log('使用方法:');
    console.log('  从数据库训练: node trainModel.js --db [训练数据量]');
    console.log('  从文件训练: node trainModel.js <数据文件路径>');
    console.log('');
    console.log('示例:');
    console.log('  node trainModel.js --db 5000     # 使用5000条数据训练');
    console.log('  node trainModel.js --db 10000    # 使用10000条数据训练');
    console.log('  node trainModel.js --db 209306   # 使用全部数据训练');
    console.log('  node trainModel.js ./data/traffic_accidents.xlsx');
    console.log('');
    console.log('注意: 训练数据量越大，模型性能越好，但训练时间也越长');
    process.exit(1);
  }

  // 检查是否从数据库训练
  if (args[0] === '--db') {
    let limit = 5000; // 默认值
    
    if (args[1]) {
      const inputLimit = parseInt(args[1]);
      if (isNaN(inputLimit) || inputLimit <= 0) {
        console.error('❌ 错误: 训练数据量必须是正整数');
        console.log('示例: node trainModel.js --db 5000');
        process.exit(1);
      }
      limit = inputLimit;
    } else {
      console.log('⚠️  警告: 未指定训练数据量，使用默认值5000条');
    }
    
    console.log(`🎯 从数据库训练模型，使用前 ${limit.toLocaleString()} 条数据`);
    console.log(`⏱️  预计训练时间: ${limit > 50000 ? '10-20分钟' : limit > 10000 ? '5-10分钟' : '2-5分钟'}`);
    console.log('');
    
    // 从数据库训练
    trainer.trainAndSaveModelFromDatabase(limit)
      .then(() => {
        console.log('');
        console.log('✅ 模型训练完成！');
        console.log('📁 模型文件已保存到: ./trained_model/');
        process.exit(0);
      })
      .catch((error) => {
        console.error('');
        console.error('❌ 训练失败:', error.message);
        process.exit(1);
      });
  } else {
    // 从文件训练
    const dataPath = args[0];
    
    if (!fs.existsSync(dataPath)) {
      console.error('❌ 错误: 数据文件不存在:', dataPath);
      process.exit(1);
    }

    console.log(`📁 从文件训练模型: ${dataPath}`);
    
    // 开始训练
    trainer.trainAndSaveModel(dataPath)
      .then(() => {
        console.log('');
        console.log('✅ 模型训练完成！');
        console.log('📁 模型文件已保存到: ./trained_model/');
        process.exit(0);
      })
      .catch((error) => {
        console.error('');
        console.error('❌ 训练失败:', error.message);
        process.exit(1);
      });
  }
}

module.exports = ModelTrainer; 