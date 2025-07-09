<template>
  <div class="route-planning">
    <div id="map" class="map-container"></div>

    <div class="floating-form">
      <el-card shadow="never" class="custom-card">
        <template #header>
          <span>路线规划</span>
        </template>
        <el-form :model="form" label-width="100px">
          <el-form-item label="起点">
            <el-input v-model="form.origin" placeholder="请输入起点" />
          </el-form-item>
          <el-form-item label="终点">
            <el-input v-model="form.destination" placeholder="请输入终点" />
          </el-form-item>
          <el-form-item label="出发时间">
            <el-date-picker
              v-model="form.departTime"
              type="datetime"
              placeholder="默认当前时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="车辆类型">
            <el-select v-model="form.vehicleType" placeholder="请选择车辆类型" style="width: 100%">
              <el-option label="小客车" value="小客车" />
              <el-option label="货车" value="货车" />
              <el-option label="摩托车" value="摩托车" />
              <el-option label="公交车" value="公交车" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="planRoutes">规划路线</el-button>
            <el-button type="warning" :disabled="!canPredict" @click="goToPrediction">事故预测</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <el-carousel
      v-if="detailedInfo.length"
      height="200px"
      indicator-position="outside"
      style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 80%; z-index: 1000"
    >
      <el-carousel-item v-for="info in detailedInfo" :key="info.index">
        <div>
          <h4>路线 {{ info.index + 1 }}</h4>
          <p>出发时间：{{ info.departTime }}</p>
          <p>
            道路类型：{{ info.roadType }}，直路占比：{{ info.straightRatio }}%，弯路占比：
            {{ info.curveRatio }}%
          </p>
          <p>天气：{{ info.weather }}，光照：{{ info.light }}，路面：{{ info.roadSurface }}</p>
        </div>
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const form = ref({
  origin: '',
  destination: '',
  departTime: null,
  vehicleType: '小客车'
})

let map = null
let routePolylines = []
const routes = ref([])
const detailedInfo = ref([])
const canPredict = ref(false)

onMounted(() => {
  map = new AMap.Map('map', {
    zoom: 12,
    center: [116.397428, 39.90923]
  })
})

const getColorByIndex = (index) => {
  const colors = ['#006400', '#003366', '#8B0000']
  return colors[index % colors.length]
}

const clearMap = () => {
  routePolylines.forEach((poly) => poly.setMap(null))
  routePolylines = []
  routes.value = []
  detailedInfo.value = []
  canPredict.value = false
}

const planRoutes = () => {
  clearMap()

  if (!form.value.origin || !form.value.destination) {
    ElMessage.warning('请输入起点和终点')
    return
  }

  const departTime = form.value.departTime || new Date().toISOString()

  AMap.plugin(['AMap.Geocoder'], () => {
    const geocoder = new AMap.Geocoder()

    geocoder.getLocation(form.value.origin, (status1, result1) => {
      if (status1 === 'complete' && result1.geocodes.length) {
        const originLngLat = result1.geocodes[0].location

        geocoder.getLocation(form.value.destination, (status2, result2) => {
          if (status2 === 'complete' && result2.geocodes.length) {
            const destLngLat = result2.geocodes[0].location

            const strategies = [
              AMap.DrivingPolicy.LEAST_TIME,
              AMap.DrivingPolicy.LEAST_FEE,
              AMap.DrivingPolicy.LEAST_DISTANCE
            ]

            let results = []
            let completed = 0

            strategies.forEach((strategy, i) => {
              AMap.plugin(['AMap.Driving'], () => {
                const driving = new AMap.Driving({ policy: strategy })

                driving.search(originLngLat, destLngLat, async (status, result) => {
                  completed++
                  if (status === 'complete' && result.routes.length) {
                    results.push(result.routes[0])
                  }

                  if (completed === strategies.length) {
                    if (results.length > 0) {
                      routes.value = results
                      drawRoutes(results)
                      await fetchRouteDetails(results, departTime)
                      ElMessage.success(`共获取 ${results.length} 条不同策略路线`)
                      canPredict.value = true
                    } else {
                      ElMessage.error('规划失败')
                    }
                  }
                })
              })
            })
          } else {
            ElMessage.error('无法解析终点地址')
          }
        })
      } else {
        ElMessage.error('无法解析起点地址')
      }
    })
  })
}

const drawRoutes = (routeList) => {
  clearMap()
  const allBounds = []

  routeList.forEach((route, index) => {
    const path = route.steps.flatMap((step) => step.path)
    const polyline = new AMap.Polyline({
      path,
      strokeColor: getColorByIndex(index),
      strokeWeight: 7,
      map
    })
    polyline.routeIndex = index
    routePolylines.push(polyline)
    allBounds.push(...path)
  })

  if (allBounds.length) {
    map.setFitView(routePolylines)
  }
}

const fetchRouteDetails = async (routeList, departTime) => {
  const payload = routeList.map((route, i) => {
    const path = route.steps.flatMap((step) => step.path)
    return {
      index: i,
      path: path.map((coord) => [coord.lng, coord.lat]),
      departTime,
      vehicleType: form.value.vehicleType
    }
  })

  try {
    const res = await axios.post('/api/plan', { routes: payload })
    detailedInfo.value = res.data.routes
  } catch (e) {
    console.error(e)
    ElMessage.error('获取路线详情失败')
  }
}

const goToPrediction = () => {
  router.push({
    name: 'AccidentPrediction',
    query: {
      origin: form.value.origin,
      destination: form.value.destination,
      vehicleType: form.value.vehicleType,
      departTime: form.value.departTime || new Date().toISOString()
    }
  })
}
</script>

<style scoped>
@keyframes fadeInCard {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.route-planning {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.floating-form {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  width: 400px;
  padding: 0;
}

.custom-card {
  animation: fadeInCard 0.5s ease forwards;
  background-color: rgba(77, 100, 255, 0.427) !important;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  padding: 16px !important;
  color: #4c4c7e;
}

/* 通过深度穿透，修改 Element Plus 表单标签颜色为浅紫色 */
.custom-card ::v-deep(.el-form-item__label) {
  color: #fefefe !important;
  font-weight: 600;
  font-size: 20px;
}

.custom-card ::v-deep(.el-card__header) {
  color: #ffffff;
  font-weight: 600;
  font-size: 30px;
}
</style>
