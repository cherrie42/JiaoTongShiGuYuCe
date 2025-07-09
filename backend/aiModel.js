const tf = require('@tensorflow/tfjs');
const xlsx = require('xlsx');
const path = require('path');

class TrafficAccidentPredictor {
  constructor() {
    this.model = null;
    this.featureNames = [
      'crash_date', 'traffic_control_device', 'weather_condition', 
      'lighting_condition', 'first_crash_type', 'trafficway_type', 
      'alignment', 'roadway_surface_cond', 'road_defect', 
      'intersection_related_i', 'crash_hour', 'crash_day_of_week', 'crash_month'
    ];
    this.labelEncoder = {};
    this.scaler = null;
    this.featureImportance = {};
  }

  // 数据预处理
  preprocessData(data) {
    console.log('开始数据预处理...');
    
    // 只取前5000条记录
    const limitedData = data.slice(0, 5000);
    console.log(`使用前 ${limitedData.length} 条记录进行训练`);

    // 分离特征和目标变量
    const features = [];
    const targets = [];

    limitedData.forEach(row => {
      const featureRow = [];
      
      this.featureNames.forEach(feature => {
        let value = row[feature];
        
        // 处理日期特征
        if (feature === 'crash_date') {
          const date = new Date(value);
          featureRow.push(date.getFullYear());
          featureRow.push(date.getMonth() + 1);
          featureRow.push(date.getDate());
        }
        // 处理分类特征
        else if (typeof value === 'string') {
          if (!this.labelEncoder[feature]) {
            this.labelEncoder[feature] = {};
          }
          if (!(value in this.labelEncoder[feature])) {
            this.labelEncoder[feature][value] = Object.keys(this.labelEncoder[feature]).length;
          }
          featureRow.push(this.labelEncoder[feature][value]);
        }
        // 处理数值特征
        else {
          featureRow.push(Number(value) || 0);
        }
      });
      
      features.push(featureRow);
      targets.push(Number(row.accident_points) || 0);
    });

    // 数据标准化
    const featureTensor = tf.tensor2d(features);
    const mean = featureTensor.mean(0);
    const std = featureTensor.sub(mean).square().mean(0).sqrt();
    this.scaler = { mean, std };
    
    const normalizedFeatures = featureTensor.sub(mean).div(std);
    
    return {
      features: normalizedFeatures,
      targets: tf.tensor2d(targets, [targets.length, 1])
    };
  }

  // 创建模型
  createModel(inputShape) {
    console.log('创建神经网络模型...');
    
    this.model = tf.sequential();

    // 输入层
    this.model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [inputShape]
    }));
    
    // 隐藏层
    this.model.add(tf.layers.dropout(0.3));
    this.model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    this.model.add(tf.layers.dropout(0.2));
    this.model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));
    
    // 输出层
    this.model.add(tf.layers.dense({
      units: 1,
      activation: 'linear'
    }));

    // 编译模型
    this.model.compile({
      optimizer: tf.train.adam(0.001),
  loss: 'meanSquaredError',
      metrics: ['mae']
});

    console.log('模型创建完成');
  }

