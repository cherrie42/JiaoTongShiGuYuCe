<template>
  <div class="accident-prediction">
    <!-- 添加路线选择器 -->
    <el-card style="margin-bottom: 20px">
      <template #header>
        <span>路线选择</span>
      </template>
      <el-select 
        v-model="selectedRouteIndex" 
        placeholder="请选择路线" 
        @change="handleRouteChange"
        style="width: 300px"
      >
        <el-option
          v-for="(route, index) in routeOptions"
          :key="index"
          :label="`路线 ${index + 1} (${route.riskLevel})`"
          :value="index"
        />
      </el-select>
    </el-card>

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
const selectedRouteIndex = ref(0) // 当前选中的路线索引
const routeOptions = ref([]) // 路线选项
const routeData = ref(null) // 存储完整的路线数据
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

// 路线切换处理函数
const handleRouteChange = (index) => {
  if (!routeData.value || !routeData.value.routeRisks || !routeData.value.routeRisks[index]) {
    ElMessage.error('路线数据不存在')
    return
  }

  const routeRisk = routeData.value.routeRisks[index]
  
  // 重新绘制地图
  drawRouteOnMap(routeRisk.route)
}

// 在地图上画出路线 - 使用与路线规划相同的方式
function drawRouteOnMap(routePoints) {
  if (!map) return
  
  // 清除之前的路线
  if (polyline) {
    polyline.setMap(null)
    polyline = null
  }

  try {
    // 使用路径点数组直接绘制，与路线规划保持一致
    const path = routePoints.map(p => [p.lng, p.lat])
    
    polyline = new window.AMap.Polyline({
      path,
      strokeColor: '#FF0000',
      strokeWeight: 6,
      isOutline: true,
      outlineColor: '#ffeeff',
      borderWeight: 2,
      lineJoin: 'round'
    })
    
    polyline.setMap(map)
    map.setFitView([polyline])
  } catch (e) {
    console.error('绘制路线失败:', e)
    ElMessage.error('绘制路线失败')
  }
}

onMounted(() => {
  // 从 localStorage 获取数据
  const data = getRouteDataFromStorage()
  
  if (!data || !data.routes) {
    ElMessage.error('未找到路线数据，请先进行路线规划')
    return
  }

  // 存储完整数据
  routeData.value = data
  routeResults.value = data.routes

  // 生成路线选项
  routeOptions.value = data.routes.map((route, index) => ({
    index,
    riskLevel: route.riskLevel || '未知风险'
  }))

  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载')
    return
  }

  // 初始化地图
  map = new window.AMap.Map('map', {
    zoom: 7,
    center: [116.397428, 39.90923]
  })

  // 默认绘制第一条路线
  if (data.routeRisks && data.routeRisks.length > 0) {
    selectedRouteIndex.value = 0
    drawRouteOnMap(data.routeRisks[0].route)
  }
})

// 监听路线数据变化
watch(routeResults, (newVal) => {
  if (newVal.length > 0 && routeData.value && routeData.value.routeRisks && routeData.value.routeRisks.length > 0) {
    drawRouteOnMap(routeData.value.routeRisks[0].route)
  }
})
</script>

<style scoped lang="scss">
.accident-prediction {
  padding: 20px;

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
