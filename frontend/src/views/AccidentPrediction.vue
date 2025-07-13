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
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { getRouteDataFromStorage } from '@/api/route'

const route = useRoute()
const routeResults = ref([])
let map = null
let polyline = null

const getRiskLevelType = (level) => {
  const types = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger'
  }
  return types[level] || 'info'
}

// 根据城市名获取经纬度
function getCityLngLat(cityName) {
  return new Promise((resolve, reject) => {
    const geocoder = new window.AMap.Geocoder()
    geocoder.getLocation(cityName, (status, result) => {
      if (status === 'complete' && result.geocodes.length) {
        resolve([result.geocodes[0].location.lng, result.geocodes[0].location.lat])
      } else {
        reject('无法获取城市坐标: ' + cityName)
      }
    })
  })
}

// 在地图上画出路线
async function drawRouteOnMap(cities) {
  if (!map) return
  if (polyline) {
    polyline.setMap(null)
    polyline = null
  }
  try {
    const lnglats = []
    for (const city of cities) {
      const lnglat = await getCityLngLat(city.name)
      lnglats.push(lnglat)
    }
    polyline = new window.AMap.Polyline({
      path: lnglats,
      strokeColor: '#FF0000',
      strokeWeight: 6
    })
    polyline.setMap(map)
    map.setFitView([polyline])
  } catch (e) {
    ElMessage.error('部分城市坐标获取失败，无法绘制完整路线')
  }
}

onMounted(() => {
  // 从 localStorage 获取数据
  const routeData = getRouteDataFromStorage()
  
  if (!routeData || !routeData.routes) {
    ElMessage.error('未找到路线数据，请先进行路线规划')
    return
  }

  routeResults.value = routeData.routes
  // 默认画第一条路线
  if (routeData.routes.length > 0) {
    drawRouteOnMap(routeData.routes[0].cities)
  }

  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载')
    return
  }

  map = new window.AMap.Map('map', {
    zoom: 7,
    center: [116.397428, 39.90923]
  })
})

// 如果后续想支持切换路线高亮，可以加watch
watch(routeResults, (newVal) => {
  if (newVal.length > 0) {
    drawRouteOnMap(newVal[0].cities)
  }
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