// 训练模型
  async trainModel(features, targets) {
  console.log('开始训练模型...');
    
    const inputShape = features.shape[1];
    this.createModel(inputShape);
    
    const history = await this.model.fit(features, targets, {
    epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
            console.log(`第 ${epoch} 轮 -> 损失: ${logs.loss.toFixed(4)}, 验证损失: ${logs.val_loss.toFixed(4)}`);
        }
      }
    }
  });

    console.log('模型训练完成');
    return history;
  }

  // 特征重要性分析
  async analyzeFeatureImportance(features, targets) {
    console.log('分析特征重要性...');
    
    const basePrediction = this.model.predict(features);
    const baseLoss = tf.metrics.meanSquaredError(targets, basePrediction);
    
    for (let i = 0; i < features.shape[1]; i++) {
      // 创建扰动特征
      const perturbedFeatures = features.clone();
      
      // 创建零张量来替换特定列
      const zeros = tf.zeros([features.shape[0], 1]);
      const beforeSlice = perturbedFeatures.slice([0, 0], [-1, i]);
      const afterSlice = perturbedFeatures.slice([0, i + 1], [-1, -1]);
      
      // 重新构建特征张量，将第i列替换为零
      const newFeatures = tf.concat([beforeSlice, zeros, afterSlice], 1);
      
      // 计算扰动后的预测
      const perturbedPrediction = this.model.predict(newFeatures);
      const perturbedLoss = tf.metrics.meanSquaredError(targets, perturbedPrediction);
      
      // 计算重要性（损失增加量）
      const importance = perturbedLoss.sub(baseLoss);
      this.featureImportance[i] = await importance.data();
      
      // 清理内存
      perturbedFeatures.dispose();
      newFeatures.dispose();
      perturbedPrediction.dispose();
      perturbedLoss.dispose();
      beforeSlice.dispose();
      afterSlice.dispose();
      zeros.dispose();
    }
    
    basePrediction.dispose();
    baseLoss.dispose();
    
    // 排序特征重要性
    const sortedFeatures = Object.entries(this.featureImportance)
      .sort(([,a], [,b]) => b[0] - a[0])
      .map(([index, importance]) => ({
        index: parseInt(index),
        importance: importance[0]
      }));
    
    console.log('特征重要性排序:');
    sortedFeatures.forEach((feature, rank) => {
      console.log(`${rank + 1}. 特征 ${feature.index}: ${feature.importance.toFixed(6)}`);
    });
    
    return sortedFeatures;
  }

  // 预测单条数据
  predictSingle(data) {
    console.log('进行单条数据预测...');
    
    const features = [];
    
    this.featureNames.forEach(feature => {
      let value = data[feature];
      
      if (feature === 'crash_date') {
        const date = new Date(value);
        features.push(date.getFullYear());
        features.push(date.getMonth() + 1);
        features.push(date.getDate());
      } else if (typeof value === 'string') {
        if (this.labelEncoder[feature] && value in this.labelEncoder[feature]) {
          features.push(this.labelEncoder[feature][value]);
        } else {
          features.push(0); // 默认值
        }
      } else {
        features.push(Number(value) || 0);
      }
    });
    
    // 标准化特征
    const featureTensor = tf.tensor2d([features]);
    const normalizedFeatures = featureTensor.sub(this.scaler.mean).div(this.scaler.std);
    
    // 预测
    const prediction = this.model.predict(normalizedFeatures);
    const predictedValue = prediction.dataSync()[0];
    
    // 清理内存
    featureTensor.dispose();
    normalizedFeatures.dispose();
    prediction.dispose();
    
    return predictedValue;
  }

  // 使用数据训练模型
  async trainWithData(data) {
    try {
      console.log(`使用 ${data.length} 条记录训练模型`);
      
      // 数据预处理
      const { features, targets } = this.preprocessData(data);
      
      // 训练模型
      await this.trainModel(features, targets);
      
      // 分析特征重要性
      const featureImportance = await this.analyzeFeatureImportance(features, targets);
      
      // 清理内存
      features.dispose();
      targets.dispose();
      
      return {
        success: true,
        featureImportance,
        message: '模型训练完成'
      };
      
    } catch (error) {
      console.error('训练过程中出现错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
}

  // 加载数据并训练模型
  async loadAndTrain(filePath) {
    try {
      console.log('加载Excel数据...');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      console.log(`成功加载 ${data.length} 条记录`);
      
      // 使用通用训练方法
      return await this.trainWithData(data);
      
    } catch (error) {
      console.error('训练过程中出现错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 检查模型是否已加载
  isModelLoaded() {
    return this.model !== null;
  }
}

// 导出模型类
module.exports = TrafficAccidentPredictor;

// 如果直接运行此文件，执行示例
if (require.main === module) {
  const predictor = new TrafficAccidentPredictor();
  
  // 示例用法
  console.log('交通事故预测模型初始化完成');
  console.log('请使用 loadAndTrain(filePath) 方法加载数据并训练模型');
  console.log('使用 predictSingle(data) 方法进行预测');
}
