<template>
  <div class="accident-prediction">
    <el-row :gutter="20">
      <!-- 左侧：路径和城市信息 -->
      <el-col :span="12">
        <el-card class="route-info-card">
          <template #header>
            <div class="card-header">
              <span>路径规划与风险信息</span>
            </div>
          </template>

          <div
            v-for="(route, index) in routeResults"
            :key="index"
            class="route-item"
          >
            <div class="route-title">
              路线 {{ index + 1 }} -
              <el-tag :type="getRiskLevelType(route.riskLevel)">
                风险等级：{{ route.riskLevel }}
              </el-tag>
            </div>

            <el-carousel height="120px" indicator-position="outside">
              <el-carousel-item
                v-for="(city, i) in route.cities"
                :key="i"
              >
                <div class="city-weather">
                  <strong>{{ city.name }}</strong> - {{ city.weather }}
                  <div>
                    温度：{{ city.temperature }}℃ 湿度：{{ city.humidity }}%
                  </div>
                  <div>风速：{{ city.windSpeed }}级</div>
                </div>
              </el-carousel-item>
            </el-carousel>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：地图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">地图</div>
          </template>
          <div id="map" style="width: 100%; height: 600px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const routeResults = ref([
  {
    riskLevel: '中风险',
    cities: [
      {
        name: '北京',
        weather: '晴',
        temperature: 29,
        humidity: 50,
        windSpeed: 3
      },
      {
        name: '石家庄',
        weather: '多云',
        temperature: 31,
        humidity: 55,
        windSpeed: 2
      }
    ]
  },
  {
    riskLevel: '高风险',
    cities: [
      {
        name: '北京',
        weather: '雨',
        temperature: 25,
        humidity: 85,
        windSpeed: 4
      },
      {
        name: '保定',
        weather: '雷阵雨',
        temperature: 24,
        humidity: 90,
        windSpeed: 5
      }
    ]
  }
])

const getRiskLevelType = (level) => {
  const types = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger'
  }
  return types[level] || 'info'
}

let map = null
onMounted(() => {
  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载')
    return
  }

  map = new window.AMap.Map('map', {
    zoom: 7,
    center: [116.397428, 39.90923]
  })
})
</script>

<style scoped lang="scss">
.accident-prediction {
  .route-info-card {
    .route-item {
      margin-bottom: 30px;

      .route-title {
        font-weight: bold;
        margin-bottom: 10px;
      }

      .city-weather {
        background-color: #f9f9f9;
        padding: 10px;
        border-radius: 8px;
        line-height: 1.6;
      }
    }
  }
}
</style>
