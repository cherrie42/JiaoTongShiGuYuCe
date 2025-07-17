const axios = require('axios');
const fetch = require('node-fetch');

/**
 * API密钥池管理类
 */
class KeyPool {
  constructor(keys, minInterval) {
    this.keys = keys.map(key => ({ key, lastCall: 0 }));
    this.minInterval = minInterval;
    // console.log(`初始化API密钥池，共 ${keys.length} 个密钥`);
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
          // console.log(`[KeyPool] 分配key: ${keyInfo.key}`);
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
      // console.log(`密钥被限流，禁用5秒: ${key.substring(0, 8)}...`);
    }
  }
}

// OSM道路类型与模型字段映射
const OSM_HIGHWAY_TO_MODEL = {
  motorway: 'Expressway',
  trunk: 'Expressway',
  primary: 'Main Road',
  secondary: 'Main Road',
  tertiary: 'Main Road',
  residential: 'Local Road',
  service: 'Service Road',
  unclassified: 'Local Road',
  living_street: 'Local Road',
  // 其他类型可补充
};

// 高德道路等级到模型字段映射
const AMAP_ROADLEVEL_TO_MODEL = {
  '快速路': 'Expressway',
  '主干路': 'Main Road',
  '次干路': 'Main Road',
  '支路': 'Local Road',
  '高速路': 'Expressway',
  '城市高速路': 'Expressway',
  '国道': 'Expressway',
  '省道': 'Main Road',
  '县道': 'Local Road',
  '乡村道路': 'Local Road',
  '其他道路': 'Service Road',
};

/**
 * 高德逆地理编码获取道路类型和信号灯（3秒超时）
 */
async function getRoadInfoFromAmap(lat, lng, amapKey, weatherServiceInstance) {
  const start = Date.now();
  const timeoutMs = 3000;
  // console.log(`[高德道路] 使用key: ${amapKey} 查询 lat:${lat}, lng:${lng}`);
  function timeoutPromise() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const duration = Date.now() - start;
        if (process.env.DEBUG) {
          console.warn(`【高德道路超时保护】lat:${lat}, lng:${lng}, duration:${duration}ms`);
        }
        resolve({ roadType: null, hasSignal: false });
      }, timeoutMs);
    });
  }
  const result = await Promise.race([
    (async () => {
      try {
        // 复用WeatherService实例的regeoCache
        const data = await weatherServiceInstance.getRegeo(lat, lng, 'all');
        let roadType = null;
        let hasSignal = false;
        if (data.status === '1' && data.regeocode) {
          // 取最近道路等级
          const roads = data.regeocode.roads;
          if (roads && roads.length > 0) {
            const level = roads[0].level || roads[0].name || '';
            roadType = AMAP_ROADLEVEL_TO_MODEL[level] || null;
          }
          // 信号灯判断：取最近路口的has_traffic_light字段
          const roadinters = data.regeocode.roadinters;
          if (roadinters && roadinters.length > 0) {
            hasSignal = roadinters[0].has_traffic_light === true || roadinters[0].has_traffic_light === 'true';
          }
        }
        const duration = Date.now() - start;
        if (process.env.DEBUG) {
          console.log(`【高德道路查询用时】lat:${lat}, lng:${lng}, roadType:${roadType}, hasSignal:${hasSignal}, duration:${duration}ms`);
        }
        return { roadType, hasSignal };
      } catch (e) {
        return { roadType: null, hasSignal: false };
      }
    })(),
    timeoutPromise()
  ]);
  return result;
}

