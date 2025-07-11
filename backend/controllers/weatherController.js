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
}

module.exports = WeatherController; 