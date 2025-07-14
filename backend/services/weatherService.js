const axios = require('axios');

/**
 * API密钥池管理类
 */
class KeyPool {
  constructor(keys, minInterval) {
    this.keys = keys.map(key => ({ key, lastCall: 0 }));
    this.minInterval = minInterval;
    console.log(`初始化API密钥池，共 ${keys.length} 个密钥`);
  }

  /**
   * 获取可用的API密钥
   */
  async getAvailableKey() {
    while (true) {
      const now = Date.now();
      for (let i = 0; i < this.keys.length; i++) {
        const keyInfo = this.keys[i];
        if (now - keyInfo.lastCall >= this.minInterval) {
          keyInfo.lastCall = now;
          return keyInfo.key;
        }
      }
      // 如果所有key都不可用，等待一段时间
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * 标记某个密钥被限流
   */
  markKeyAsRateLimited(key) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (keyInfo) {
      keyInfo.lastCall = Date.now() + 5000; // 限流时禁用5秒
      console.log(`密钥被限流，禁用5秒: ${key.substring(0, 8)}...`);
    }
  }
}

class WeatherService {
  constructor() {
    // 高德API密钥池 - 请在此处填入你的多个API密钥
    this.apiKeys = [
      'f9b4a0116c092dc75c2e50cd34746192', // 主密钥
      '5a229a31470944c6552d329b37199532', // 备用密钥1
      '77349d57dbb89c6ea4a6ff58fa3a6adb', // 备用密钥2
      '8161a648de9fbcff52c4ee4efd686c84', // 备用密钥3
      '1b08369a51c8514a5287c8ab2732ef2a', // 备用密钥4

      '4739588ce5fd4af361bbf525bd753da8', // 备用密钥5
      '87c6051cab8ce0d0601b6e6de9563ad6', // 备用密钥6
      'f09406f487e075c2f2802eef7949c511', // 备用密钥7
      'ff3b17cd8d167bd463b6389eaf379d91', // 备用密钥8
      '88c41b6891944ff7b7cba5a9299f04e8', // 备用密钥9

      'b459e5bfe19fce8ca9d7affa2bddcac3',
      '82175bc024db84f4ae338d20c3182697',
      '88d98c80a38b80d49398a7c1eefe1ea9',
      '9b1f113944f7382527d9c05b63d7f3f1',
      '62f9b0bfc6d064be5bb958f6a06551dd',

      '4a3883db78b6a03c1ff4a22c9cf7d6e7',
      '6e7faa83e08b657425de99b9aa3c200f',
      '149100eee3c46d9bc8f62d284c08dfa0',
      '50807820ae2b70795bd19430473023fd',
      'a8975e427b71212d897f13e02aded9b8',
    ];

    // 初始化API密钥池
    this.keyPool = new KeyPool(this.apiKeys, 200); // 每个key间隔200ms

    this.baseUrl = 'https://restapi.amap.com/v3';

    // 缓存机制
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10分钟缓存

    // 错误计数和重试机制
    this.errorCounts = new Map();
    this.maxRetries = 3;
  }

  /**
   * 获取可用的API密钥
   */
  async getAvailableApiKey() {
    return await this.keyPool.getAvailableKey();
  }

  /**
   * 标记API密钥被限流
   */
  markKeyAsRateLimited(key) {
    this.keyPool.markKeyAsRateLimited(key);
  }

  /**
   * 检测是否被限流
   */
  isRateLimited(response) {
    return response && response.data && response.data.infocode === '10021';
  }

  /**
   * 处理限流情况
   */
  async handleRateLimit(usedKey) {
    console.log('检测到API限流，标记密钥并继续...');
    this.markKeyAsRateLimited(usedKey);
    // 不需要额外等待，KeyPool会自动选择其他可用密钥
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API调用节流
   */
  async throttleApiCall() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.minInterval) {
      await this.delay(this.minInterval - timeSinceLastCall);
    }

    this.lastApiCall = Date.now();
  }

  /**
   * 检查缓存
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 检查是否为省级adcode
   */
  isProvinceAdcode(adcode) {
    return /^\d{2}0000$/.test(adcode);
  }

  /**
   * 检查是否为市级adcode
   */
  isCityAdcode(adcode) {
    return /^\d{4}00$/.test(adcode);
  }

