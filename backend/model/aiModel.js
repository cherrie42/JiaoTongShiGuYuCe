// 使用 tfjs 来支持文件系统操作
const tf = require('@tensorflow/tfjs');
const xlsx = require('xlsx');
const path = require('path');

class TrafficAccidentPredictor {
  constructor() {
    this.model = null;
    this.featureNames = [
      'crash_date', 'traffic_control_device', 'weather_condition', 
      'lighting_condition', 'trafficway_type', 
      'alignment', 'roadway_surface_cond', 'road_defect', 
      'intersection_related_i', 'crash_hour', 'crash_day_of_week', 'crash_month'
    ];
    this.labelEncoder = {};
    this.scaler = null;
    this.featureImportance = {};
    this.modelPath = path.join(__dirname, '..', 'trained_model');
  }

  // 数据预处理
  preprocessData(data) {
    console.log('开始数据预处理...');
    
    // 使用全部数据
    console.log(`使用全部 ${data.length} 条记录进行训练`);

    // 分离特征和目标变量
    const features = [];
    const targets = [];

    data.forEach(row => {
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
      // 将accident_points转换为二分类：0表示无事故，1表示有事故
      const hasAccident = Number(row.accident_points) > 0 ? 1 : 0;
      targets.push(hasAccident);
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
    
    // 输出层 - 二分类
    this.model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'  // 使用sigmoid激活函数输出概率
    }));

    // 编译模型 - 二分类
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',  // 二分类交叉熵损失
      metrics: ['accuracy']  // 只使用准确率指标
    });

    console.log('模型创建完成');
  }

  // 训练模型（支持EarlyStopping、ReduceLROnPlateau、最佳模型保存）
  async trainModel(trainFeatures, trainTargets, valFeatures, valTargets) {
    console.log('开始训练模型...');
    const inputShape = trainFeatures.shape[1];
    this.createModel(inputShape);

    let bestValLoss = Infinity;
    let bestWeights = null;
    let patience = 10; // EarlyStopping耐心
    let wait = 0;
    let lr = 0.001;
    let minLr = 1e-5;
    let reduceLrFactor = 0.5;
    let reduceLrPatience = 5;
    let reduceLrWait = 0;
    let epochs = 100;
    let batchSize = 64;
    let history = { loss: [], val_loss: [], acc: [], val_acc: [] };

    for (let epoch = 1; epoch <= epochs; epoch++) {
      // 单轮训练
      const h = await this.model.fit(trainFeatures, trainTargets, {
        epochs: 1,
        batchSize,
        validationData: [valFeatures, valTargets],
        verbose: 0
      });
      const loss = h.history.loss[0];
      const val_loss = h.history.val_loss[0];
      const acc = h.history.acc ? h.history.acc[0] : (h.history.accuracy ? h.history.accuracy[0] : NaN);
      const val_acc = h.history.val_acc ? h.history.val_acc[0] : (h.history.val_accuracy ? h.history.val_accuracy[0] : NaN);
      history.loss.push(loss);
      history.val_loss.push(val_loss);
      history.acc.push(acc);
      history.val_acc.push(val_acc);
      if (epoch % 5 === 0 || epoch === 1) {
        console.log(`第${epoch}轮 -> 损失: ${loss.toFixed(4)}, 验证损失: ${val_loss.toFixed(4)}, 准确率: ${acc !== undefined ? acc.toFixed(4) : 'N/A'}, 验证准确率: ${val_acc !== undefined ? val_acc.toFixed(4) : 'N/A'}`);
      }
      // EarlyStopping & 最佳模型保存
      if (val_loss < bestValLoss) {
        bestValLoss = val_loss;
        bestWeights = this.model.getWeights().map(w => w.clone());
        wait = 0;
        reduceLrWait = 0;
        console.log(`[ModelCheckpoint] 验证损失达到新低，已保存最佳模型 (val_loss=${val_loss.toFixed(4)})`);
      } else {
        wait++;
        reduceLrWait++;
        // ReduceLROnPlateau
        if (reduceLrWait >= reduceLrPatience) {
          if (lr > minLr) {
            lr = Math.max(lr * reduceLrFactor, minLr);
            // 重新创建优化器并编译模型
            this.model.compile({
              optimizer: tf.train.adam(lr),
              loss: 'binaryCrossentropy',
              metrics: ['accuracy']
            });
            console.log(`[ReduceLROnPlateau] 验证损失未提升，学习率降低为${lr}`);
          }
          reduceLrWait = 0;
        }
        // EarlyStopping
        if (wait >= patience) {
          console.log(`[EarlyStopping] 验证损失连续${patience}轮未提升，提前停止训练。`);
          break;
        }
      }
    }
    // 恢复最佳权重
    if (bestWeights) {
      this.model.setWeights(bestWeights);
      bestWeights.forEach(w => w.dispose());
      console.log('已恢复最佳模型权重。');
    }
    console.log('训练完成！');
    // 测试集评估
    const evalResult = this.model.evaluate(valFeatures, valTargets, { batchSize, verbose: 0 });
    const testLoss = (await evalResult[0].data())[0];
    const testAcc = (await evalResult[1].data())[0];
    console.log(`测试集损失: ${testLoss.toFixed(4)}, 测试集准确率: ${testAcc.toFixed(4)}`);
    return history;
  }

  // 特征重要性分析
  async analyzeFeatureImportance(features, targets) {
    console.log('分析特征重要性...');
    
    const basePrediction = this.model.predict(features);
    const baseLoss = tf.metrics.binaryCrossentropy(targets, basePrediction);
    
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
      const perturbedLoss = tf.metrics.binaryCrossentropy(targets, perturbedPrediction);
      
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
    const predictedProbability = prediction.dataSync()[0];
    
    // 清理内存
    featureTensor.dispose();
    normalizedFeatures.dispose();
    prediction.dispose();
    
    // 返回事故发生的概率 (0-1之间)
    return predictedProbability;
  }

  // 使用数据训练模型
  async trainWithData(data) {
    try {
      console.log(`共获取到${data.length}条数据，正在随机划分训练集和测试集...`);
      // 随机打乱数据
      const shuffled = data.slice().sort(() => Math.random() - 0.5);
      const trainSize = Math.floor(shuffled.length * 0.8);
      const trainData = shuffled.slice(0, trainSize);
      const testData = shuffled.slice(trainSize);
      console.log(`训练集：${trainData.length}条，测试集：${testData.length}条`);

      // 标签分布统计
      const posTrain = trainData.filter(d => Number(d.accident_points) > 0).length;
      const negTrain = trainData.length - posTrain;
      const posTest = testData.filter(d => Number(d.accident_points) > 0).length;
      const negTest = testData.length - posTest;
      console.log(`训练集标签分布：正样本（有事故）${posTrain}，负样本（无事故）${negTrain}`);
      console.log(`测试集标签分布：正样本（有事故）${posTest}，负样本（无事故）${negTest}`);

      // 数据预处理
      const { features: trainFeatures, targets: trainTargets } = this.preprocessData(trainData);
      const { features: testFeatures, targets: testTargets } = this.preprocessData(testData);

      // 训练模型（带EarlyStopping、ReduceLROnPlateau、最佳模型保存）
      await this.trainModel(trainFeatures, trainTargets, testFeatures, testTargets);

      // 分析特征重要性
      const featureImportance = await this.analyzeFeatureImportance(trainFeatures, trainTargets);

      // 清理内存
      trainFeatures.dispose();
      trainTargets.dispose();
      testFeatures.dispose();
      testTargets.dispose();

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