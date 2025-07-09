<template>
  <div class="data-analysis">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>事故趋势分析</span>
              <el-radio-group v-model="trendTimeRange" size="small">
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                <el-radio-button label="year">年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>事故地点分布图</span>
            </div>
          </template>
          <div id="amap-container" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>事故类型分布</span>
            </div>
          </template>
          <div ref="typeChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
  <el-card class="chart-card">
    <template #header>
      <div class="card-header">
        <span>实时天气预报</span> 
      </div>
    </template>

    <el-radio-group v-model="weatherView" size="small" style="margin-bottom: 15px;">
      <el-radio-button label="current">当前天气</el-radio-button>
      <el-radio-button label="forecast">未来三天天气</el-radio-button>
    </el-radio-group>

    <div v-if="weatherView === 'current'" class="weather-info">
      <p><strong>当前城市：</strong>{{ currentCity }}</p>    <!-- 新增当前查询城市 -->
      <p><strong>天气：</strong>{{ weatherInfo.weather }}</p>
      <p><strong>温度：</strong>{{ weatherInfo.temperature }}℃</p>
      <p><strong>风向：</strong>{{ weatherInfo.windDirection }}</p>
      <p><strong>风力：</strong>{{ weatherInfo.windPower }}级</p>
      <p><strong>湿度：</strong>{{ weatherInfo.humidity }}%</p>
      <p><strong>报告时间：</strong>{{ weatherInfo.reportTime }}</p>
    </div>

    <div v-if="weatherView === 'forecast'">
      <h4>{{ forecastCity }} 未来三天天气预报：</h4>
      <div v-for="(item, index) in forecast" :key="index" class="forecast-item">
        <p>
          <strong>{{ item.date }}:</strong>
          白天 {{ item.dayWeather }} ({{ item.dayTemp }}℃),
          夜晚 {{ item.nightWeather }} ({{ item.nightTemp }}℃)
        </p>
      </div>
    </div>

          <!-- 删除了重复显示的天气内容，保留查询输入框和地图 -->
          <div style="margin-top: 20px">
            <el-input
              v-model="searchLocation"
              placeholder="输入地点查询天气"
              size="small"
              @keyup.enter.native="searchByKeyword"
              style="margin-bottom: 10px"
            >
              <template #append>
                <el-button @click="searchByKeyword" icon="el-icon-search" />
              </template>
            </el-input>

            <div id="weather-map" style="width: 100%; height: 300px;"></div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>道路状况分析</span>
            </div>
          </template>
          <div ref="roadChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import axios from 'axios'

const currentCity = ref('')  // 当前天气城市


// 图表引用
const trendChart = ref(null)
const typeChart = ref(null)
const roadChart = ref(null)

// 图表实例
let trendChartInstance = null
let typeChartInstance = null
let roadChartInstance = null

// 高德地图实例
let map = null
let weatherMap = null
let weatherMapMarker = null

// 实时天气信息（显示用）
const weatherInfo = ref({
  weather: '',
  temperature: '',
  windDirection: '',
  windPower: '',
  humidity: '',
  reportTime: ''
})

// 查询天气的输入与结果
const searchLocation = ref('')
const forecast = ref([])
const forecastCity = ref('')

// 天气视图类型：当前天气 current，未来三天 forecast
const weatherView = ref('current')

// 查询天气函数
const fetchWeatherByCity = (cityName) => {
  if (!window.AMap || !window.AMap.Weather) {
    ElMessage.error('高德天气插件未加载')
    return
  }

  const weatherPlugin = new window.AMap.Weather()

  // 获取当前天气
  weatherPlugin.getLive(cityName, (err, data) => {
    if (!err) {
      weatherInfo.value = {
        weather: data.weather,
        temperature: data.temperature,
        windDirection: data.windDirection,
        windPower: data.windPower,
        humidity: data.humidity,
        reportTime: data.reportTime
      }
      currentCity.value = data.city || cityName  // 设置当前城市名
      weatherView.value = 'current'
    } else {
      ElMessage.error('获取当前天气失败')
    }
  })

  // 获取未来三天天气预报
  weatherPlugin.getForecast(cityName, (err, data) => {
    if (!err) {
      forecast.value = data.forecasts.slice(0, 3).map(item => ({
        date: item.date,
        dayWeather: item.dayWeather,
        nightWeather: item.nightWeather,
        dayTemp: item.dayTemp,
        nightTemp: item.nightTemp
      }))
      forecastCity.value = data.city || cityName
    } else {
      ElMessage.error('获取天气预报失败')
    }
  })
}