  /**
   * 省级或市级adcode降级为区县级
   */
  async downgradeAdcode(lat, lng) {
    try {
      await this.throttleApiCall();

      const apiKey = await this.getAvailableApiKey();
      const response = await axios.get(`${this.baseUrl}/geocode/regeo`, {
        params: {
          key: apiKey,
          location: `${lng},${lat}`,
          output: 'json',
          extensions: 'base'
        },
        timeout: 10000 // 10秒超时
      });

      if (response.data.status === '1' &&
        response.data.regeocode &&
        response.data.regeocode.addressComponent) {

        const addressComponent = response.data.regeocode.addressComponent;
        // 优先使用区县adcode，如果没有则使用市级
        const newAdcode = addressComponent.adcode || addressComponent.citycode;

        if (newAdcode) {
          console.log(`adcode降级成功: ${lat},${lng} -> ${newAdcode}`);
          return newAdcode;
        }
      }
    } catch (error) {
      console.warn(`adcode降级失败: ${lat},${lng}`, error.message);
    }
    return null;
  }

  /**
   * 批量获取天气信息
   * @param {Array} adcodes - adcode数组
   * @returns {Promise<Array>} 天气信息数组
   */
  async getWeatherInfoBatch(adcodes) {
    const results = [];

    for (let i = 0; i < adcodes.length; i++) {
      const adcode = adcodes[i];
      console.log(`获取天气信息 ${i + 1}/${adcodes.length}: ${adcode}`);

      const weatherInfo = await this.getWeatherInfo(adcode);
      results.push(weatherInfo);

      // 每个请求后延迟，避免限流
      if (i < adcodes.length - 1) {
        await this.delay(300); // 增加延迟到300ms
      }
    }

    return results;
  }

