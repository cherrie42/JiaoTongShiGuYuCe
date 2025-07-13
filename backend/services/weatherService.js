const axios = require('axios');

class WeatherService {
  constructor() {
    // 高德API密钥 - 请替换为你的实际API密钥
    this.apiKeys = [
      'f9b4a0116c092dc75c2e50cd34746192',
      // 可以添加更多备用key
    ];
    this.currentKeyIndex = 0;
    this.baseUrl = 'https://restapi.amap.com/v3';
    
    // 缓存机制
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10分钟缓存
    
    // API调用节流 - 增加间隔避免限流
    this.lastApiCall = 0;
    this.minInterval = 200; // 最小间隔200ms
    
    // 错误计数和重试机制
    this.errorCounts = new Map();
    this.maxRetries = 3;
  }

  /**
   * 获取当前API密钥
   */
  getCurrentApiKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * 切换到下一个API密钥
   */
  switchToNextApiKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`切换到API密钥 ${this.currentKeyIndex + 1}`);
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
      
      const response = await axios.get(`${this.baseUrl}/geocode/regeo`, {
        params: {
          key: this.getCurrentApiKey(),
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
        await this.throttleApiCall();
        
        const response = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
          params: {
            key: this.getCurrentApiKey(),
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
          
          // 如果是QPS超限，切换API密钥并重试
          if (response.data.infocode === '10021') {
            this.switchToNextApiKey();
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
        
        // 如果是QPS超限，切换API密钥并重试
        if (error.response && error.response.data && 
            error.response.data.infocode === '10021') {
          this.switchToNextApiKey();
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
   * 获取城市名称（带缓存和错误处理）
   */
  async getCityName(adcode) {
    const cacheKey = `city_${adcode}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.throttleApiCall();
        
        const response = await axios.get(`${this.baseUrl}/geocode/geo`, {
          params: {
            key: this.getCurrentApiKey(),
            address: adcode,
            output: 'json'
          },
          timeout: 10000 // 10秒超时
        });

        if (response.data.status === '1' && 
            response.data.geocodes && 
            response.data.geocodes.length > 0) {
          
          const geocode = response.data.geocodes[0];
          // 优先使用区县名称，如果没有则使用市级
          const cityName = geocode.district || geocode.city || geocode.province || '未知';
          const result = {
            name: cityName,
            cityError: null
          };
          
          this.setCache(cacheKey, result);
          return result;
        } else {
          const error = `地理编码API返回异常 - 状态: ${response.data.status}, 信息: ${response.data.info}, 数据: ${JSON.stringify(response.data)}`;
          
          // 如果是QPS超限，切换API密钥并重试
          if (response.data.infocode === '10021') {
            this.switchToNextApiKey();
            retries++;
            continue;
          }
          
          return {
            name: '未知',
            cityError: error
          };
        }
      } catch (error) {
        const errorMsg = `地理编码API请求异常 - ${error.message}`;
        console.error(errorMsg);
        
        // 如果是QPS超限，切换API密钥并重试
        if (error.response && error.response.data && 
            error.response.data.infocode === '10021') {
          this.switchToNextApiKey();
          retries++;
          continue;
        }
        
        retries++;
        if (retries >= this.maxRetries) {
          return {
            name: '未知',
            cityError: errorMsg
          };
        }
      }
    }
    
    return {
      name: '未知',
      cityError: '重试次数超限'
    };
  }

  /**
   * 根据城市名称获取实时天气信息
   * @param {string} cityName - 城市名称
   * @returns {Promise<Object>} 实时天气信息
   */
  async getLiveWeatherByCity(cityName) {
    try {
      // 添加延迟避免API调用频率限制
      await this.delay(50);
      
      // 首先通过城市名称获取城市编码
      const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/geo`, {
        params: {
          key: this.apiKey,
          address: cityName,
          output: 'json'
        }
      });

      if (geocodeResponse.data.status !== '1') {
        throw new Error(`地理编码失败: ${geocodeResponse.data.info}`);
      }

      if (!geocodeResponse.data.geocodes || geocodeResponse.data.geocodes.length === 0) {
        throw new Error(`未找到城市: ${cityName}`);
      }

      const adcode = geocodeResponse.data.geocodes[0].adcode;
      
      // 添加延迟避免API调用频率限制
      await this.delay(50);
      
      // 获取实时天气信息
      const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
        params: {
          key: this.apiKey,
          city: adcode,
          extensions: 'base', // 获取实时天气
          output: 'json'
        }
      });

      if (weatherResponse.data.status !== '1') {
        throw new Error(`天气查询失败: ${weatherResponse.data.info}`);
      }

      const liveWeather = weatherResponse.data.lives[0];
      
      return {
        success: true,
        city: cityName,
        weather: {
          weather: liveWeather.weather,
          temperature: liveWeather.temperature,
          windDirection: liveWeather.winddirection,
          windPower: liveWeather.windpower,
          humidity: liveWeather.humidity,
          reportTime: liveWeather.reporttime
        }
      };

    } catch (error) {
      console.error('获取实时天气信息失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 根据经纬度坐标获取实时天气信息
   * @param {string} location - 经纬度坐标 (格式: "经度,纬度")
   * @returns {Promise<Object>} 实时天气信息
   */
  async getLiveWeatherByLocation(location) {
    try {
      // 添加延迟避免API调用频率限制
      await this.delay(50);
      
      // 使用逆地理编码获取位置信息
      const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/regeo`, {
        params: {
          key: this.apiKey,
          location: location,
          output: 'json'
        }
      });

      if (geocodeResponse.data.status !== '1') {
        throw new Error(`逆地理编码失败: ${geocodeResponse.data.info}`);
      }

      const addressComponent = geocodeResponse.data.regeocode.addressComponent;
      const cityName = addressComponent.city || addressComponent.district || addressComponent.township;
      
      // 获取该位置的实时天气信息
      return await this.getLiveWeatherByCity(cityName);

    } catch (error) {
      console.error('根据坐标获取实时天气信息失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/regeo`, {
          params: {
            key: this.getCurrentApiKey(),
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
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/geo`, {
          params: {
            key: this.getCurrentApiKey(),
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
      const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
        params: {
          key: this.getCurrentApiKey(),
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
      
      // 如果是QPS超限，切换API密钥
      if (error.response && error.response.data && 
          error.response.data.infocode === '10021') {
        this.switchToNextApiKey();
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

      // 处理每条路线
      for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
        const pathObj = paths[pathIndex];
        console.log(`处理第 ${pathIndex + 1} 条路线...`);
        
        // 1. 整理所有节点（起点、途经点、终点）
        const nodes = [pathObj.origin, ...(pathObj.waypoints || []), pathObj.destination];
        const departTime = pathObj.departTime;
        const vehicleType = pathObj.vehicleType;

        // 2. 依次获取每个节点的风险和天气
        const cities = [];
        const routePoints = [];
        let maxRisk = 0;
        let riskSum = 0;
        let highRiskPoints = [];

        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
          const node = nodes[nodeIndex];
          let { adcode, lat, lng } = node;
          
          console.log(`处理节点 ${nodeIndex + 1}/${nodes.length}: ${adcode}, ${lat}, ${lng}`);
          
          // 省级或市级adcode降级处理
          if (this.isProvinceAdcode(adcode) || this.isCityAdcode(adcode)) {
            console.log(`发现省级或市级adcode: ${adcode}，进行降级...`);
            const newAdcode = await this.downgradeAdcode(lat, lng);
            if (newAdcode) {
              adcode = newAdcode;
              console.log(`降级成功: ${adcode}`);
            }
          }

          // 获取天气信息
          const weatherInfo = await this.getWeatherInfo(adcode);
          
          // 获取城市名称
          const cityInfo = await this.getCityName(adcode);
          
          // 风险预测
          const location = `${lng},${lat}`;
          const riskRes = await this.predictAccidentRiskByLocation(location, departTime);
          const risk = riskRes.success ? riskRes.probability : 0;
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
        }

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

        // 汇总
        routes.push({ riskLevel, cities });
        routeRisks.push({ route: routePoints, highRiskPoints, summary });
        
        console.log(`第 ${pathIndex + 1} 条路线处理完成，风险等级: ${riskLevel}`);
      }

      console.log(`所有路线处理完成，共 ${routes.length} 条路线`);
      return { success: true, routes, routeRisks };
    } catch (error) {
      console.error('路线规划处理失败:', error);
      return { success: false, error: error.message };
    }
  }

}

module.exports = WeatherService; 