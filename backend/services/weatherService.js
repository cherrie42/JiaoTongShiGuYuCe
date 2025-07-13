const axios = require('axios');

class WeatherService {
  constructor() {
    // 高德API密钥 - 请替换为你的实际API密钥
    this.apiKey = 'f9b4a0116c092dc75c2e50cd34746192'; // 请替换为你的高德API密钥
    this.baseUrl = 'https://restapi.amap.com/v3';
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
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/regeo`, {
          params: {
            key: this.apiKey,
            location: location,
            output: 'json'
          }
        });
        if (geocodeResponse.data.status !== '1') {
          throw new Error('逆地理编码失败');
        }
        adcode = geocodeResponse.data.regeocode.addressComponent.adcode;
      } else {
        // 使用地点名称进行地理编码
        const geocodeResponse = await axios.get(`${this.baseUrl}/geocode/geo`, {
          params: {
            key: this.apiKey,
            address: location,
            output: 'json'
          }
        });
        if (geocodeResponse.data.status !== '1' || !geocodeResponse.data.geocodes.length) {
          throw new Error('地理编码失败');
        }
        adcode = geocodeResponse.data.geocodes[0].adcode;
        lnglat = geocodeResponse.data.geocodes[0].location; // "经度,纬度"
      }

      // 2. 获取实时天气
      const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
        params: {
          key: this.apiKey,
          city: adcode,
          extensions: 'base',
          output: 'json'
        }
      });
      if (weatherResponse.data.status !== '1' || !weatherResponse.data.lives.length) {
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


}

module.exports = WeatherService; 