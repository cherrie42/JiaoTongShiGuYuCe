<template>
  <div class="route-planning">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
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
              <el-date-picker v-model="form.departTime" type="datetime" placeholder="默认当前时间" style="width: 100%" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="planRoutes">规划路线</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="16">
        <div id="map" style="width: 100%; height: 600px;"></div>
        <el-carousel v-if="detailedInfo.length" height="180px" style="margin-top: 10px">
          <el-carousel-item v-for="info in detailedInfo" :key="info.index">
            <div>
              <h4>路线 {{ info.index + 1 }}</h4>
              <p>出发时间：{{ info.departTime }}</p>
              <p>道路类型：{{ info.roadType }}，直路占比：{{ info.straightRatio }}%，弯路占比：{{ info.curveRatio }}%</p>
              <p>天气：{{ info.weather }}，光照：{{ info.light }}，路面：{{ info.roadSurface }}</p>
            </div>
          </el-carousel-item>
        </el-carousel>
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

let map = null
let routePolylines = []
const routes = ref([])
const detailedInfo = ref([])

onMounted(() => {
  // 初始化地图
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
  routePolylines.forEach(poly => poly.setMap(null))
  routePolylines = []
  routes.value = []
  detailedInfo.value = []
}

const planRoutes = () => {
  clearMap()

  if (!form.value.origin || !form.value.destination) {
    ElMessage.warning('请输入起点和终点')
    return
  }

  const departTime = form.value.departTime || new Date().toISOString()

  // 先用高德Geocoder获取经纬度
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
              // 每个策略单独new一个Driving实例，避免冲突
              AMap.plugin(['AMap.Driving'], () => {
                const driving = new AMap.Driving({
                  policy: strategy
                })

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
  routeList.forEach((route, index) => {
    const path = route.steps.flatMap(step => step.path)
    const polyline = new AMap.Polyline({
      path,
      strokeColor: getColorByIndex(index),
      strokeWeight: 7,
      map
    })
    polyline.routeIndex = index
    routePolylines.push(polyline)
  })
}

const fetchRouteDetails = async (routeList, departTime) => {
  const payload = routeList.map((route, i) => {
    const path = route.steps.flatMap(step => step.path)
    return {
      index: i,
      path: path.map(coord => [coord.lng, coord.lat]),
      departTime
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
</script>

<style scoped>
#map {
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>
