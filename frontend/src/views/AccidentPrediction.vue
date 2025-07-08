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
import { ref, onMounted } from 'vue'
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

const submitPrediction = async () => {
  if (!predictionForm.value.location || !predictionForm.value.datetime) {
    ElMessage.warning('请填写地点和时间')
    return
  }

  loading.value = true
  try {
    await fetchWeather()
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

// 调用高德天气接口
const fetchWeather = async () => {
  const key = '79bb58e3344bcd57dfb6dc82c904fb36'
  const city = predictionForm.value.location
  const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(city)}&key=${key}&extensions=base`
  const res = await axios.get(url)
  if (res.data && res.data.lives?.[0]) {
    const live = res.data.lives[0]
    predictionForm.value.weather = live.weather
    predictionForm.value.temperature = live.temperature
    predictionForm.value.humidity = live.humidity
    predictionForm.value.windspeed = live.windpower

    const slipperyKeywords = ['雨', '雪', '雾']
    predictionForm.value.road_slippery = slipperyKeywords.some(k => live.weather.includes(k)) ? '是' : '否'
  }
}

const computeTimeInfo = () => {
  const dt = new Date(predictionForm.value.datetime)
  predictionForm.value.crash_hour = dt.getHours()
  predictionForm.value.crash_day_of_week = dt.getDay()
  predictionForm.value.crash_month = dt.getMonth() + 1
}

const fetchHolidayInfo = async () => {
  const dateStr = new Date(predictionForm.value.datetime).toISOString().split('T')[0]
  const res = await axios.get(`https://timor.tech/api/holiday/info/${dateStr}`)
  predictionForm.value.holiday_type = res.data?.holiday?.name || '工作日'
}

// 地图相关
let map = null
let geocoder = null

onMounted(() => {
  map = new AMap.Map('map', {
    zoom: 10,
    center: [116.397428, 39.90923]
  })

  AMap.plugin('AMap.Geocoder', () => {
    geocoder = new AMap.Geocoder()
  })

  map.on('click', (e) => {
    const { lng, lat } = e.lnglat

    if (geocoder) {
      geocoder.getAddress([lng, lat], async (status, result) => {
        if (status === 'complete' && result.regeocode) {
          const city = result.regeocode.addressComponent.city || result.regeocode.addressComponent.province
          predictionForm.value.location = city
          await fetchWeather()
          ElMessage.success(`已选择位置：${city}`)
        } else {
          ElMessage.error('定位失败')
        }
      })
    }
  })
})

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
