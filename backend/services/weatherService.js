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

  /**
   * 处理路线规划请求
   * @param {Object} routeData - 路线规划数据
   * @param {string} routeData.origin - 起点
   * @param {string} routeData.destination - 终点
   * @param {string} routeData.departTime - 出发时间
   * @param {string} routeData.vehicleType - 车辆类型
   * @returns {Promise<Object>} 处理结果
   */
  async handleRoutePlanning(routeData) {
    try {
      const { origin, destination, departTime, vehicleType } = routeData;
      
      // 验证必要参数
      if (!origin || !destination) {
        console.log('❌ 数据验证失败: 起点或终点为空');
        return {
          success: false,
          error: '起点和终点不能为空'
        };
      }

      // 获取起点和终点的天气信息
      const originWeather = await this.getWeatherByCity(origin);
      const destinationWeather = await this.getWeatherByCity(destination);
      // 路线规划并获取沿途天气
      const routeWithWeather = await this.getRouteWithWeather(origin, destination);

      // 构建响应数据
      const response = {
        success: true,
        message: '路线规划数据接收成功',
        data: {
          routeInfo: {
            origin,
            destination,
            departTime: departTime || new Date().toISOString(),
            vehicleType: vehicleType || '小客车'
          },
          weatherInfo: {
            origin: originWeather,
            destination: destinationWeather
          },
          routePlanning: routeWithWeather
        },
        timestamp: new Date().toISOString()
      };

      console.log('路线规划处理完成:', response);
      return response;

    } catch (error) {
      console.error('路线规划处理失败:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取路线风险分析数据
   * @param {Object} routeData - 路线数据（从handleRoutePlanning的结果中获取）
   * @returns {Promise<Object>} 风险分析结果
   */
  async getRouteRiskAnalysis(routeData) {
    try {
      console.log('开始分析路线风险...');
      // 从路线规划数据中提取节点
      const routePlanning = routeData.data?.routePlanning;
      let nodes = [];
      if (routePlanning && routePlanning.success && routePlanning.routes && routePlanning.routes.length > 0) {
        nodes = routePlanning.routes[0].nodes || [];
      }
      // 并发处理每个节点的风险预测
      const routeWithRisk = await Promise.all(nodes.map(async (node) => {
        if (!node.name) {
          return {
            lng: node.coordinates ? parseFloat(node.coordinates.split(',')[0]) : null,
            lat: node.coordinates ? parseFloat(node.coordinates.split(',')[1]) : null,
            risk: null,
            location: null
          };
        }
        const predictRes = await this.predictAccidentRiskByLocation(node.name);
        const risk = predictRes.success ? predictRes.probability : null;
        return {
          lng: node.coordinates ? parseFloat(node.coordinates.split(',')[0]) : null,
          lat: node.coordinates ? parseFloat(node.coordinates.split(',')[1]) : null,
          risk: risk !== null ? parseFloat(risk.toFixed(2)) : null,
          location: node.name
        };
      }));
      // 识别高风险点（风险值 > 0.7）
      const highRiskThreshold = 0.7;
      const highRiskPoints = routeWithRisk
        .filter(point => point.risk !== null && point.risk > highRiskThreshold)
        .map(point => ({
          lng: point.lng,
          lat: point.lat,
          risk: point.risk,
          description: this.generateRiskDescription(point.risk),
          suggestion: this.generateRiskSuggestion(point.risk),
          location: point.location
        }));
      // 计算统计信息
      const validRisks = routeWithRisk.filter(p => p.risk !== null).map(p => p.risk);
      const maxRisk = validRisks.length ? Math.max(...validRisks) : 0;
      const avgRisk = validRisks.length ? validRisks.reduce((sum, risk) => sum + risk, 0) / validRisks.length : 0;
      // 生成总结信息
      const summary = {
        start: routeData.data?.routeInfo?.origin || '未知起点',
        end: routeData.data?.routeInfo?.destination || '未知终点',
        maxRisk: parseFloat(maxRisk.toFixed(2)),
        avgRisk: parseFloat(avgRisk.toFixed(2)),
        suggestion: this.generateOverallSuggestion(avgRisk, maxRisk, routeData.data?.routeInfo?.vehicleType)
      };
      const result = {
        route: routeWithRisk,
        highRiskPoints,
        summary
      };
      console.log('路线风险分析完成:', {
        totalPoints: routeWithRisk.length,
        highRiskPointsCount: highRiskPoints.length,
        maxRisk,
        avgRisk
      });
      return result;
    } catch (error) {
      console.error('路线风险分析失败:', error.message);
      return {
        route: [],
        highRiskPoints: [],
        summary: {
          start: '分析失败',
          end: '分析失败',
          maxRisk: 0,
          avgRisk: 0,
          suggestion: '风险分析失败，请稍后重试'
        }
      };
    }
  }
  
  /**
   * 从路线规划数据生成路径点
   * @param {Object} routeData - 路线规划数据
   * @returns {Array} 路径点数组
   */
  generateRoutePoints(routeData) {
    const points = [];
    
    try {
      // 从路线规划数据中提取路径信息
      const routePlanning = routeData.data?.routePlanning;
      if (routePlanning && routePlanning.success && routePlanning.routes && routePlanning.routes.length > 0) {
        const route = routePlanning.routes[0]; // 取第一条路线
        
        // 从节点信息生成路径点
        if (route.nodes && route.nodes.length > 0) {
          route.nodes.forEach((node, index) => {
            // 为每个节点生成多个路径点
            const baseLng = 116.391 + (index * 0.001); // 模拟经度变化
            const baseLat = 39.907 + (index * 0.001); // 模拟纬度变化
            
            // 每个节点生成3-5个路径点
            const pointCount = Math.floor(Math.random() * 3) + 3;
            for (let i = 0; i < pointCount; i++) {
              points.push({
                lng: baseLng + (i * 0.0001) + (Math.random() * 0.0001),
                lat: baseLat + (i * 0.0001) + (Math.random() * 0.0001)
              });
            }
          });
        }
      }
      
      // 如果没有有效的路线数据，生成默认路径点
      if (points.length === 0) {
        const defaultPoints = [
          { lng: 116.391, lat: 39.907 },
          { lng: 116.392, lat: 39.908 },
          { lng: 116.393, lat: 39.909 },
          { lng: 116.394, lat: 39.910 },
          { lng: 116.395, lat: 39.911 },
          { lng: 116.396, lat: 39.912 },
          { lng: 116.397, lat: 39.913 },
          { lng: 116.398, lat: 39.914 },
          { lng: 116.399, lat: 39.915 },
          { lng: 116.400, lat: 39.916 }
        ];
        return defaultPoints;
      }
      
      return points;
      
    } catch (error) {
      console.error('生成路径点失败:', error);
      // 返回默认路径点
      return [
        { lng: 116.391, lat: 39.907 },
        { lng: 116.392, lat: 39.908 },
        { lng: 116.393, lat: 39.909 }
      ];
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
   * 获取路线规划及风险预测信息
   * @param {string} start - 起点城市
   * @param {string} end - 终点城市
   * @returns {Promise<Object>} 路线预测结果
   */
  async getRoutePrediction(start, end) {
    try {
      console.log('开始路线预测分析:', { start, end });
      
      // 验证参数
      if (!start || !end) {
        return {
          success: false,
          error: '起点和终点不能为空'
        };
      }

      // 获取路线规划
      const routeWithWeather = await this.getRouteWithWeather(start, end);
      
      if (!routeWithWeather.success) {
        return {
          success: false,
          error: routeWithWeather.error
        };
      }

      const routes = [];
      
      // 处理每条路线
      for (let i = 0; i < Math.min(routeWithWeather.routes.length, 3); i++) {
        const route = routeWithWeather.routes[i];
        const cities = [];
        
        // 处理路线中的城市节点
        if (route.nodes && route.nodes.length > 0) {
          for (const node of route.nodes) {
            try {
              // 获取城市天气信息
              const weatherInfo = await this.getLiveWeatherByCity(node.name);
              
              if (weatherInfo.success) {
                cities.push({
                  name: node.name,
                  weather: weatherInfo.weather.weather,
                  temperature: parseInt(weatherInfo.weather.temperature),
                  humidity: parseInt(weatherInfo.weather.humidity),
                  windSpeed: this.convertWindPowerToSpeed(weatherInfo.weather.windPower)
                });
              } else {
                // 如果获取天气失败，使用默认数据
                cities.push({
                  name: node.name,
                  weather: '晴',
                  temperature: 25,
                  humidity: 60,
                  windSpeed: 2
                });
              }
              
              // 添加延迟避免API调用频率限制
              await this.delay(100);
              
            } catch (error) {
              console.error(`获取城市 ${node.name} 天气信息失败:`, error);
              // 使用默认数据
              cities.push({
                name: node.name,
                weather: '晴',
                temperature: 25,
                humidity: 60,
                windSpeed: 2
              });
            }
          }
        }
        
        // 计算路线风险等级
        const riskLevel = this.calculateRouteRiskLevel(cities);
        
        routes.push({
          riskLevel,
          cities
        });
      }
      
      const result = {
        success: true,
        routes
      };
      
      console.log('路线预测分析完成:', {
        routeCount: routes.length,
        totalCities: routes.reduce((sum, route) => sum + route.cities.length, 0)
      });
      
      return result;
      
    } catch (error) {
      console.error('路线预测分析失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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
   * @param {string} location 地点名（如城市、区、路段等）
   * @param {Date|string} [time] 可选，指定时间（Date对象或可被Date解析的字符串）
   * @returns {Promise<Object>} { success, location, probability, features }
   */
  async predictAccidentRiskByLocation(location, time) {
    try {
      // 1. 获取地理编码（经纬度）
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
      const adcode = geocodeResponse.data.geocodes[0].adcode;
      const lnglat = geocodeResponse.data.geocodes[0].location; // "经度,纬度"

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