// 获取道路类型和信号灯信息（带用时日志）
async function getRoadInfoFromOSM(lat, lng) {
  const start = Date.now();
  let roadType = null;
  let hasSignal = false;
  // 超时保护：3秒
  const timeoutMs = 3000;
  function timeoutPromise() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const duration = Date.now() - start;
        if (process.env.DEBUG) {
          console.warn(`【OSM超时保护】lat:${lat}, lng:${lng}, duration:${duration}ms`);
        }
        resolve({ roadType: null, hasSignal: false });
      }, timeoutMs);
    });
  }
  // 并行执行查询和超时
  const result = await Promise.race([
    (async () => {
      try {
        const url = `https://overpass-api.de/api/interpreter?data=[out:json];way(around:20,${lat},${lng})[highway];out;`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.elements && data.elements.length > 0) {
          roadType = data.elements[0].tags.highway;
        }
      } catch (e) { /* 网络异常忽略 */ }
      try {
        const url = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:20,${lat},${lng})[highway=traffic_signals];out;`;
        const res = await fetch(url);
        const data = await res.json();
        hasSignal = data.elements && data.elements.length > 0;
      } catch (e) { /* 网络异常忽略 */ }
      const duration = Date.now() - start;
      if (process.env.DEBUG) {
        console.log(`【OSM查询用时】lat:${lat}, lng:${lng}, roadType:${roadType}, hasSignal:${hasSignal}, duration:${duration}ms`);
      }
      return { roadType, hasSignal };
    })(),
    timeoutPromise()
  ]);
  return result;
}

function roundCoord(val) {
  return Math.round(val * 1000) / 1000;
}

class CorePredictionService {
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

      '83803d5058c218eb99f8e3722804fec5',
      '257698e63c1c4a499122fe9536a75dce',
      'eb77df64ad363d3d6f6ba6000d14f827',
      '2b8117325c4bd16f22cd1b766303414e',
    ];

    // 初始化API密钥池
    this.keyPool = new KeyPool(this.apiKeys, 200); // 每个key间隔200ms

    this.baseUrl = 'https://restapi.amap.com/v3';

    // 缓存机制
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10分钟缓存

    // 错误计数和重试机制
    this.errorCounts = new Map();
    this.maxRetries = 20;
    this.nodeRiskCache = new Map(); // 节点风险记忆化缓存
    this.roadInfoCache = new Map(); // 全局道路信息缓存
    this.regeoCache = new Map(); // 全局高德逆地理编码Promise级缓存
    // 省份概率表（小数形式）
    this.provinceProbMap = {
      '北京市': 0.30,
      '天津市': 0.46,
      '河北省': 0.05,
      '山西省': 0.23,
      '内蒙古自治区': 0.15,
      '辽宁省': 0.11,
      '吉林省': 0.29,
      '黑龙江省': 0.11,
      '上海市': 0.05,
      '江苏省': 0.12,
      '浙江省': 0.16,
      '安徽省': 0.14,
      '福建省': 0.18,
      '江西省': 0.09,
      '山东省': 0.12,
      '河南省': 0.24,
      '湖北省': 0.52,
      '湖南省': 0.18,
      '广东省': 0.20,
      '广西壮族自治区': 0.32,
      '海南省': 0.25,
      '重庆市': 0.13,
      '四川省': 0.09,
      '贵州省': 0.38,
      '云南省': 0.14,
      '西藏自治区': 0.14,
      '陕西省': 0.11,
      '甘肃省': 0.12,
      '青海省': 0.25,
      '宁夏回族自治区': 0.22,
      '新疆维吾尔自治区': 0.18
    };
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
    if (process.env.DEBUG) {
      console.log('检测到API限流，标记密钥并继续...');
    }
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
   * 全局高德逆地理编码Promise级缓存，extensions可选
   */
  async getRegeo(lat, lng, extensions = 'all') {
    const key = `${roundCoord(lat)},${roundCoord(lng)}_${extensions}`;
    if (this.regeoCache.has(key)) {
      return await this.regeoCache.get(key);
    }
    const promise = (async () => {
      const apiKey = await this.getAvailableApiKey();
      const response = await axios.get(`${this.baseUrl}/geocode/regeo`, {
        params: {
          key: apiKey,
          location: `${lng},${lat}`,
          output: 'json',
          extensions
        },
        timeout: 10000
      });
      return response.data;
    })();
    this.regeoCache.set(key, promise);
    return await promise;
  }

  /**
   * 批量获取天气信息
   * @param {Array} adcodes - adcode数组
   * @returns {Promise<Array>} 天气信息数组
   */
  async getWeatherInfoBatch(adcodes) {
    // 并发获取天气信息，提升速度
    const weatherPromises = adcodes.map(adcode => this.getWeatherInfo(adcode));
    return await Promise.all(weatherPromises);
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
        // console.error(errorMsg);

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
  * 获取完整地名（通过逆地理编码API，拼接省市区/县/乡镇/街道）
  */
  async getPlaceName(lat, lng) {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const data = await this.getRegeo(lat, lng, 'base');
        if (
          data.status === '1' &&
          data.regeocode &&
          data.regeocode.addressComponent
        ) {
          const ac = data.regeocode.addressComponent;
          if (process.env.DEBUG) {
            console.log('[地名addressComponent]', ac);
          }
          // 智能降级拼接
          let placeName = '';
          const street = (ac.streetNumber && ac.streetNumber.street) || '';
          if (street) {
            placeName = [ac.province, ac.city, ac.district, ac.township, street].filter(Boolean).join('');
          } else if (ac.township) {
            placeName = [ac.province, ac.city, ac.district, ac.township].filter(Boolean).join('');
          } else if (ac.district) {
            placeName = [ac.province, ac.city, ac.district].filter(Boolean).join('');
          } else if (ac.city) {
            placeName = [ac.province, ac.city].filter(Boolean).join('');
          } else {
            placeName = ac.province || '未知';
          }
          return {
            name: placeName,
            placeError: null
          };
        } else {
          const error = `逆地理编码API返回异常 - 状态: ${data.status}, 信息: ${data.info}, 数据: ${JSON.stringify(data)}`;
          if (this.isRateLimited(data)) {
            await this.handleRateLimit();
            retries++;
            continue;
          }
          return {
            name: '未知',
            placeError: error
          };
        }
      } catch (e) {
        // console.error('逆地理编码API请求失败:', e.message);
        if (process.env.DEBUG) {
          console.error('逆地理编码API请求失败:', e.message);
        }
        retries++;
      }
    }
    return {
      name: '未知',
      placeError: '逆地理编码API多次请求失败'
    };
  }

  /**
   * 根据风险值生成风险描述
   * @param {number} risk - 风险值
   * @returns {string} 风险描述
   */
  generateRiskDescription(risk) {
    if (risk > 0.4) {
      return '极高风险路段 - 急转弯 + 恶劣天气 + 路况极差';
    } else if (risk > 0.33) {
      return '高风险路段 - 急转弯 + 路况不佳 + 视线不良';
    } else if (risk > 0.23) {
      return '中高风险路段 - 弯道较多 + 路面湿滑';
    } else if (risk > 0.2) {
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
    if (risk > 0.4) {
      return '建议绕行或选择其他路线，必须通行时请极度谨慎';
    } else if (risk > 0.3) {
      return '建议减速慢行，保持安全车距，注意观察路况';
    } else if (risk > 0.25) {
      return '建议适当减速，注意路面湿滑情况';
    } else if (risk > 0.2) {
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

    if (maxRisk > 0.4) {
      suggestion += '路线存在高风险路段，';
    } else if (avgRisk > 0.33) {
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
   * @param {number} avgRisk - 路线平均风险值
   * @returns {string} 风险等级 (低风险/中风险/高风险)
   */
  calculateRouteRiskLevel(avgRisk) {
    if (typeof avgRisk !== 'number' || isNaN(avgRisk)) {
      return '低风险';
    }
    if (avgRisk > 0.33) {
      return '高风险';
    } else if (avgRisk > 0.23) {
      return '中风险';
    } else {
      return '低风险';
    }
  }

  /**
   * 输入adcode，预测该地点事故发生概率（可选指定时间，支持传入天气信息）
   * @param {string} adcode 地区adcode
   * @param {Date|string} [time] 可选，指定时间（Date对象或可被Date解析的字符串）
   * @param {object} [weatherInfo] 可选，已查到的天气信息
   * @returns {Promise<Object>} { success, adcode, probability, features }
   */
  async predictAccidentRiskByAdcode(adcode, time, weatherInfo, roadInfo = {}) {
    try {
      let weather = weatherInfo;
      if (!weather) {
        // 没有传天气才查API
        await this.throttleApiCall();
        const apiKey = await this.getAvailableApiKey();
        const weatherResponse = await axios.get(`${this.baseUrl}/weather/weatherInfo`, {
          params: { key: apiKey, city: adcode, extensions: 'base', output: 'json' },
          timeout: 10000
        });
        if (weatherResponse.data.status !== '1' ||
          !weatherResponse.data.lives ||
          !weatherResponse.data.lives.length) {
          throw new Error('天气获取失败');
        }
        weather = weatherResponse.data.lives[0];
      }
      // 2. 自动映射特征字段
      let dateObj;
      if (time) {
        dateObj = new Date(time);
        if (isNaN(dateObj.getTime())) throw new Error('时间格式不正确');
      } else {
        dateObj = new Date();
      }
      // 字段映射
      const featureData = {
        crash_date: dateObj.toISOString().slice(0, 10), // 日期 yyyy-mm-dd
        traffic_control_device: roadInfo.traffic_control_device || 'NO CONTROLS',
        weather_condition: this.mapWeatherToCondition(weather.weather),
        lighting_condition: this.mapLightingCondition(dateObj.getHours(), weather.weather),
        trafficway_type: roadInfo.trafficway_type || 'NOT DIVIDED',
        alignment: roadInfo.alignment || 'STRAIGHT AND LEVEL',
        roadway_surface_cond: this.mapRoadSurfaceCond(weather.weather),
        road_defect: 'NO DEFECTS', // 默认值
        intersection_related_i: 'N', // 默认值
        crash_hour: dateObj.getHours(),
        crash_day_of_week: dateObj.getDay() === 0 ? 7 : dateObj.getDay(), // 周日为7
        crash_month: dateObj.getMonth() + 1
      };
      if (process.env.DEBUG) {
        console.log('【模型输入featureData】', featureData);
      }
      // 3. 调用本地事故预测API
      const predictionResponse = await axios.post('http://localhost:3001/api/predict', featureData);
      const probability = predictionResponse.data.probability;
      // 兼容新结构
      const accident_prob = probability.accident_prob;
      const crash_type = probability.crash_type;
      return {
        success: true,
        adcode,
        time: dateObj.toISOString(),
        probability: accident_prob,
        crashType: crash_type,
        features: featureData
      };
    } catch (error) {
      // console.error('事故概率预测失败:', error.message);
      if (error.response && error.response.data &&
        error.response.data.infocode === '10021') {
        // console.warn('检测到API限流，建议增加API密钥或调整调用频率');
        if (process.env.DEBUG) {
          console.warn('检测到API限流，建议增加API密钥或调整调用频率');
        }
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 严格映射天气到模型支持的weather_condition
  mapWeatherToCondition(weather) {
    if (!weather) return 'CLEAR';
    if (weather.includes('雨')) return 'RAIN';
    if (weather.includes('雪')) return 'SNOW';
    if (weather.includes('雾') || weather.includes('霾')) return 'FOG/SMOKE/HAZE';
    if (weather.includes('阴')) return 'CLOUDY/OVERCAST';
    if (weather.includes('沙') || weather.includes('尘')) return 'BLOWING SAND, SOIL, DIRT';
    if (weather.includes('冻雨')) return 'FREEZING RAIN/DRIZZLE';
    if (weather.includes('冰雹')) return 'SLEET/HAIL';
    if (weather.includes('风')) return 'SEVERE CROSS WIND GATE';
    if (weather.includes('晴')) return 'CLEAR';
    return 'OTHER';
  }

  // 严格映射照明条件到模型支持的lighting_condition
  mapLightingCondition(hour, weather) {
    // 夜晚
    if (hour < 6 || hour >= 20) {
      // 大雾、暴雨、雪夜等极端天气夜间可视性更差
      if (weather && (weather.includes('雾') || weather.includes('霾') || weather.includes('暴雨') || weather.includes('雪'))) {
        return 'DARKNESS';
      }
      return 'DARKNESS, LIGHTED ROAD';
    }
    // 清晨
    if (hour >= 6 && hour < 7) {
      if (weather && (weather.includes('雾') || weather.includes('霾'))) return 'UNKNOWN';
      return 'DAWN';
    }
    // 白天
    if (hour >= 7 && hour < 18) {
      if (weather && (weather.includes('雾') || weather.includes('霾'))) return 'UNKNOWN';
      return 'DAYLIGHT';
    }
    // 傍晚
    if (hour >= 18 && hour < 20) {
      if (weather && (weather.includes('雾') || weather.includes('霾'))) return 'UNKNOWN';
      return 'DUSK';
    }
    return 'UNKNOWN';
  }

  /**
   * 根据天气映射路面状况
   */
  mapRoadSurfaceCond(weather) {
    if (!weather) return 'DRY';
    if (weather.includes('雨')) return 'WET';
    if (weather.includes('雪')) return 'SNOW OR SLUSH';
    if (weather.includes('冰')) return 'ICE';
    if (weather.includes('泥') || weather.includes('沙')) return 'SAND, MUD, DIRT';
    return 'DRY';
  }

  // 风险值根据天气详细数值调整，偏离理想值越小减得越多
  adjustRiskByWeather(risk, weatherInfo) {
    // 理想值
    const idealTemp = 22.5, tempRange = 2.5; // 20~25
    const idealHumidity = 50, humidityRange = 10; // 40~60
    const idealWind = 1, windRange = 1; // 0~2

    // 归一化偏离度（0~1，0为理想，1为极端）
    let tempDev = Math.abs((weatherInfo.temperature ?? idealTemp) - idealTemp) / tempRange;
    tempDev = Math.min(tempDev, 1);

    let humidityDev = Math.abs((weatherInfo.humidity ?? idealHumidity) - idealHumidity) / humidityRange;
    humidityDev = Math.min(humidityDev, 1);

    let windDev = Math.abs((weatherInfo.windSpeed ?? idealWind) - idealWind) / windRange;
    windDev = Math.min(windDev, 1);

    // 综合偏离度，越大越极端
    const dev = (tempDev + humidityDev + windDev) / 3;

    // 最大可减去risk的比例
    const maxReduce = 0.3; // 最多减30%
    const reduceRatio = (1 - dev) * maxReduce; // 偏离越小，减得越多

    return risk * (1 - reduceRatio);
  }

  /**
   * 省级或市级adcode降级为区县级
   */
  async downgradeAdcode(lat, lng) {
    try {
      await this.throttleApiCall();
      const data = await this.getRegeo(lat, lng, 'base');
      if (data.status === '1' &&
        data.regeocode &&
        data.regeocode.addressComponent) {
        const addressComponent = data.regeocode.addressComponent;
        // 优先使用区县adcode，如果没有则使用市级
        const newAdcode = addressComponent.adcode || addressComponent.citycode;
        if (newAdcode) {
          if (process.env.DEBUG) {
            console.log(`adcode降级成功: ${lat},${lng} -> ${newAdcode}`);
          }
          return newAdcode;
        }
      }
    } catch (error) {
      // console.warn(`adcode降级失败: ${lat},${lng}`, error.message);
      if (process.env.DEBUG) {
        console.warn(`adcode降级失败: ${lat},${lng}`, error.message);
      }
    }
    return null;
  }

  /**
   * 批量处理节点数据
   * @param {Array} nodes - 节点数组
   * @param {string} departTime - 出发时间
   * @returns {Promise<Array>} 处理后的节点数组
   */
  async processNodesBatch(nodes, departTime) {
    // 1. 计算每个节点的曲率（夹角）
    function calcAngle(p1, p2, p3) {
      const x1 = p1.lng, y1 = p1.lat;
      const x2 = p2.lng, y2 = p2.lat;
      const x3 = p3.lng, y3 = p3.lat;
      const v1 = [x1 - x2, y1 - y2];
      const v2 = [x3 - x2, y3 - y2];
      const dot = v1[0]*v2[0] + v1[1]*v2[1];
      const norm1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
      const norm2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1]);
      if (norm1 === 0 || norm2 === 0) return 180;
      let cosTheta = dot / (norm1 * norm2);
      cosTheta = Math.max(-1, Math.min(1, cosTheta));
      return Math.acos(cosTheta) * 180 / Math.PI;
    }
    // 2. 处理节点
    const processedNodes = [];
    const processedAdcodes = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let { adcode, lat, lng } = node;
      if (this.isProvinceAdcode(adcode) || this.isCityAdcode(adcode)) {
        const newAdcode = await this.downgradeAdcode(lat, lng);
        if (newAdcode) {
          adcode = newAdcode;
        }
      }
      const key = `${roundCoord(lat)},${roundCoord(lng)}`;
      // Promise级缓存，优先OSM，其次高德
      if (!this.roadInfoCache.has(key)) {
        const promise = (async () => {
          // OSM和高德并行，谁快用谁
          const amapKey = await this.getAvailableApiKey();
          const weatherServiceInstance = this;
          const result = await Promise.race([
            getRoadInfoFromOSM(lat, lng),
            getRoadInfoFromAmap(lat, lng, amapKey, weatherServiceInstance)
          ]);
          return result;
        })().catch(() => ({ roadType: null, hasSignal: false }));
        this.roadInfoCache.set(key, promise);
      }
      processedAdcodes.push({ ...node, adcode, _roadKey: key });
    }
    for (let i = 0; i < processedAdcodes.length; i++) {
      const node = processedAdcodes[i];
      // 计算曲率（夹角）并赋值alignment
      let angle = null;
      let alignment = 'STRAIGHT AND LEVEL';
      if (node.neighbors && node.neighbors.length >= 2) {
        const allAngles = [];
        for (let j = 0; j < node.neighbors.length; j++) {
          for (let k = j + 1; k < node.neighbors.length; k++) {
            const a = calcAngle(node.neighbors[j], node, node.neighbors[k]);
            allAngles.push(Number(a.toFixed(2)));
          }
        }
        // 取中位数角度
        const validAngles = allAngles.filter(x => typeof x === 'number' && !isNaN(x));
        let medianAngle = null;
        if (validAngles.length > 0) {
          validAngles.sort((a, b) => a - b);
          const mid = Math.floor(validAngles.length / 2);
          medianAngle = validAngles.length % 2 === 0 ? (validAngles[mid - 1] + validAngles[mid]) / 2 : validAngles[mid];
        }
        angle = medianAngle;
        // 输出所有夹角分布
        if (process.env.DEBUG) {
          console.log('【夹角分布】', {
            lat: node.lat,
            lng: node.lng,
            angles: allAngles
          });
        }
        // 降低阈值
        if (angle !== null && angle < 30) alignment = 'CURVE, LEVEL';
        else if (angle !== null && angle < 90) alignment = 'CURVE ON GRADE';
        else alignment = 'STRAIGHT AND LEVEL';
      }
      // 输出曲率日志
      if (process.env.DEBUG) {
        console.log('【曲率日志】', {
          lat: node.lat,
          lng: node.lng,
          curvature: angle,
          alignment
        });
      }
      processedAdcodes[i] = { ...node, curvature: angle, alignment };
    }
    // 批量获取天气和城市信息
    const adcodes = processedAdcodes.map(node => node.adcode);
    const weatherInfos = await this.getWeatherInfoBatch(adcodes);
    const placePromises = processedAdcodes.map(node => this.getPlaceName(node.lat, node.lng));
    const placeInfos = await Promise.all(placePromises);
    // 记忆化风险预测
    const riskPromises = processedAdcodes.map(async (node, index) => {
      const { adcode, roadType, hasSignal, lat, lng, alignment } = node;
      const cacheKey = `${adcode}_${departTime}`;
      let riskPromise;
      let trafficway_type, traffic_control_device;
      if (this.nodeRiskCache.has(cacheKey)) {
        riskPromise = this.nodeRiskCache.get(cacheKey);
      } else {
        trafficway_type = OSM_HIGHWAY_TO_MODEL[roadType] || 'NOT DIVIDED';
        traffic_control_device = hasSignal ? 'TRAFFIC SIGNAL' : 'NO CONTROLS';
        riskPromise = (async () => {
          const riskRes = await this.predictAccidentRiskByAdcode(adcode, departTime, weatherInfos[index], { trafficway_type, traffic_control_device, alignment });
          let risk = riskRes.success ? riskRes.probability : null;
          let crashType = riskRes.success ? riskRes.crashType : null;
          risk = this.adjustRiskByWeather(risk, weatherInfos[index]);
          risk = risk * (0.75 + Math.random() * 1);
          return { risk, crashType };
        })();
        this.nodeRiskCache.set(cacheKey, riskPromise);
      }
      const { risk, crashType } = await riskPromise;
      // 省份加权
      const provinceName = placeInfos[index]?.name?.match(/^[^省市区县]+[省市自治区回族自治区壮族自治区维吾尔自治区]?/)?.[0] || '';
      const provinceProb = this.provinceProbMap[provinceName] || 0;
      const weightedRisk = typeof risk === 'number' ? risk * (1 + provinceProb) : risk;
      return {
        adcode: node.adcode,
        lat: node.lat,
        lng: node.lng,
        weatherInfo: weatherInfos[index],
        cityInfo: placeInfos[index],
        risk: weightedRisk,
        crashType,
        location: `${node.lng},${node.lat}`,
        roadType: node.roadType,
        hasSignal: node.hasSignal,
        curvature: node.curvature,
        alignment: node.alignment
      };
    });
    const results = await Promise.all(riskPromises);
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
      this.nodeRiskCache = new Map(); // 每次请求前清空缓存
      const { paths } = data;
      if (!Array.isArray(paths)) {
        return { success: false, error: '请求体格式错误，缺少 paths 数组' };
      }

      if (process.env.DEBUG) {
        console.log(`开始处理 ${paths.length} 条路线...`);
      }

      // 结果容器
      const routes = [];
      const routeRisks = [];

      // 并行处理所有路线
      const routePromises = paths.map(async (pathObj, pathIndex) => {
        if (process.env.DEBUG) {
          console.log(`并行处理第 ${pathIndex + 1} 条路线...`);
        }

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
          const { adcode, lat, lng, weatherInfo, cityInfo, risk, crashType } = node;

          maxRisk = Math.max(maxRisk, risk);
          riskSum += risk;

          // route-risk 节点
          routePoints.push({ adcode, lng, lat, risk, crashType });

          // 高风险点
          if (risk >= 0.31) {
            highRiskPoints.push({
              adcode, lng, lat, risk, crashType,
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
            crashType,
            weatherError: weatherInfo.weatherError,
            cityError: cityInfo.cityError
          });
        });

        // 计算平均风险
        const avgRisk = routePoints.length > 0 ? (riskSum / routePoints.length) : 0;
        // 路线风险等级
        const riskLevel = this.calculateRouteRiskLevel(avgRisk);
        // 路线 summary
        const summary = {
          start: cities[0]?.name || '',
          end: cities[cities.length - 1]?.name || '',
          maxRisk,
          avgRisk: avgRisk,
          suggestion: this.generateOverallSuggestion(avgRisk, maxRisk, vehicleType)
        };

        if (process.env.DEBUG) {
          console.log(`第 ${pathIndex + 1} 条路线处理完成，风险等级: ${riskLevel}`);
        }

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

      if (process.env.DEBUG) {
        console.log(`所有路线处理完成，共 ${routes.length} 条路线`);
      }
      this.nodeRiskCache = new Map(); // 处理完后清空缓存
      return { success: true, routes, routeRisks };
    } catch (error) {
      this.nodeRiskCache = new Map(); // 出错也清空缓存
      // console.error('路线规划处理失败:', error);
      if (process.env.DEBUG) {
        console.error('路线规划处理失败:', error);
      }
      return { success: false, error: error.message };
    }
  }

}

module.exports = CorePredictionService; 