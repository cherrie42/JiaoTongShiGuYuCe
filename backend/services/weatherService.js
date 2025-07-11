const axios = require('axios');

class WeatherService {
  constructor() {
    // 高德API密钥 - 请替换为你的实际API密钥
    this.apiKey = 'f9b4a0116c092dc75c2e50cd34746192'; // 请替换为你的高德API密钥
    this.baseUrl = 'https://restapi.amap.com/v3';
  }

  /**
   * 根据城市名称获取天气信息
   * @param {string} cityName - 城市名称
   * @returns {Promise<Object>} 天气信息
   */
  async getWeatherByCity(cityName) {
    try {
      // 添加延迟避免API调用频率限制
      await this.delay(200);
      
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
      await this.delay(200);
      
      // 使用城市编码获取天气信息
      const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
        params: {
          key: this.apiKey,
          city: adcode,
          extensions: 'all', // 获取详细天气信息
          output: 'json'
        }
      });

      if (weatherResponse.data.status !== '1') {
        throw new Error(`天气查询失败: ${weatherResponse.data.info}`);
      }

      const weatherData = weatherResponse.data.forecasts[0];
      const currentWeather = weatherData.casts[0]; // 今天的天气
      
      return {
        success: true,
        city: cityName,
        weather: {
          date: currentWeather.date,
          dayWeather: currentWeather.dayweather,
          nightWeather: currentWeather.nightweather,
          dayTemp: currentWeather.daytemp,
          nightTemp: currentWeather.nighttemp,
          dayWind: currentWeather.daywind,
          nightWind: currentWeather.nightwind,
          dayPower: currentWeather.daypower,
          nightPower: currentWeather.nightpower
        },
        humidity: currentWeather.dayhumidity || '暂无数据',
        visibility: currentWeather.dayvisibility || '暂无数据'
      };

    } catch (error) {
      console.error('获取天气信息失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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
      await this.delay(200);
      
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
      await this.delay(200);
      
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
   * 路线规划并获取沿途天气信息
   * @param {string} origin - 起点城市
   * @param {string} destination - 终点城市
   * @param {string} strategy - 路线策略 (driving, walking, bicycling, transit)
   * @returns {Promise<Object>} 路线规划和天气信息
   */
  async getRouteWithWeather(origin, destination, strategy = 'driving') {
    try {
      // 首先获取起点和终点的地理编码
      const originGeocode = await this.getGeocode(origin);
      const destGeocode = await this.getGeocode(destination);
      
      if (!originGeocode || !destGeocode) {
        throw new Error('无法获取起点或终点的地理坐标');
      }

      // 路线规划
      const routeResponse = await axios.get(`${this.baseUrl}/direction/driving`, {
        params: {
          key: this.apiKey,
          origin: originGeocode,
          destination: destGeocode,
          strategy: strategy,
          output: 'json'
        }
      });

      if (routeResponse.data.status !== '1') {
        throw new Error(`路线规划失败: ${routeResponse.data.info}`);
      }

      const routes = routeResponse.data.route.paths;
      const routeResults = [];

      for (let i = 0; i < Math.min(routes.length, 3); i++) { // 最多返回3条路线
        const route = routes[i];
        const totalDistance = parseInt(route.distance);
        const nodes = this.extractCitiesFromRoute(route.steps, origin, destination, totalDistance);
        
        // 获取沿途各节点的天气信息
        const weatherInfo = [];
        for (const node of nodes) {
          let weather;
          
          // 对于途经点，尝试使用坐标获取实时天气信息
          if (node.type === 'waypoint' && node.coordinates) {
            weather = await this.getLiveWeatherByLocation(node.coordinates);
          } else {
            weather = await this.getLiveWeatherByCity(node.name);
          }
          
          if (weather.success) {
            weatherInfo.push({
              ...weather,
              nodeInfo: {
                name: node.name,
                type: node.type,
                distance: node.distance,
                coordinates: node.coordinates
              }
            });
          }
        }

        routeResults.push({
          routeIndex: i + 1,
          distance: route.distance,
          duration: route.duration,
          strategy: strategy,
          nodes: nodes,
          weatherInfo: weatherInfo
        });
      }

      return {
        success: true,
        origin: origin,
        destination: destination,
        routes: routeResults
      };

    } catch (error) {
      console.error('路线规划失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取城市的地理编码
   * @param {string} cityName - 城市名称
   * @returns {Promise<string>} 地理编码
   */
  async getGeocode(cityName) {
    try {
      // 添加延迟避免API调用频率限制
      await this.delay(200);
      
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

      return geocodeResponse.data.geocodes[0].location; // 返回经纬度坐标
    } catch (error) {
      console.error(`获取${cityName}地理编码失败:`, error.message);
      return null;
    }
  }

  /**
   * 根据道路长度智能分段并获取节点天气信息
   * @param {Array} steps - 路线步骤
   * @param {string} origin - 起点城市
   * @param {string} destination - 终点城市
   * @param {number} totalDistance - 总距离（米）
   * @returns {Array} 分段节点数组
   */
  extractCitiesFromRoute(steps, origin, destination, totalDistance) {
    const nodes = [];
    
    // 根据总距离确定分段数量
    let segmentCount = this.calculateSegmentCount(totalDistance);
    
    // 如果距离很短，只返回起点和终点
    if (segmentCount <= 2) {
      return [origin, destination];
    }
    
    // 添加起点
    nodes.push({
      name: origin,
      type: 'origin',
      distance: 0
    });
    
    // 根据距离分段添加中间节点
    const segmentDistance = totalDistance / (segmentCount - 1);
    
    for (let i = 1; i < segmentCount - 1; i++) {
      const distance = Math.round(segmentDistance * i);
      const nodeInfo = this.getNearestNodeFromSteps(steps, distance);
      
      nodes.push({
        name: nodeInfo.name,
        type: 'waypoint',
        distance: distance,
        coordinates: nodeInfo.coordinates
      });
    }
    
    // 添加终点
    nodes.push({
      name: destination,
      type: 'destination',
      distance: totalDistance
    });
    
    return nodes;
  }

  /**
   * 根据总距离计算分段数量
   * @param {number} totalDistance - 总距离（米）
   * @returns {number} 分段数量
   */
  calculateSegmentCount(totalDistance) {
    // 距离小于50公里，2个节点（起点和终点）
    if (totalDistance < 50000) {
      return 2;
    }
    // 距离50-100公里，3个节点
    else if (totalDistance < 100000) {
      return 3;
    }
    // 距离100-200公里，4个节点
    else if (totalDistance < 200000) {
      return 4;
    }
    // 距离200-500公里，5个节点
    else if (totalDistance < 500000) {
      return 5;
    }
    // 距离500公里以上，6个节点
    else {
      return 6;
    }
  }

  /**
   * 根据距离从路线步骤中获取最近的节点信息
   * @param {Array} steps - 路线步骤
   * @param {number} targetDistance - 目标距离（米）
   * @returns {Object} 节点信息 {name, coordinates}
   */
  getNearestNodeFromSteps(steps, targetDistance) {
    let currentDistance = 0;
    
    for (const step of steps) {
      const stepDistance = parseInt(step.distance);
      currentDistance += stepDistance;
      
      if (currentDistance >= targetDistance) {
        // 从步骤描述中提取地点名称
        const locationName = this.extractCityFromStepDescription(step.instruction);
        
        // 尝试从步骤中获取坐标信息
        let coordinates = null;
        if (step.tolls && step.tolls.length > 0) {
          // 如果有收费站信息，使用第一个收费站的坐标
          coordinates = step.tolls[0].location;
        } else if (step.polyline) {
          // 如果有路径点信息，使用路径点的坐标
          const points = step.polyline.split(';');
          if (points.length > 0) {
            coordinates = points[Math.floor(points.length / 2)]; // 使用路径中点
          }
        }
        
        return {
          name: locationName || '途经点',
          coordinates: coordinates
        };
      }
    }
    
    return {
      name: '途经点',
      coordinates: null
    };
  }

  /**
   * 从步骤描述中提取城市名称
   * @param {string} instruction - 步骤描述
   * @returns {string} 城市名称
   */
  extractCityFromStepDescription(instruction) {
    // 常见的城市标识词
    const cityKeywords = ['市', '区', '县', '镇', '村'];
    
    for (const keyword of cityKeywords) {
      const index = instruction.indexOf(keyword);
      if (index !== -1) {
        // 向前查找城市名称（通常城市名称在关键词前）
        let startIndex = index - 1;
        while (startIndex >= 0 && instruction[startIndex] !== ' ' && instruction[startIndex] !== '，' && instruction[startIndex] !== '、') {
          startIndex--;
        }
        return instruction.substring(startIndex + 1, index + 1);
      }
    }
    
    // 如果没有找到城市关键词，尝试提取其他地点信息
    const commonPatterns = [
      /([^，。\s]+(?:高速|国道|省道|县道|乡道))/,
      /([^，。\s]+(?:路|街|巷|桥|隧道))/,
      /([^，。\s]+(?:广场|公园|商场|医院|学校))/
    ];
    
    for (const pattern of commonPatterns) {
      const match = instruction.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '途经点';
  }

  /**
   * 根据经纬度坐标获取实时天气信息
   * @param {string} location - 经纬度坐标 (格式: "经度,纬度")
   * @returns {Promise<Object>} 实时天气信息
   */
  async getLiveWeatherByLocation(location) {
    try {
      // 添加延迟避免API调用频率限制
      await this.delay(200);
      
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


}

module.exports = WeatherService; 