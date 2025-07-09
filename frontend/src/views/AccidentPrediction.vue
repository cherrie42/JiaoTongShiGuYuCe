<template>
  <div class="accident-prediction">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="prediction-form">
          <template #header>
            <div class="card-header">
              <span>事故风险预测</span>
            </div>
          </template>

          <!-- 高德地图 -->
          <div id="map" style="width: 100%; height: 300px; margin-bottom: 20px;"></div>

          <el-form :model="predictionForm" label-width="140px">
            <el-form-item label="地点">
              <el-input v-model="predictionForm.location" placeholder="点击地图或输入地点" />
            </el-form-item>

            <el-form-item label="时间">
              <el-date-picker
                v-model="predictionForm.datetime"
                type="datetime"
                placeholder="选择日期时间"
              />
            </el-form-item>

            <!-- 新增：显示自动补全的天气信息 -->
            <el-form-item label="天气">
              <el-input v-model="predictionForm.weather" readonly />
            </el-form-item>
            <el-form-item label="温度(℃)">
              <el-input v-model="predictionForm.temperature" readonly />
            </el-form-item>
            <el-form-item label="湿度(%)">
              <el-input v-model="predictionForm.humidity" readonly />
            </el-form-item>
            <el-form-item label="风速(级)">
              <el-input v-model="predictionForm.windspeed" readonly />
            </el-form-item>
            <el-form-item label="路面湿滑">
              <el-input v-model="predictionForm.road_slippery" readonly />
            </el-form-item>

            <el-form-item label="车型">
              <el-select v-model="predictionForm.vehicle_type" placeholder="选择车型">
                <el-option label="小型车" value="small" />
                <el-option label="货车" value="truck" />
                <el-option label="摩托车" value="motorcycle" />
              </el-select>
            </el-form-item>

            <el-form-item label="驾驶人年龄">
              <el-input-number v-model="predictionForm.driver_age" :min="16" :max="100" />
            </el-form-item>

            <el-form-item label="驾龄（年）">
              <el-input-number v-model="predictionForm.driver_experience" :min="0" :max="80" />
            </el-form-item>

            <el-form-item label="道路类型">
              <el-select v-model="predictionForm.road_type" placeholder="选择道路类型">
                <el-option label="国道" value="national" />
                <el-option label="省道" value="provincial" />
                <el-option label="县道" value="county" />
              </el-select>
            </el-form-item>

            <el-form-item label="路段结构">
              <el-select v-model="predictionForm.road_structure" placeholder="选择路段结构">
                <el-option label="直线段" value="straight" />
                <el-option label="十字路口" value="cross" />
                <el-option label="T型路口" value="T" />
                <el-option label="环岛" value="roundabout" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitPrediction" :loading="loading">
                开始预测
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card v-if="predictionResult" class="prediction-result">
          <template #header>
            <div class="card-header"><span>预测结果</span></div>
          </template>

          <div class="result-content">
            <div class="risk-level">
              <div class="level-title">风险等级</div>
              <el-tag :type="getRiskLevelType(predictionResult.riskLevel)" size="large">
                {{ predictionResult.riskLevel }}
              </el-tag>
            </div>

            <div class="risk-factors">
              <div class="factors-title">主要风险因素</div>
              <el-timeline>
                <el-timeline-item
                  v-for="(factor, index) in predictionResult.riskFactors"
                  :key="index"
                  :type="getTimelineItemType(index)"
                >
                  {{ factor }}
                </el-timeline-item>
              </el-timeline>
            </div>

            <div class="suggestions">
              <div class="suggestions-title">安全建议</div>
              <el-collapse>
                <el-collapse-item
                  v-for="(suggestion, index) in predictionResult.suggestions"
                  :key="index"
                  :title="suggestion.title"
                >
                  {{ suggestion.content }}
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-card>

        <el-empty v-else description="暂无预测结果" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const loading = ref(false)

const predictionForm = ref({
  location: '',
  datetime: '',
  vehicle_type: '',
  driver_age: '',
  driver_experience: '',
  road_type: '',
  road_structure: '',
  weather: '',
  temperature: '',
  humidity: '',
  windspeed: '',
  road_slippery: '',
  crash_hour: '',
  crash_day_of_week: '',
  crash_month: '',
  holiday_type: ''
})

const predictionResult = ref(null)

// 天气相关
const weatherLoading = ref(false)
const weatherInfo = ref({
  weather: '',
  temperature: '',
  humidity: '',
  windspeed: ''
})

// 高德地图和天气插件实例
let map = null
let geocoder = null
let weatherPlugin = null

