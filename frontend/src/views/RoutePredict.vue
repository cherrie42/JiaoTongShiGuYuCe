<template>
    <div class="route-accident-predict">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card>
            <template #header>
              <span>路线与事故预测</span>
            </template>
  
            <el-form :model="form" label-width="100px">
              <el-form-item label="起点">
                <el-input v-model="form.origin" placeholder="输入起点" />
              </el-form-item>
  
              <el-form-item label="终点">
                <el-input v-model="form.destination" placeholder="输入终点" />
              </el-form-item>
  
              <el-form-item label="出发时间">
                <el-date-picker v-model="form.departTime" type="datetime" style="width: 100%" />
              </el-form-item>
  
              <el-form-item>
                <el-button type="primary" @click="planRoutes">规划路线</el-button>
                <el-button type="success" @click="predictAccidents" :disabled="!routes.length">
                  开始预测
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
  
          <el-card v-if="weatherResults.length" style="margin-top: 20px">
            <div>
              <h4>{{ paginatedResult.city }}</h4>
              <p>天气：{{ paginatedResult.weather }}</p>
              <p>温度：{{ paginatedResult.temperature }} ℃</p>
              <p>湿度：{{ paginatedResult.humidity }}%</p>
              <p>风速：{{ paginatedResult.windspeed }} 级</p>
              <p>是否湿滑：{{ paginatedResult.road_slippery }}</p>
              <p>预测风险：{{ paginatedResult.risk || '待预测' }}</p>
            </div>
  
            <el-pagination
              v-model:current-page="page"
              :page-size="1"
              :total="weatherResults.length"
              layout="prev, pager, next"
              @current-change="updatePage"
            />
          </el-card>
        </el-col>
  
        <el-col :span="16">
          <div id="map" style="width: 100%; height: 600px; border: 1px solid #ccc; border-radius: 8px;"></div>
        </el-col>
      </el-row>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import axios from 'axios'
  
  const form = ref({
    origin: '',
    destination: '',
    departTime: null
  })
  
  const map = ref(null)
  const routes = ref([])
  const routePolylines = ref([])
  const weatherResults = ref([])
  const page = ref(1)
  const paginatedResult = ref({})
  
  onMounted(() => {
    map.value = new AMap.Map('map', {
      zoom: 12,
      center: [116.397428, 39.90923]
    })
  })
  
  const planRoutes = () => {
    if (!form.value.origin || !form.value.destination) {
      ElMessage.warning('请输入起点和终点')
      return
    }
  
    AMap.plugin('AMap.Geocoder', () => {
      const geocoder = new AMap.Geocoder()
  
      geocoder.getLocation(form.value.origin, (status1, result1) => {
        if (status1 === 'complete' && result1.geocodes.length) {
          const originLngLat = result1.geocodes[0].location
  
          geocoder.getLocation(form.value.destination, (status2, result2) => {
            if (status2 === 'complete' && result2.geocodes.length) {
              const destLngLat = result2.geocodes[0].location
  
              const driving = new AMap.Driving({
                policy: AMap.DrivingPolicy.LEAST_TIME,
                map: map.value
              })
  
              driving.search(originLngLat, destLngLat, (status, result) => {
                if (status === 'complete' && result.routes.length) {
                  const route = result.routes[0]
                  routes.value = [route]
                  drawRoute(route)
                } else {
                  ElMessage.error('路线规划失败')
                }
              })
            }
          })
        }
      })
    })
  }
  
  const drawRoute = (route) => {
    clearMap()
    const path = route.steps.flatMap(step => step.path)
    const polyline = new AMap.Polyline({
      path,
      strokeColor: '#409EFF',
      strokeWeight: 6,
      map: map.value
    })
    routePolylines.value.push(polyline)
  }
  
  const clearMap = () => {
    routePolylines.value.forEach(poly => poly.setMap(null))
    routePolylines.value = []
  }
  
  const extractCityPoints = async (route, interval = 10) => {
    const geocoder = new AMap.Geocoder()
    const path = route.steps.flatMap(step => step.path)
    const cities = []
    const visited = new Set()
  
    for (let i = 0; i < path.length; i += interval) {
      const { lng, lat } = path[i]
      await new Promise(resolve => {
        geocoder.getAddress([lng, lat], (status, result) => {
          if (status === 'complete' && result.regeocode) {
            const city = result.regeocode.addressComponent.city || result.regeocode.addressComponent.province
            if (city && !visited.has(city)) {
              visited.add(city)
              cities.push({ city, lng, lat })
            }
          }
          resolve()
        })
      })
    }
    return cities
  }
  
  const getWeatherForCities = async (cities) => {
    const weatherPlugin = new AMap.Weather()
    const results = []
  
    for (const item of cities) {
      await new Promise(resolve => {
        weatherPlugin.getLive(item.city, (err, data) => {
          if (!err && data) {
            results.push({
              ...item,
              weather: data.weather,
              temperature: data.temperature,
              humidity: data.humidity,
              windspeed: data.windPower,
              road_slippery: ['雨', '雪', '雾'].some(k => data.weather.includes(k)) ? '是' : '否'
            })
          }
          resolve()
        })
      })
    }
    return results
  }
  
  const predictAccidents = async () => {
    if (!routes.value.length) return
    const cities = await extractCityPoints(routes.value[0])
    const weatherData = await getWeatherForCities(cities)
    try {
      const res = await axios.post('/api/predict', { weatherPoints: weatherData })
      const enriched = weatherData.map((item, idx) => ({ ...item, risk: res.data[idx]?.risk || '未知' }))
      weatherResults.value = enriched
      page.value = 1
      updatePage(1)
      ElMessage.success('预测成功')
    } catch (e) {
      console.error(e)
      ElMessage.error('预测失败')
    }
  }
  
  const updatePage = (val) => {
    paginatedResult.value = weatherResults.value[val - 1] || {}
  }
  </script>
  
  <style scoped>
  .route-accident-predict {
    padding: 20px;
  }
  </style>
  