const searchByKeyword = () => {
  if (!searchLocation.value) return

  if (!window.AMap || !window.AMap.Geocoder) {
    ElMessage.error('高德地图Geocoder未加载')
    return
  }

  const geocoder = new window.AMap.Geocoder()

  geocoder.getLocation(searchLocation.value, (status, result) => {
    if (status === 'complete' && result.geocodes.length) {
      const location = result.geocodes[0].location

      if (weatherMapMarker) {
        weatherMapMarker.setMap(null)
      }

      weatherMap.setCenter(location)
      weatherMapMarker = new window.AMap.Marker({ position: location, map: weatherMap })

      const city = result.geocodes[0].addressComponent.city || searchLocation.value
      fetchWeatherByCity(city)
    } else {
      ElMessage.error('无法找到该地点')
    }
  })
}

// 时间范围
const trendTimeRange = ref('month')

// 初始化趋势图
const initTrendChart = async () => {
  try {
    const response = await axios.get(`/api/analysis/trend?range=${trendTimeRange.value}`)
    const { dates, counts } = response.data

    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', name: '事故数量' },
      series: [{ data: counts, type: 'line', smooth: true, areaStyle: {} }]
    }

    trendChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取趋势数据失败')
  }
}

// 初始化高德地图（事故地点）
const initAMap = async () => {
  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载，请检查 index.html')
    return
  }

  map = new window.AMap.Map('amap-container', {
    zoom: 11,
    center: [116.397428, 39.90923],
    viewMode: '3D'
  })

  try {
    const response = await axios.get('/api/analysis/locations')
    const locations = response.data

    locations.forEach(item => {
      const marker = new window.AMap.Marker({
        position: [item.longitude, item.latitude],
        map: map,
        title: item.description || '事故地点'
      })

      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div>
            <h3>事故地点</h3>
            <p>经纬度: ${item.longitude}, ${item.latitude}</p>
            <p>描述: ${item.description || '无'}</p>
            <p>时间: ${item.time || '未知'}</p>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -30)
      })

      marker.on('click', () => {
        infoWindow.open(map, marker.getPosition())
      })
    })
  } catch (error) {
    ElMessage.error('获取事故地点数据失败')
  }
}

// 初始化事故类型图表
const initTypeChart = async () => {
  try {
    const response = await axios.get('/api/analysis/type-distribution')
    const { types, counts } = response.data

    const option = {
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [{
        name: '事故类型',
        type: 'pie',
        radius: '50%',
        data: types.map((type, i) => ({ value: counts[i], name: type })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' }
        }
      }]
    }

    typeChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取事故类型数据失败')
  }
}

// 初始化道路状况图表
const initRoadChart = async () => {
  try {
    const response = await axios.get('/api/analysis/road-condition')
    const { roads, accidentCounts } = response.data

    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: roads },
      yAxis: { type: 'value', name: '事故数' },
      series: [{ data: accidentCounts, type: 'bar' }]
    }

    roadChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取道路状况数据失败')
  }
}

onMounted(() => {
  // 初始化图表实例
  trendChartInstance = echarts.init(trendChart.value)
  typeChartInstance = echarts.init(typeChart.value)
  roadChartInstance = echarts.init(roadChart.value)

  initTrendChart()
  initAMap()
  initTypeChart()
  initRoadChart()

  watch(trendTimeRange, () => {
    initTrendChart()
  })

  // 初始化天气，默认查询北京
  fetchWeatherByCity('北京')

  // 初始化天气地图
  if (window.AMap) {
    weatherMap = new window.AMap.Map('weather-map', {
      zoom: 10,
      center: [116.397428, 39.90923]
    })

    // 点击天气地图更新天气
    weatherMap.on('click', e => {
      const lnglat = e.lnglat
      if (weatherMapMarker) weatherMapMarker.setMap(null)
      weatherMapMarker = new window.AMap.Marker({
        position: lnglat,
        map: weatherMap
      })

      // 逆地理编码获取城市名
      const geocoder = new window.AMap.Geocoder()
      geocoder.getAddress(lnglat, (status, result) => {
        if (status === 'complete' && result.regeocode) {
          const city = result.regeocode.addressComponent.city || result.regeocode.addressComponent.province || ''
          if (city) {
            fetchWeatherByCity(city)
          } else {
            ElMessage.warning('无法确定点击位置的城市')
          }
        }
      })
    })
  }
})
</script>

<style scoped>
.data-analysis {
  padding: 20px;
}

.chart-card {
  min-height: 350px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-row {
  margin-top: 20px;
}

.weather-info {
  font-size: 14px;
  line-height: 24px;
}

.forecast-item {
  border-bottom: 1px solid #eee;
  padding: 5px 0;
}
</style>
