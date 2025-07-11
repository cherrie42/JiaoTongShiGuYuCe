const WeatherService = require('../services/weatherService');

class WeatherController {
  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * 根据城市名称获取天气信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getWeatherByCity(req, res) {
    try {
      const { city } = req.query;

      // 验证参数
      if (!city) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：city（城市名称）'
        });
      }

      // 获取天气信息
      const weatherData = await this.weatherService.getWeatherByCity(city);

      if (!weatherData.success) {
        return res.status(500).json({
          success: false,
          error: weatherData.error
        });
      }

      res.json({
        success: true,
        data: weatherData
      });

    } catch (error) {
      console.error('获取天气信息失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    }
  }

  /**
   * 获取实时天气信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getLiveWeatherByCity(req, res) {
    try {
      const { city } = req.query;

      // 验证参数
      if (!city) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：city（城市名称）'
        });
      }

      // 获取实时天气信息
      const weatherData = await this.weatherService.getLiveWeatherByCity(city);

      if (!weatherData.success) {
        return res.status(500).json({
          success: false,
          error: weatherData.error
        });
      }

      res.json({
        success: true,
        data: weatherData
      });

    } catch (error) {
      console.error('获取实时天气信息失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    }
  }

  /**
   * 路线规划并获取沿途天气信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getRouteWithWeather(req, res) {
    try {
      const { origin, destination, strategy = 'driving' } = req.query;

      // 验证参数
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：origin（起点城市）和 destination（终点城市）'
        });
      }

      // 获取路线规划和天气信息
      const routeData = await this.weatherService.getRouteWithWeather(origin, destination, strategy);

      if (!routeData.success) {
        return res.status(500).json({
          success: false,
          error: routeData.error
        });
      }

      res.json({
        success: true,
        data: routeData
      });

    } catch (error) {
      console.error('路线规划失败:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误'
      });
    }
  }

  /**
   * 处理路线规划请求
   * @param {Object} routeData - 路线规划数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleRoutePlanning(routeData) {
    try {
      return await this.weatherService.handleRoutePlanning(routeData);
    } catch (error) {
      console.error('路线规划处理失败:', error);
      return {
        success: false,
        error: '路线规划处理失败',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取路线风险分析数据
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getRouteRiskAnalysis(req, res) {
    try {
      console.log('收到路线风险分析请求');
      
      // 这里需要从某个地方获取之前规划的路线数据
      // 在实际应用中，可能需要从数据库或缓存中获取
      // 现在我们先模拟一个路线规划数据
      const mockRouteData = {
        data: {
          routeInfo: {
            origin: '北京',
            destination: '上海',
            departTime: new Date().toISOString(),
            vehicleType: '小客车'
          },
          routePlanning: {
            success: true,
            routes: [{
              nodes: [
                { name: '北京', type: 'origin' },
                { name: '天津', type: 'waypoint' },
                { name: '济南', type: 'waypoint' },
                { name: '南京', type: 'waypoint' },
                { name: '上海', type: 'destination' }
              ]
            }]
          }
        }
      };
      
      // 获取风险分析数据
      const riskAnalysis = await this.weatherService.getRouteRiskAnalysis(mockRouteData);
      
      res.json(riskAnalysis);
      
    } catch (error) {
      console.error('路线风险分析失败:', error);
      res.status(500).json({
        route: [],
        highRiskPoints: [],
        summary: {
          start: '分析失败',
          end: '分析失败',
          maxRisk: 0,
          avgRisk: 0,
          suggestion: '风险分析失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 获取路线规划及风险预测信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getRoutePrediction(req, res) {
    try {
      const { start, end } = req.query;
      
      console.log('收到路线预测请求:', { start, end });
      
      // 验证参数
      if (!start || !end) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：start（起点）和 end（终点）'
        });
      }
      
      // 获取路线预测数据
      const prediction = await this.weatherService.getRoutePrediction(start, end);
      
      if (!prediction.success) {
        return res.status(500).json({
          success: false,
          error: prediction.error
        });
      }
      
      res.json(prediction);
      
    } catch (error) {
      console.error('路线预测失败:', error);
      res.status(500).json({
        success: false,
        error: '路线预测失败，请稍后重试'
      });
    }
  }
}

module.exports = WeatherController; 