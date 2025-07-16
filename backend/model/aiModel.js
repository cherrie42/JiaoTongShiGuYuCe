// 使用 tfjs 来支持文件系统操作
const tf = require('@tensorflow/tfjs');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

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
    this.crashTypeEncoder = {};
    this.scaler = null;
    this.featureImportance = {};
    this.modelPath = path.join(__dirname, '..', 'trained_model');
    this.numCrashTypes = 0;
    // 英文碰撞类型到中文的映射
    this.crashTypeZhMap = {
      'ANGLE': '角度碰撞',
      'REAR END': '追尾碰撞',
      'SIDESWIPE': '侧擦碰撞',
      'HEAD ON': '迎面碰撞',
      'FIXED OBJECT': '固定物体碰撞',
      'PARKED MOTOR VEHICLE': '停放车辆碰撞',
      'PEDESTRIAN': '行人碰撞',
      'BICYCLE': '自行车碰撞',
      'OVERTURNED': '翻车',
      'OTHER OBJECT': '其他物体碰撞',
      'ANIMAL': '动物碰撞',
      'UNKNOWN': '未知类型',
      'TURNING': '转弯碰撞'
    };
  }

  // 数据预处理，生成两个标签
  preprocessData(data, isTraining = true) {
    console.log('开始数据预处理...');
    if (isTraining) {
      console.log(`使用全部 ${data.length} 条记录进行训练`);
    } else {
      console.log(`使用全部 ${data.length} 条记录进行测试`);
    }
    const features = [];
    const accidentProbTargets = [];
    const crashTypeTargets = [];
    // 统计所有碰撞类型
    if (isTraining) {
      this.crashTypeEncoder = {};
    }
    data.forEach(row => {
      const featureRow = [];
      this.featureNames.forEach(feature => {
        let value = this.handleMissingValue(feature, row[feature]);
        if (feature === 'crash_date') {
          const date = new Date(value);
          featureRow.push(date.getFullYear());
          featureRow.push(date.getMonth() + 1);
          featureRow.push(date.getDate());
        } else if (typeof value === 'string') {
          if (!this.labelEncoder[feature]) {
            this.labelEncoder[feature] = {};
          }
          if (!(value in this.labelEncoder[feature])) {
            this.labelEncoder[feature][value] = Object.keys(this.labelEncoder[feature]).length;
          }
          featureRow.push(this.labelEncoder[feature][value]);
        } else {
          featureRow.push(Number(value) || 0);
        }
      });
      features.push(featureRow);
      // 事故概率标签
      const hasAccident = Number(row.accident_points) > 0 ? 1 : 0;
      accidentProbTargets.push(hasAccident);
      // 碰撞类型标签
      let crashType = row.first_crash_type || 'UNKNOWN';
      if (isTraining) {
        if (!(crashType in this.crashTypeEncoder)) {
          this.crashTypeEncoder[crashType] = Object.keys(this.crashTypeEncoder).length;
        }
      }
      crashTypeTargets.push(crashType);
    });
    // 生成one-hot标签
    const allCrashTypes = Object.keys(this.crashTypeEncoder);
    this.numCrashTypes = allCrashTypes.length;
    const crashTypeOneHot = crashTypeTargets.map(type => {
      const arr = new Array(this.numCrashTypes).fill(0);
      const idx = this.crashTypeEncoder[type] !== undefined ? this.crashTypeEncoder[type] : 0;
      arr[idx] = 1;
      return arr;
    });
    // 数据标准化
    const featureTensor = tf.tensor2d(features);
    const mean = featureTensor.mean(0);
    const std = featureTensor.sub(mean).square().mean(0).sqrt();
    this.scaler = { mean, std };
    const normalizedFeatures = featureTensor.sub(mean).div(std);
    return {
      features: normalizedFeatures,
      accidentProbTargets: tf.tensor2d(accidentProbTargets, [accidentProbTargets.length, 1], 'float32'), // 改回二维
      crashTypeTargets: tf.tensor2d(crashTypeOneHot, [crashTypeOneHot.length, this.numCrashTypes])
    };
  }

  // 创建多输出模型
  createModel(inputShape, numCrashTypes) {
    console.log('创建多输出神经网络模型...');
    const input = tf.input({shape: [inputShape]});
    let x = tf.layers.dense({units: 64, activation: 'relu'}).apply(input);
    x = tf.layers.dropout({rate: 0.3}).apply(x);
    x = tf.layers.dense({units: 32, activation: 'relu'}).apply(x);
    x = tf.layers.dropout({rate: 0.2}).apply(x);
    x = tf.layers.dense({units: 16, activation: 'relu'}).apply(x);
    // 输出1：事故概率
    const accidentProb = tf.layers.dense({units: 1, activation: 'sigmoid', name: 'accident_prob'}).apply(x);
    // 输出2：碰撞类型
    const crashType = tf.layers.dense({units: numCrashTypes, activation: 'softmax', name: 'crash_type'}).apply(x);
    this.model = tf.model({inputs: input, outputs: [accidentProb, crashType]});
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: {
        accident_prob: 'binaryCrossentropy',
        crash_type: 'categoricalCrossentropy'
      },
      metrics: {
        accident_prob: ['accuracy'],
        crash_type: ['accuracy']
      }
    });
    console.log('模型创建完成');
  }

  // 训练模型
  async trainModel(trainFeatures, trainAccidentProb, trainCrashType, valFeatures, valAccidentProb, valCrashType) {
    console.log('开始训练MTL-NN...');
    const inputShape = trainFeatures.shape[1];
    const numCrashTypes = trainCrashType.shape[1];
    this.createModel(inputShape, numCrashTypes);
    let bestValLoss = Infinity;
    let bestWeights = null;
    let patience = 10;
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
      const h = await this.model.fit(
        trainFeatures,
        { accident_prob: trainAccidentProb, crash_type: trainCrashType },
        {
          epochs: 1,
          batchSize,
          validationData: [valFeatures, { accident_prob: valAccidentProb, crash_type: valCrashType }],
          verbose: 0
        }
      );
      console.log('h.history:', h.history); // 新增打印
      const loss = h.history.loss[0];
      const val_loss = h.history.val_loss[0];
      // 分别获取两个输出的准确率（修正字段名）
      const acc_accident = h.history['accident_prob_acc'] ? h.history['accident_prob_acc'][0] : NaN;
      const acc_crash = h.history['crash_type_acc'] ? h.history['crash_type_acc'][0] : NaN;
      const val_acc_accident = h.history['val_accident_prob_acc'] ? h.history['val_accident_prob_acc'][0] : NaN;
      const val_acc_crash = h.history['val_crash_type_acc'] ? h.history['val_crash_type_acc'][0] : NaN;
      history.loss.push(loss);
      history.val_loss.push(val_loss);
      history.acc_accident = history.acc_accident || [];
      history.acc_crash = history.acc_crash || [];
      history.val_acc_accident = history.val_acc_accident || [];
      history.val_acc_crash = history.val_acc_crash || [];
      history.acc_accident.push(acc_accident);
      history.acc_crash.push(acc_crash);
      history.val_acc_accident.push(val_acc_accident);
      history.val_acc_crash.push(val_acc_crash);
      if (epoch % 5 === 0 || epoch === 1) {
        console.log(`第${epoch}轮 -> 损失: ${loss.toFixed(4)}, 验证损失: ${val_loss.toFixed(4)}, ` +
          `事故概率acc: ${acc_accident !== undefined ? acc_accident.toFixed(4) : 'N/A'}, ` +
          `碰撞类型acc: ${acc_crash !== undefined ? acc_crash.toFixed(4) : 'N/A'}, ` +
          `验证事故概率acc: ${val_acc_accident !== undefined ? val_acc_accident.toFixed(4) : 'N/A'}, ` +
          `验证碰撞类型acc: ${val_acc_crash !== undefined ? val_acc_crash.toFixed(4) : 'N/A'}`);
      }
      if (val_loss < bestValLoss) {
        bestValLoss = val_loss;
        bestWeights = this.model.getWeights().map(w => w.clone());
        wait = 0;
        reduceLrWait = 0;
        console.log(`[ModelCheckpoint] 验证损失达到新低，已保存最佳模型 (val_loss=${val_loss.toFixed(4)})`);
      } else {
        wait++;
        reduceLrWait++;
        if (reduceLrWait >= reduceLrPatience) {
          if (lr > minLr) {
            lr = Math.max(lr * reduceLrFactor, minLr);
            this.model.compile({
              optimizer: tf.train.adam(lr),
              loss: {
                accident_prob: 'binaryCrossentropy',
                crash_type: 'categoricalCrossentropy'
              },
              metrics: {
                accident_prob: ['accuracy'],
                crash_type: ['accuracy']
              }
            });
            console.log(`[ReduceLROnPlateau] 验证损失未提升，学习率降低为${lr}`);
          }
          reduceLrWait = 0;
        }
        if (wait >= patience) {
          console.log(`[EarlyStopping] 验证损失连续${patience}轮未提升，提前停止训练。`);
          break;
        }
      }
    }
    if (bestWeights) {
      this.model.setWeights(bestWeights);
      bestWeights.forEach(w => w.dispose());
      console.log('已恢复最佳模型权重。');
    }
    console.log('训练完成！');
    return history;
  }

  // 保存模型（手动保存结构和权重）
  async saveModel() {
    // 保存结构
    const modelTopology = this.model.toJSON();
    const modelTopologyObj = JSON.parse(modelTopology);
    fs.writeFileSync(
      path.join(this.modelPath, 'model.json'),
      JSON.stringify(modelTopologyObj, null, 2)
    );
    // 保存权重
    const weights = await this.model.getWeights();
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
      labelEncoder: this.labelEncoder,
      crashTypeEncoder: this.crashTypeEncoder,
      numCrashTypes: this.numCrashTypes,
      scaler: {
        mean: await this.scaler.mean.array(),
        std: await this.scaler.std.array()
      },
      featureNames: this.featureNames
    };
    fs.writeFileSync(
      path.join(this.modelPath, 'preprocessing.json'),
      JSON.stringify(preprocessingParams, null, 2)
    );
    // 保存特征重要性
    if (this.featureImportance) {
      fs.writeFileSync(
        path.join(this.modelPath, 'feature_importance.json'),
        JSON.stringify(this.featureImportance, null, 2)
      );
    }
    console.log('模型、预处理参数和特征重要性已保存');
  }

  // 加载模型（手动加载结构和权重）
  async loadModel() {
    // 读取结构
    const modelJsonPath = path.join(this.modelPath, 'model.json');
    const weightsPath = path.join(this.modelPath, 'weights.json');
    if (!fs.existsSync(modelJsonPath) || !fs.existsSync(weightsPath)) {
      throw new Error('模型文件不存在，请先训练模型');
    }
    const modelTopology = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
    if (modelTopology.class_name !== 'Model') {
      throw new Error('只支持Functional多输出模型结构');
    }
    // 重建模型结构
    const tfInput = tf.input({shape: [modelTopology.config.layers[0].config.batch_input_shape[1]]});
    let x = tfInput;
    for (let i = 1; i < modelTopology.config.layers.length - 2; i++) {
      const layer = modelTopology.config.layers[i];
      if (layer.class_name === 'Dense') {
        x = tf.layers.dense({units: layer.config.units, activation: layer.config.activation}).apply(x);
      } else if (layer.class_name === 'Dropout') {
        x = tf.layers.dropout({rate: layer.config.rate}).apply(x);
      }
    }
    // 输出层
    const accidentProb = tf.layers.dense({units: 1, activation: 'sigmoid', name: 'accident_prob'}).apply(x);
    const crashType = tf.layers.dense({units: modelTopology.config.layers[modelTopology.config.layers.length-1].config.units, activation: 'softmax', name: 'crash_type'}).apply(x);
    const model = tf.model({inputs: tfInput, outputs: [accidentProb, crashType]});
    // 读取权重
    const weightsData = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    const weights = weightsData.map(w => tf.tensor(w.data, w.shape, w.dtype));
    model.setWeights(weights);
    this.model = model;
    // 加载预处理参数
    const preprocessingPath = path.join(this.modelPath, 'preprocessing.json');
    if (fs.existsSync(preprocessingPath)) {
      const preprocessingParams = JSON.parse(fs.readFileSync(preprocessingPath, 'utf8'));
      this.labelEncoder = preprocessingParams.labelEncoder;
      this.crashTypeEncoder = preprocessingParams.crashTypeEncoder;
      this.numCrashTypes = preprocessingParams.numCrashTypes;
      this.scaler = {
        mean: tf.tensor(preprocessingParams.scaler.mean),
        std: tf.tensor(preprocessingParams.scaler.std)
      };
      this.featureNames = preprocessingParams.featureNames;
    }
    // 加载特征重要性
    const featureImportancePath = path.join(this.modelPath, 'feature_importance.json');
    if (fs.existsSync(featureImportancePath)) {
      this.featureImportance = JSON.parse(fs.readFileSync(featureImportancePath, 'utf8'));
    }
    console.log('模型、预处理参数和特征重要性已加载');
  }

  // 分别计算两个输出的特征重要性
  async analyzeFeatureImportance(features, accidentProbTargets, crashTypeTargets) {
    console.log('分析特征重要性...');
    // 事故概率输出
    const basePred1 = this.model.predict(features)[0];
    const baseLoss1 = tf.metrics.binaryCrossentropy(accidentProbTargets, basePred1);
    // 碰撞类型输出
    const basePred2 = this.model.predict(features)[1];
    const baseLoss2 = tf.metrics.categoricalCrossentropy(crashTypeTargets, basePred2);
    const importance_accident_prob = [];
    const importance_crash_type = [];
    for (let i = 0; i < features.shape[1]; i++) {
      const perturbedFeatures = features.clone();
      const zeros = tf.zeros([features.shape[0], 1]);
      const beforeSlice = perturbedFeatures.slice([0, 0], [-1, i]);
      const afterSlice = perturbedFeatures.slice([0, i + 1], [-1, -1]);
      const newFeatures = tf.concat([beforeSlice, zeros, afterSlice], 1);
      // 输出1
      const perturbedPred1 = this.model.predict(newFeatures)[0];
      const perturbedLoss1 = tf.metrics.binaryCrossentropy(accidentProbTargets, perturbedPred1);
      // 输出2
      const perturbedPred2 = this.model.predict(newFeatures)[1];
      const perturbedLoss2 = tf.metrics.categoricalCrossentropy(crashTypeTargets, perturbedPred2);
      // 损失增加量
      importance_accident_prob.push((await perturbedLoss1.sub(baseLoss1).mean().data())[0]);
      importance_crash_type.push((await perturbedLoss2.sub(baseLoss2).mean().data())[0]);
      // 清理
      perturbedFeatures.dispose();
      newFeatures.dispose();
      perturbedPred1.dispose();
      perturbedLoss1.dispose();
      perturbedPred2.dispose();
      perturbedLoss2.dispose();
      beforeSlice.dispose();
      afterSlice.dispose();
      zeros.dispose();
    }
    basePred1.dispose();
    baseLoss1.dispose();
    basePred2.dispose();
    baseLoss2.dispose();
    this.featureImportance = {
      accident_prob: importance_accident_prob,
      crash_type: importance_crash_type
    };
    // 也返回
    return this.featureImportance;
  }

  // 预测单条数据，返回两个输出
  predictSingle(data) {
    console.log('进行单条数据预测...');
    const features = [];
    this.featureNames.forEach(feature => {
      let value = this.handleMissingValue(feature, data[feature]);
      if (feature === 'crash_date') {
        const date = new Date(value);
        features.push(date.getFullYear());
        features.push(date.getMonth() + 1);
        features.push(date.getDate());
      } else if (typeof value === 'string') {
        if (this.labelEncoder[feature] && value in this.labelEncoder[feature]) {
          features.push(this.labelEncoder[feature][value]);
        } else {
          features.push(this.getDefaultValue(feature));
        }
      } else {
        features.push(Number(value) || this.getDefaultValue(feature));
      }
    });
    const featureTensor = tf.tensor2d([features]);
    const normalizedFeatures = featureTensor.sub(this.scaler.mean).div(this.scaler.std);
    const [accidentProb, crashType] = this.model.predict(normalizedFeatures);
    const accidentProbValue = accidentProb.dataSync()[0];
    const crashTypeIdx = crashType.argMax(-1).dataSync()[0];
    const crashTypeLabel = Object.keys(this.crashTypeEncoder).find(key => this.crashTypeEncoder[key] === crashTypeIdx) || 'UNKNOWN';
    // 翻译为中文
    const crashTypeZh = this.crashTypeZhMap[crashTypeLabel] || crashTypeLabel;
    featureTensor.dispose();
    normalizedFeatures.dispose();
    accidentProb.dispose();
    crashType.dispose();
    return {
      accident_prob: accidentProbValue,
      crash_type: crashTypeZh
    };
  }

  // 使用数据训练模型
  async trainWithData(data) {
    try {
      console.log(`共获取到${data.length}条数据，正在随机划分训练集和测试集...`);
      const shuffled = data.slice().sort(() => Math.random() - 0.5);
      const trainSize = Math.floor(shuffled.length * 0.8);
      const trainData = shuffled.slice(0, trainSize);
      const testData = shuffled.slice(trainSize);
      // 数据预处理
      const { features: trainFeatures, accidentProbTargets: trainAccidentProb, crashTypeTargets: trainCrashType } = this.preprocessData(trainData, true);
      const { features: testFeatures, accidentProbTargets: testAccidentProb, crashTypeTargets: testCrashType } = this.preprocessData(testData, false);
      // 训练模型
      await this.trainModel(trainFeatures, trainAccidentProb, trainCrashType, testFeatures, testAccidentProb, testCrashType);
      // 分别分析两个输出的特征重要性
      await this.analyzeFeatureImportance(trainFeatures, trainAccidentProb, trainCrashType);
      // 保存模型、预处理参数和特征重要性
      await this.saveModel();
      // 清理内存
      trainFeatures.dispose();
      trainAccidentProb.dispose();
      trainCrashType.dispose();
      testFeatures.dispose();
      testAccidentProb.dispose();
      testCrashType.dispose();
      return {
        success: true,
        message: '模型训练完成并已保存'
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

  // 获取特征的默认值
  getDefaultValue(feature) {
    const defaults = {
      // 交通控制设备 - 使用最常见的"NO CONTROLS"
      traffic_control_device: 2, // "NO CONTROLS"
      
      // 天气条件 - 使用最常见的"CLEAR"
      weather_condition: 0, // "CLEAR"
      
      // 照明条件 - 使用最常见的"DAYLIGHT"
      lighting_condition: 0, // "DAYLIGHT"
      
      // 道路类型 - 使用最常见的"NOT DIVIDED"
      trafficway_type: 0, // "NOT DIVIDED"
      
      // 道路线形 - 使用最常见的"STRAIGHT AND LEVEL"
      alignment: 0, // "STRAIGHT AND LEVEL"
      
      // 路面状况 - 使用最常见的"DRY"
      roadway_surface_cond: 0, // "DRY"
      
      // 道路缺陷 - 使用最常见的"NO DEFECTS"
      road_defect: 0, // "NO DEFECTS"
      
      // 是否与交叉口相关 - 使用最常见的"N"
      intersection_related_i: 1, // "N"
      
      // 数值特征的默认值
      crash_hour: 12, // 中午12点
      crash_day_of_week: 1, // 周一
      crash_month: 6, // 6月
      
      // 日期特征 - 使用当前日期
      crash_date: new Date()
    };
    
    return defaults[feature] !== undefined ? defaults[feature] : 0;
  }

  // 处理缺失值
  handleMissingValue(feature, value) {
    // 检查是否为缺失值
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'string' && value.toLowerCase() === 'unknown') ||
        (typeof value === 'string' && value.toLowerCase() === 'not reported')) {
      return this.getDefaultValue(feature);
    }
    return value;
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
