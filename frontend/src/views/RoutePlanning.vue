<template>
  <div class="route-planning">
    <div id="map" class="map-container"></div>

    <div class="floating-form">
      <el-card shadow="never" class="custom-card">
        <template #header><span>路线规划</span></template>
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
              :placeholder="currentTimePlaceholder"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="车辆类型">
            <el-select v-model="form.vehicleType" placeholder="请选择车辆类型" style="width: 100%">
              <el-option label="小客车" value="小客车" />
              <el-option label="大型客车" value="大型客车" />
              <el-option label="货车" value="货车" />
              <el-option label="摩托车" value="摩托车" />
              <el-option label="危险品运输车" value="危险品运输车" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="planRoutes">规划路线</el-button>
            <el-button type="warning" :disabled="!canPredict" @click="goToPrediction">事故预测</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { sendRouteData } from '@/api/route'

import axios from 'axios'
import dayjs from 'dayjs'

const currentTimePlaceholder = dayjs().format('YYYY-MM-DD HH:mm:ss')

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
const canPredict = ref(false)

onMounted(() => {
  map = new AMap.Map('map', { zoom: 12, center: [116.397428, 39.90923] })
})

const getColorByIndex = (index) => ['#006400', '#003366', '#8B0000'][index % 3]

const clearMap = () => {
  routePolylines.forEach(poly => poly.setMap(null))
  routePolylines = []
  routes.value = []
  canPredict.value = false
}

const planRoutes = () => {
  clearMap()
  canPredict.value = false // ✅ 初始化为禁用

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

            // 确保 DrivingPolicy 已加载
            AMap.plugin(['AMap.Driving'], () => {
              if (!AMap.DrivingPolicy) {
                ElMessage.error('高德地图策略未加载，请稍后重试')
                return
              }
              const strategies = [
                AMap.DrivingPolicy.LEAST_TIME,
                AMap.DrivingPolicy.LEAST_FEE,
                AMap.DrivingPolicy.LEAST_DISTANCE
              ]

              let results = [], completed = 0

              strategies.forEach((strategy, i) => {
                const driving = new AMap.Driving({ policy: strategy })
                driving.search(originLngLat, destLngLat, async (status, result) => {
                  completed++
                  if (status === 'complete' && result.routes.length) {
                    results.push(result.routes[0])
                  }

                  if (completed === strategies.length) {
                    if (results.length) {
                      routes.value = results
                      drawRoutes(results)
                      await sendRouteDataToBackend(form.value.origin, form.value.destination, departTime, form.value.vehicleType)
                      ElMessage.success(`共获取 ${results.length} 条不同策略路线`)
                      canPredict.value = true // ✅ 启用按钮
                    } else {
                      ElMessage.error('规划失败')
                      canPredict.value = false // ✅ 禁用按钮
                    }
                  }
                })
              })
            })
          } else {
            ElMessage.error('无法解析终点地址')
            canPredict.value = false // ✅ 禁用按钮
          }
        })
      } else {
        ElMessage.error('无法解析起点地址')
        canPredict.value = false // ✅ 禁用按钮
      }
    })
  })
}

const drawRoutes = (routeList) => {
  clearMap()
  const allRouteCoords = []  // 存储所有路线的经纬度信息

  routeList.forEach((route, index) => {
    const path = route.steps.flatMap(step => step.path)
    const polyline = new AMap.Polyline({
      path,
      strokeColor: getColorByIndex(index),
      strokeWeight: 7,
      map
    })
    routePolylines.push(polyline)
    allRouteCoords.push(path.map(p => [p.lng, p.lat]))  // 经纬度数组
  })

  // 保存到 localStorage 以便数据分析页使用
  localStorage.setItem('plannedRoutes', JSON.stringify(allRouteCoords))

  if (routePolylines.length) map.setFitView(routePolylines)
}


// 与后端交互：将起点、终点和出发时间和车辆类型传递给后端
const sendRouteDataToBackend = async (origin, destination, departTime, vehicleType) => {
  try {
    const response = await sendRouteData({
      origin,
      destination,
      departTime,
      vehicleType
    })
    console.log('后端返回:', response.data)
  } catch (error) {
    console.error('请求失败:', error)
    ElMessage.error('数据发送失败')
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
  background-color: rgba(77, 100, 255, 0.427) !important;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  padding: 16px !important;
  color: #4c4c7e;
}
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