  /**
   * 获取天气信息（带缓存和错误处理）
   */
  async getWeatherInfo(adcode) {
    const cacheKey = `weather_${adcode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const apiKey = await this.getAvailableApiKey();

        const response = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
          params: {
            key: apiKey,
            city: adcode,
            extensions: 'base',
            output: 'json'
          },
          timeout: 10000 // 10秒超时
        });

        if (response.data.status === '1' && response.data.lives && response.data.lives.length > 0) {
          const weather = response.data.lives[0];
          const result = {
            weather: weather.weather,
            temperature: parseInt(weather.temperature),
            humidity: parseInt(weather.humidity),
            windSpeed: this.convertWindPowerToSpeed(weather.windpower),
            weatherError: null
          };

          this.setCache(cacheKey, result);
          return result;
        } else {
          const error = `天气API返回异常 - 状态: ${response.data.status}, 信息: ${response.data.info}, 数据: ${JSON.stringify(response.data)}`;

          // 如果是QPS超限，处理限流
          if (this.isRateLimited(response)) {
            await this.handleRateLimit(apiKey);
            retries++;
            continue;
          }

          return {
            weather: '未知',
            temperature: null,
            humidity: null,
            windSpeed: null,
            weatherError: error
          };
        }
      } catch (error) {
        const errorMsg = `天气API请求异常 - ${error.message}`;
        console.error(errorMsg);

        // 如果是QPS超限，处理限流
        if (error.response && this.isRateLimited(error.response)) {
          await this.handleRateLimit(apiKey);
          retries++;
          continue;
        }

        retries++;
        if (retries >= this.maxRetries) {
          return {
            weather: '未知',
            temperature: null,
            humidity: null,
            windSpeed: null,
            weatherError: errorMsg
          };
        }
      }
    }

    return {
      weather: '未知',
      temperature: null,
      humidity: null,
      windSpeed: null,
      weatherError: '重试次数超限'
    };
  }

  /**
 * 获取地点名称（通过逆地理编码API，优先返回最粗颗粒度地名）
 */
  async getPlaceName(lat, lng) {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const apiKey = await this.getAvailableApiKey();
        const response = await axios.get(`${this.baseUrl}/geocode/regeo`, {
          params: {
            key: apiKey,
            location: `${lng},${lat}`,
            output: 'json',
            extensions: 'base'
          },
          timeout: 10000
        });

        if (
          response.data.status === '1' &&
          response.data.regeocode &&
          response.data.regeocode.addressComponent
        ) {
          const ac = response.data.regeocode.addressComponent;
          // 优先级：省 > 市 > 区县 > 乡镇
          const placeName = ac.province || ac.city || ac.district || ac.township || '未知';
          return {
            name: placeName,
            placeError: null
          };
        } else {
          const error = `逆地理编码API返回异常 - 状态: ${response.data.status}, 信息: ${response.data.info}, 数据: ${JSON.stringify(response.data)}`;
          if (this.isRateLimited(response)) {
            await this.handleRateLimit(apiKey);
            retries++;
            continue;
          }
          return {
            name: '未知',
            placeError: error
          };
        }
      } catch (error) {
        const errorMsg = `逆地理编码API请求异常 - ${error.message}`;
        if (error.response && this.isRateLimited(error.response)) {
          await this.handleRateLimit(apiKey);
          retries++;
          continue;
        }
        retries++;
        if (retries >= this.maxRetries) {
          return {
            name: '未知',
            placeError: errorMsg
          };
        }
      }
    }
    return {
      name: '未知',
      placeError: '重试次数超限'
    };
  }

  /**
   * 根据风险值生成风险描述
   * @param {number} risk - 风险值
   * @returns {string} 风险描述
   */
  generateRiskDescription(risk) {
    if (risk > 0.9) {
      return '极高风险路段 - 急转弯 + 恶劣天气 + 路况极差';
    } else if (risk > 0.8) {
      return '高风险路段 - 急转弯 + 路况不佳 + 视线不良';
    } else if (risk > 0.7) {
      return '中高风险路段 - 弯道较多 + 路面湿滑';
    } else if (risk > 0.6) {
      return '中等风险路段 - 车流量较大 + 路况一般';
    } else {
      return '低风险路段 - 路况良好 + 视线清晰';
    }
  }

  /**
   * 根据风险值生成建议
   * @param {number} risk - 风险值
   * @returns {string} 建议
   */
  generateRiskSuggestion(risk) {
    if (risk > 0.9) {
      return '建议绕行或选择其他路线，必须通行时请极度谨慎';
    } else if (risk > 0.8) {
      return '建议减速慢行，保持安全车距，注意观察路况';
    } else if (risk > 0.7) {
      return '建议适当减速，注意路面湿滑情况';
    } else if (risk > 0.6) {
      return '建议保持正常车速，注意车流变化';
    } else {
      return '路况良好，可正常通行';
    }
  }

  /**
   * 生成整体通行建议
   * @param {number} avgRisk - 平均风险值
   * @param {number} maxRisk - 最高风险值
   * @param {string} vehicleType - 车辆类型
   * @returns {string} 整体建议
   */
  generateOverallSuggestion(avgRisk, maxRisk, vehicleType) {
    let suggestion = '';

    if (maxRisk > 0.8) {
      suggestion += '路线存在高风险路段，';
    } else if (avgRisk > 0.6) {
      suggestion += '路线整体风险较高，';
    } else {
      suggestion += '路线整体风险较低，';
    }

    if (vehicleType === '危险品运输车') {
      suggestion += '建议选择专用路线或避开高风险路段';
    } else if (vehicleType === '大型客车') {
      suggestion += '建议避开夜间高峰通行，注意限高限重';
    } else if (vehicleType === '货车') {
      suggestion += '建议避开城市中心区域，选择货运专用道路';
    } else {
      suggestion += '建议避开夜间高峰通行，保持安全驾驶';
    }

    return suggestion;
  }


  /**
   * 将风力等级转换为风速等级
   * @param {string} windPower - 风力等级描述
   * @returns {number} 风速等级 (1-6)
   */
  convertWindPowerToSpeed(windPower) {
    if (!windPower) return 2;

    const windMap = {
      '≤3': 1,
      '4-5': 2,
      '6-7': 3,
      '8-9': 4,
      '10-11': 5,
      '≥12': 6
    };

    // 尝试匹配风力等级
    for (const [key, value] of Object.entries(windMap)) {
      if (windPower.includes(key)) {
        return value;
      }
    }

    // 默认返回中等风速
    return 2;
  }

  /**
   * 计算路线风险等级
   * @param {Array} cities - 城市天气信息数组
   * @returns {string} 风险等级 (低风险/中风险/高风险)
   */
  calculateRouteRiskLevel(cities) {
    if (!cities || cities.length === 0) {
      return '低风险';
    }

    let riskScore = 0;
    let cityCount = cities.length;

    cities.forEach(city => {
      // 天气风险评分
      const weatherRisk = this.getWeatherRiskScore(city.weather);

      // 温度风险评分
      const tempRisk = this.getTemperatureRiskScore(city.temperature);

      // 湿度风险评分
      const humidityRisk = this.getHumidityRiskScore(city.humidity);

      // 风速风险评分
      const windRisk = this.getWindRiskScore(city.windSpeed);

      // 累计风险分数
      riskScore += weatherRisk + tempRisk + humidityRisk + windRisk;
    });

    // 计算平均风险分数
    const avgRiskScore = riskScore / cityCount;

    // 根据平均风险分数确定风险等级
    if (avgRiskScore >= 7) {
      return '高风险';
    } else if (avgRiskScore >= 4) {
      return '中风险';
    } else {
      return '低风险';
    }
  }

  /**
   * 获取天气风险评分
   * @param {string} weather - 天气描述
   * @returns {number} 风险评分
   */
  getWeatherRiskScore(weather) {
    const weatherRiskMap = {
      '晴': 1,
      '多云': 1,
      '阴': 2,
      '小雨': 3,
      '中雨': 4,
      '大雨': 6,
      '暴雨': 8,
      '雷阵雨': 7,
      '雪': 5,
      '雾': 4,
      '霾': 3
    };

    for (const [key, value] of Object.entries(weatherRiskMap)) {
      if (weather.includes(key)) {
        return value;
      }
    }

    return 2; // 默认中等风险
  }

  /**
   * 获取温度风险评分
   * @param {number} temperature - 温度
   * @returns {number} 风险评分
   */
  getTemperatureRiskScore(temperature) {
    if (temperature < -10 || temperature > 40) {
      return 3; // 极低或极高温度
    } else if (temperature < 0 || temperature > 35) {
      return 2; // 较低或较高温度
    } else {
      return 1; // 适宜温度
    }
  }

  /**
   * 获取湿度风险评分
   * @param {number} humidity - 湿度
   * @returns {number} 风险评分
   */
  getHumidityRiskScore(humidity) {
    if (humidity > 90) {
      return 3; // 极高湿度
    } else if (humidity > 80) {
      return 2; // 高湿度
    } else if (humidity < 30) {
      return 2; // 低湿度
    } else {
      return 1; // 适宜湿度
    }
  }

  /**
   * 获取风速风险评分
   * @param {number} windSpeed - 风速等级
   * @returns {number} 风险评分
   */
  getWindRiskScore(windSpeed) {
    if (windSpeed >= 5) {
      return 3; // 强风
    } else if (windSpeed >= 3) {
      return 2; // 中风
    } else {
      return 1; // 微风
    }
  }

  /**
   * 输入地点，预测该地点事故发生概率（可选指定时间）
   * @param {string} location 地点名或经纬度坐标（如城市、区、路段等，或"经度,纬度"格式）
   * @param {Date|string} [time] 可选，指定时间（Date对象或可被Date解析的字符串）
   * @returns {Promise<Object>} { success, location, probability, features }
   */
  async predictAccidentRiskByLocation(location, time) {
    try {
      let adcode, lnglat;

      // 检查是否为经纬度坐标格式
      if (location.includes(',')) {
        // 直接使用经纬度坐标
        lnglat = location;

        // 使用逆地理编码获取adcode
        await this.throttleApiCall();
        const apiKey = await this.getAvailableApiKey();
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/regeo`, {
          params: {
            key: apiKey,
            location: location,
            output: 'json',
            extensions: 'base'
          },
          timeout: 10000
        });