onMounted(() => {
  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载')
    return
  }

  map = new window.AMap.Map('map', {
    zoom: 10,
    center: [116.397428, 39.90923]
  })

  window.AMap.plugin(['AMap.Geocoder', 'AMap.Weather'], () => {
    geocoder = new window.AMap.Geocoder()
    weatherPlugin = new window.AMap.Weather()
  })

  map.on('click', (e) => {
    const { lng, lat } = e.lnglat
    if (geocoder) {
      geocoder.getAddress([lng, lat], async (status, result) => {
        if (status === 'complete' && result.regeocode) {
          const city = result.regeocode.addressComponent.city || result.regeocode.addressComponent.province || ''
          if (city) {
            predictionForm.value.location = city
            await fetchWeather(city)
            ElMessage.success(`已选择位置：${city}`)
          } else {
            ElMessage.warning('无法获取城市信息')
          }
        } else {
          ElMessage.error('定位失败')
        }
      })
    }
  })
})

// 监听地点变化，自动获取天气
watch(() => predictionForm.value.location, async (newCity) => {
  if (newCity) {
    await fetchWeather(newCity)
  } else {
    clearWeather()
  }
})

const fetchWeather = async (city) => {
  if (!weatherPlugin) {
    ElMessage.error('高德天气插件未加载')
    return
  }
  weatherLoading.value = true
  try {
    // 获取实时天气
    weatherPlugin.getLive(city, (err, data) => {
      if (!err && data) {
        weatherInfo.value.weather = data.weather
        weatherInfo.value.temperature = data.temperature
        weatherInfo.value.humidity = data.humidity
        weatherInfo.value.windspeed = data.windPower

        predictionForm.value.weather = data.weather
        predictionForm.value.temperature = data.temperature
        predictionForm.value.humidity = data.humidity
        predictionForm.value.windspeed = data.windPower

        const slipperyKeywords = ['雨', '雪', '雾']
        predictionForm.value.road_slippery = slipperyKeywords.some(k => data.weather.includes(k)) ? '是' : '否'
      } else {
        ElMessage.warning('获取实时天气失败')
        clearWeather()
      }
      weatherLoading.value = false
    })
  } catch (error) {
    ElMessage.error('获取天气异常')
    clearWeather()
    weatherLoading.value = false
  }
}

const clearWeather = () => {
  weatherInfo.value = { weather: '', temperature: '', humidity: '', windspeed: '' }
  predictionForm.value.weather = ''
  predictionForm.value.temperature = ''
  predictionForm.value.humidity = ''
  predictionForm.value.windspeed = ''
  predictionForm.value.road_slippery = ''
}

const computeTimeInfo = () => {
  const dt = new Date(predictionForm.value.datetime)
  predictionForm.value.crash_hour = dt.getHours()
  predictionForm.value.crash_day_of_week = dt.getDay()
  predictionForm.value.crash_month = dt.getMonth() + 1
}

const fetchHolidayInfo = async () => {
  try {
    const dateStr = new Date(predictionForm.value.datetime).toISOString().split('T')[0]
    const res = await axios.get(`https://timor.tech/api/holiday/info/${dateStr}`)
    predictionForm.value.holiday_type = res.data?.holiday?.name || '工作日'
  } catch {
    predictionForm.value.holiday_type = '工作日'
  }
}

const submitPrediction = async () => {
  if (!predictionForm.value.location || !predictionForm.value.datetime) {
    ElMessage.warning('请填写地点和时间')
    return
  }

  loading.value = true
  try {
    computeTimeInfo()
    await fetchHolidayInfo()

    const response = await axios.post('/api/prediction', predictionForm.value)
    predictionResult.value = response.data
    ElMessage.success('预测成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('预测失败')
  } finally {
    loading.value = false
  }
}

const getRiskLevelType = (level) => {
  const types = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger'
  }
  return types[level] || 'info'
}

const getTimelineItemType = (index) => {
  const types = ['danger', 'warning', 'info']
  return types[index % types.length]
}
</script>

<style scoped lang="scss">
.accident-prediction {
  .prediction-form {
    height: 100%;
  }

  .prediction-result {
    height: 100%;

    .result-content {
      .risk-level {
        text-align: center;
        margin-bottom: 30px;
        .level-title {
          font-size: 1.2em;
          margin-bottom: 10px;
          color: #606266;
        }
        .el-tag {
          font-size: 1.5em;
          padding: 10px 20px;
        }
      }

      .risk-factors,
      .suggestions {
        margin-top: 20px;
        .factors-title,
        .suggestions-title {
          font-size: 1.1em;
          margin-bottom: 15px;
          color: #606266;
        }
      }
    }
  }
}
</style>