        if (geocodeResponse.data.status !== '1' ||
          !geocodeResponse.data.regeocode ||
          !geocodeResponse.data.regeocode.addressComponent) {
          throw new Error('逆地理编码失败');
        }
        adcode = geocodeResponse.data.regeocode.addressComponent.adcode;
      } else {
        // 使用地点名称进行地理编码
        await this.throttleApiCall();
        const apiKey = await this.getAvailableApiKey();
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/geo`, {
          params: {
            key: apiKey,
            address: location,
            output: 'json'
          },
          timeout: 10000
        });

        if (geocodeResponse.data.status !== '1' ||
          !geocodeResponse.data.geocodes ||
          !geocodeResponse.data.geocodes.length) {
          throw new Error('地理编码失败');
        }
        adcode = geocodeResponse.data.geocodes[0].adcode;
        lnglat = geocodeResponse.data.geocodes[0].location; // "经度,纬度"
      }

      // 2. 获取实时天气
      await this.throttleApiCall();
      const apiKey = await this.getAvailableApiKey();
      const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
        params: {
          key: apiKey,
          city: adcode,
          extensions: 'base',
          output: 'json'
        },
        timeout: 10000
      });

      if (weatherResponse.data.status !== '1' ||
        !weatherResponse.data.lives ||
        !weatherResponse.data.lives.length) {
        throw new Error('天气获取失败');
      }
      const weather = weatherResponse.data.lives[0];

      // 3. 自动映射特征字段
      let dateObj;
      if (time) {
        dateObj = new Date(time);
        if (isNaN(dateObj.getTime())) throw new Error('时间格式不正确');
      } else {
        dateObj = new Date();
      }
      const featureData = {
        crash_date: dateObj.toISOString().slice(0, 10), // 日期 yyyy-mm-dd
        traffic_control_device: 'Traffic Signal', // 默认值
        weather_condition: this.mapWeatherToCondition(weather.weather),
        lighting_condition: this.mapLightingCondition(dateObj.getHours()),
        trafficway_type: 'Two-Way, Not Divided', // 默认值
        alignment: 'Straight', // 默认值
        roadway_surface_cond: this.mapRoadSurfaceCond(weather.weather),
        road_defect: 'None', // 默认值
        intersection_related_i: 'Non-Intersection', // 默认值
        crash_hour: dateObj.getHours(),
        crash_day_of_week: dateObj.getDay() === 0 ? 7 : dateObj.getDay(), // 周日为7
        crash_month: dateObj.getMonth() + 1
      };

      // 4. 调用本地事故预测API
      const predictionResponse = await axios.post('http://localhost:3001/api/predict', featureData);
      const probability = predictionResponse.data.probability;

      return {
        success: true,
        location,
        time: dateObj.toISOString(),
        probability,
        features: featureData
      };
    } catch (error) {
      console.error('事故概率预测失败:', error.message);

      // 如果是QPS超限，标记API密钥为限流状态
      if (error.response && error.response.data &&
        error.response.data.infocode === '10021') {
        // 注意：这里无法直接获取使用的密钥，需要在上层调用时处理
        console.warn('检测到API限流，建议增加API密钥或调整调用频率');
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 天气描述映射到模型字段
   */
  mapWeatherToCondition(weather) {
    if (!weather) return 'Clear';
    if (weather.includes('雨')) return 'Rain';
    if (weather.includes('雪')) return 'Snow';
    if (weather.includes('雾') || weather.includes('霾')) return 'Fog';
    if (weather.includes('阴')) return 'Cloudy';
    if (weather.includes('晴')) return 'Clear';
    return 'Clear';
  }

  /**
   * 根据小时映射照明条件
   */
  mapLightingCondition(hour) {
    if (hour >= 6 && hour < 18) return 'Daylight';
    if (hour >= 18 && hour < 20) return 'Dusk';
    return 'Dark - Street Lights On';
  }

  /**
   * 根据天气映射路面状况
   */
  mapRoadSurfaceCond(weather) {
    if (!weather) return 'Dry';
    if (weather.includes('雨')) return 'Wet';
    if (weather.includes('雪')) return 'Snow/Slush';
    return 'Dry';
  }

  /**
   * 批量处理节点数据
   * @param {Array} nodes - 节点数组
   * @param {string} departTime - 出发时间
   * @returns {Promise<Array>} 处理后的节点数组
   */
  async processNodesBatch(nodes, departTime) {
    const processedNodes = [];

    // 处理adcode降级
    const processedAdcodes = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let { adcode, lat, lng } = node;

      console.log(`处理节点 ${i + 1}/${nodes.length}: ${adcode}, ${lat}, ${lng}`);

      // 省级或市级adcode降级处理
      if (this.isProvinceAdcode(adcode) || this.isCityAdcode(adcode)) {
        console.log(`发现省级或市级adcode: ${adcode}，进行降级...`);
        const newAdcode = await this.downgradeAdcode(lat, lng);
        if (newAdcode) {
          adcode = newAdcode;
          console.log(`降级成功: ${adcode}`);
        }
      }

      processedAdcodes.push({ ...node, adcode });
    }

    // 批量获取天气和城市信息
    const adcodes = processedAdcodes.map(node => node.adcode);

    // 串行处理天气信息，避免限流
    const weatherInfos = await this.getWeatherInfoBatch(adcodes);

    // 串行处理地名信息，避免限流
    const placeInfos = [];
    for (let i = 0; i < adcodes.length; i++) {
      const node = processedAdcodes[i];
      console.log(`获取地名 ${i + 1}/${adcodes.length}: ${node.lat},${node.lng}`);

      const placeInfo = await this.getPlaceName(node.lat, node.lng);
      placeInfos.push(placeInfo);

      // 每个请求后延迟，避免限流
      if (i < adcodes.length - 1) {
        await this.delay(300); // 保持原有延迟
      }
    }

    // 并行进行风险预测
    const riskPromises = processedAdcodes.map(async (node, index) => {
      const { adcode, lat, lng } = node;
      const location = `${lng},${lat}`;
      const riskRes = await this.predictAccidentRiskByLocation(location, departTime);
      const risk = riskRes.success ? riskRes.probability : 0;

      return {
        adcode,
        lat,
        lng,
        weatherInfo: weatherInfos[index],
        cityInfo: placeInfos[index], // 这里cityInfo其实是placeInfo，结构兼容
        risk,
        location
      };
    });

    // 等待所有风险预测完成
    const results = await Promise.all(riskPromises);

    // 按原始顺序整理结果
    results.forEach((result, index) => {
      processedNodes[index] = result;
    });

    return processedNodes;
  }

  /**
   * 路线规划主处理：对每条路线所有节点进行风险和天气评估，返回 routes 和 routeRisks
   * @param {Object} data - 前端传入的 { paths: [...] }
   * @returns {Promise<Object>} { success, routes, routeRisks }
   */
  async handleRoutePlanning(data) {
    try {
      const { paths } = data;
      if (!Array.isArray(paths)) {
        return { success: false, error: '请求体格式错误，缺少 paths 数组' };
      }

      console.log(`开始处理 ${paths.length} 条路线...`);

      // 结果容器
      const routes = [];
      const routeRisks = [];

      // 并行处理所有路线
      const routePromises = paths.map(async (pathObj, pathIndex) => {
        console.log(`并行处理第 ${pathIndex + 1} 条路线...`);

        // 1. 整理所有节点（起点、途经点、终点）
        const nodes = [pathObj.origin, ...(pathObj.waypoints || []), pathObj.destination];
        const departTime = pathObj.departTime;
        const vehicleType = pathObj.vehicleType;

        // 2. 批量处理所有节点
        const processedNodes = await this.processNodesBatch(nodes, departTime);

        // 3. 整理结果
        const cities = [];
        const routePoints = [];
        let maxRisk = 0;
        let riskSum = 0;
        let highRiskPoints = [];

        processedNodes.forEach((node, nodeIndex) => {
          const { adcode, lat, lng, weatherInfo, cityInfo, risk } = node;

          maxRisk = Math.max(maxRisk, risk);
          riskSum += risk;

          // route-risk 节点
          routePoints.push({ adcode, lng, lat, risk });

          // 高风险点
          if (risk >= 0.7) {
            highRiskPoints.push({
              adcode, lng, lat, risk,
              description: this.generateRiskDescription(risk),
              suggestion: this.generateRiskSuggestion(risk)
            });
          }

          // routes 节点
          cities.push({
            adcode,
            name: cityInfo.name,
            weather: weatherInfo.weather,
            temperature: weatherInfo.temperature,
            humidity: weatherInfo.humidity,
            windSpeed: weatherInfo.windSpeed,
            lat,
            lng,
            weatherError: weatherInfo.weatherError,
            cityError: cityInfo.cityError
          });
        });

        // 计算平均风险
        const avgRisk = routePoints.length > 0 ? (riskSum / routePoints.length) : 0;
        // 路线风险等级
        const riskLevel = this.calculateRouteRiskLevel(cities);
        // 路线 summary
        const summary = {
          start: cities[0]?.name || '',
          end: cities[cities.length - 1]?.name || '',
          maxRisk,
          avgRisk: Number(avgRisk.toFixed(2)),
          suggestion: this.generateOverallSuggestion(avgRisk, maxRisk, vehicleType)
        };

        console.log(`第 ${pathIndex + 1} 条路线处理完成，风险等级: ${riskLevel}`);

        return {
          route: { riskLevel, cities },
          routeRisk: { route: routePoints, highRiskPoints, summary }
        };
      });

      // 等待所有路线处理完成
      const results = await Promise.all(routePromises);

      // 按原始顺序整理结果
      results.forEach((result, index) => {
        routes[index] = result.route;
        routeRisks[index] = result.routeRisk;
      });

      console.log(`所有路线处理完成，共 ${routes.length} 条路线`);
      return { success: true, routes, routeRisks };
    } catch (error) {
      console.error('路线规划处理失败:', error);
      return { success: false, error: error.message };
    }
  }

}

module.exports = WeatherService; 