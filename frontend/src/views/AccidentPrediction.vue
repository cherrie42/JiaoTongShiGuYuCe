<template>
  <div class="accident-prediction">
    <!-- 添加路线选择器 -->
    <el-card style="margin-bottom: 20px">
      <template #header>
        <span>路线选择</span>
      </template>
      <el-select v-model="selectedRouteIndex" placeholder="请选择路线" @change="handleRouteChange" style="width: 300px">
        <el-option v-for="(route, index) in routeOptions" :key="index" :label="`路线 ${index + 1} (${route.riskLevel})`"
          :value="index" />
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

          <div v-for="(route, index) in routeResults" :key="index" class="route-item">
            <div class="route-title">
              路线 {{ index + 1 }} -
              <el-tag :type="getRiskLevelType(route.riskLevel)">
                风险等级：{{ route.riskLevel }}
              </el-tag>
            </div>
            <div style="margin-bottom: 8px; color: #666;">
              平均风险值：{{ getAvgRisk(index) }}
            </div>
            <el-carousel height="120px" indicator-position="outside"
              :active-index="index === selectedRouteIndex ? carouselActiveIndex : 0"
              @change="idx => index === selectedRouteIndex && handleCarouselChange(idx)">
              <el-carousel-item v-for="(city, i) in route.cities" :key="i">
                <div class="city-weather" :class="{
                  'highlighted-node': index === selectedRouteIndex && i === carouselActiveIndex
                }">
                  <strong>{{ city.name }}</strong> - {{ city.weather }}
                  <div>温度：{{ city.temperature }}℃ 湿度：{{ city.humidity }}%</div>
                  <div>风速：{{ city.windSpeed }}级</div>
                  <div style="margin-top: 4px; color: #c96;">
                    风险值：{{ getNodeRisk(index, i) }}
                  </div>
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
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <span>地图</span>
              <el-button @click="showIconDialog = true" size="small">自定义标记图标</el-button>
            </div>
          </template>
          <div id="map" style="width: 100%; height: 600px;"></div>
          <el-dialog v-model="showIconDialog" title="自定义标记点图标" width="600px">
            <div class="icon-select-section">
              <div class="icon-group">
                <div class="icon-label">起点：</div>
                <div class="icon-options">
                  <div v-for="(icon, idx) in startIcons" :key="icon"
                    style="display:inline-block;text-align:center;width:54px;">
                    <img :src="icon" :class="{ selected: selectedIcons.start === icon }"
                      @click="selectedIcons.start = icon" />
                    <div class="icon-label-under">
                      {{ idx === 0 ? '不显示' : '起点' + idx }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="icon-group">
                <div class="icon-label">终点：</div>
                <div class="icon-options">
                  <div v-for="(icon, idx) in endIcons" :key="icon"
                    style="display:inline-block;text-align:center;width:54px;">
                    <img :src="icon" :class="{ selected: selectedIcons.end === icon }"
                      @click="selectedIcons.end = icon" />
                    <div class="icon-label-under">
                      {{ idx === 0 ? '不显示' : '终点' + idx }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="icon-group">
                <div class="icon-label">路径点：</div>
                <div class="icon-options">
                  <div v-for="(icon, idx) in waypointIcons" :key="icon"
                    style="display:inline-block;text-align:center;width:54px;">
                    <img :src="icon" :class="{ selected: selectedIcons.waypoint === icon }"
                      @click="selectedIcons.waypoint = icon" />
                    <div class="icon-label-under">
                      {{ idx === 0 ? '不显示' : '路径点' + idx }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <template #footer>
              <el-button @click="resetIcons">恢复默认</el-button>
              <el-button type="primary" @click="saveIcons">保存</el-button>
            </template>
          </el-dialog>
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
let polylines = [] // 支持多条路线
let markers = []   // 节点标记
const carouselActiveIndex = ref(0) // 当前轮播节点索引

const getRiskLevelType = (level) => {
  const types = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger'
  }
  return types[level] || 'info'
}

// 获取本地存储的plannedRoutes
function getPlannedRoutesFromStorage() {
  const data = localStorage.getItem('plannedRoutes')
  return data ? JSON.parse(data) : []
}

// 清除地图上的所有路线和标记
function clearMap() {
  polylines.forEach(poly => poly.setMap(null))
  polylines = []
  markers.forEach(marker => marker.setMap(null))
  markers = []
}

const showIconDialog = ref(false)
const noneIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
const startIcons = [
  noneIcon,
  'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
  'https://webapi.amap.com/theme/v1.3/markers/n/mark_bs.png'
]
const endIcons = [
  noneIcon,
  'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
  'https://webapi.amap.com/theme/v1.3/markers/n/mark_rs.png'
]
const waypointIcons = [
  noneIcon,
  'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
  'https://webapi.amap.com/theme/v1.3/markers/n/mark_rs.png'
]
const defaultIcons = {
  start: startIcons[1],
  end: endIcons[1],
  waypoint: waypointIcons[1]
}
const selectedIcons = ref({ ...defaultIcons })

function saveIcons() {
  localStorage.setItem('customMarkerIcons', JSON.stringify(selectedIcons.value))
  showIconDialog.value = false
  drawAllRoutesOnMap(selectedRouteIndex.value)
}
function resetIcons() {
  selectedIcons.value = { ...defaultIcons }
  localStorage.removeItem('customMarkerIcons')
  drawAllRoutesOnMap(selectedRouteIndex.value)
}
function getCustomIcons() {
  const icons = localStorage.getItem('customMarkerIcons')
  return icons ? JSON.parse(icons) : defaultIcons
}

// 在地图上绘制所有路线，并高亮当前选中路线的关键节点
function drawAllRoutesOnMap(selectedIdx = 0) {
  if (!map) return
  clearMap()
  const plannedRoutes = getPlannedRoutesFromStorage()
  if (!plannedRoutes.length) return
  const icons = getCustomIcons()
  // 1. 绘制所有路线
  plannedRoutes.forEach((route, idx) => {
    const polyline = new window.AMap.Polyline({
      path: route,
      strokeColor: idx === selectedIdx ? '#FF0000' : '#409EFF',
      strokeWeight: idx === selectedIdx ? 7 : 4,
      isOutline: true,
      outlineColor: '#ffeeff',
      borderWeight: 2,
      lineJoin: 'round',
      zIndex: idx === selectedIdx ? 100 : 10
    })
    polyline.setMap(map)
    polylines.push(polyline)
  })
  // 2. 标记当前选中路线的关键节点
  const currentRoute = plannedRoutes[selectedIdx]
  const currentCities = routeResults.value[selectedIdx]?.cities;
  if (currentRoute && currentRoute.length > 0 && currentCities) {
    const baseSize = 24;
    currentCities.forEach((city, i) => {
      let iconUrl;
      let zIndex = 150;
      let type = 'waypoint';
      if (i === 0) {
        iconUrl = icons.start;
        zIndex = 200;
        type = 'start';
      } else if (i === currentCities.length - 1) {
        iconUrl = icons.end;
        zIndex = 200;
        type = 'end';
      } else {
        iconUrl = icons.waypoint;
      }
      if (iconUrl === noneIcon) return;
      const marker = new window.AMap.Marker({
        position: [city.lng, city.lat],
        map,
        title: city.name,
        icon: new window.AMap.Icon({
          image: iconUrl,
          size: new window.AMap.Size(baseSize, baseSize),
          imageSize: new window.AMap.Size(baseSize, baseSize)
        }),
        zIndex: zIndex
      });
      marker._type = type;
      marker._nodeIndex = i;
      marker.on('click', () => {
        if (selectedRouteIndex.value === selectedIdx) {
          carouselActiveIndex.value = i;
        }
      });
      markers.push(marker);
    });
    map.setFitView(polylines.concat(markers));
  }
}

// 路线切换处理函数
const handleRouteChange = (index) => {
  if (!routeData.value || !routeData.value.routeRisks || !routeData.value.routeRisks[index]) {
    ElMessage.error('路线数据不存在')
    return
  }
  // 重新绘制地图（用plannedRoutes）
  drawAllRoutesOnMap(index)
}

// 获取平均风险值
function getAvgRisk(routeIdx) {
  if (!routeData.value || !routeData.value.routeRisks || !routeData.value.routeRisks[routeIdx]) return '-';
  const avg = routeData.value.routeRisks[routeIdx].summary?.avgRisk;
  return typeof avg === 'number' ? avg.toFixed(3) : '-';
}
// 获取节点风险值
function getNodeRisk(routeIdx, nodeIdx) {
  if (!routeData.value || !routeData.value.routeRisks || !routeData.value.routeRisks[routeIdx]) return '-';
  const arr = routeData.value.routeRisks[routeIdx].route;
  if (!arr || !arr[nodeIdx]) return '-';
  const risk = arr[nodeIdx].risk;
  return typeof risk === 'number' ? risk.toFixed(3) : '-';
}

function handleCarouselChange(idx) {
  highlightMapMarker(idx)
  carouselActiveIndex.value = idx
}
function highlightMapMarker(nodeIdx) {
  const icons = getCustomIcons();
  const baseSize = 24;
  const highlightSize = baseSize + 4;
  markers.forEach((marker) => {
    const isHighlighted = marker._nodeIndex === nodeIdx;
    let size = isHighlighted ? highlightSize : baseSize;
    let image;
    switch (marker._type) {
      case 'start':
        image = icons.start;
        break;
      case 'end':
        image = icons.end;
        break;
      default:
        image = icons.waypoint;
        break;
    }
    const icon = new window.AMap.Icon({
      image,
      size: new window.AMap.Size(size, size),
      imageSize: new window.AMap.Size(size, size)
    });
    marker.setIcon(icon);
    marker.setzIndex(isHighlighted ? 300 : (marker._type === 'waypoint' ? 150 : 200));
  });
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
  drawAllRoutesOnMap(0)
  highlightMapMarker(0)
})

// 监听路线数据变化
watch(routeResults, (newVal) => {
  if (newVal.length > 0) {
    drawAllRoutesOnMap(selectedRouteIndex.value)
  }
})

// 监听carouselActiveIndex变化，地图点高亮
watch(carouselActiveIndex, (newIdx) => {
  highlightMapMarker(newIdx)
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
        padding: 16px 20px;
        border-radius: 12px;
        line-height: 1.6;
        box-sizing: border-box;
      }

      .city-weather.highlighted-node {
        border: 2px solid #67C23A;
        border-radius: 12px;
        box-shadow: 0 0 12px #67C23A33;
        background: #f6ffed;
        transition: border 0.2s, box-shadow 0.2s;
      }
    }
  }
}

.icon-options img {
  width: 36px;
  height: 36px;
  margin: 0 8px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: border 0.2s;
}

.icon-options img.selected {
  border: 2px solid #409EFF;
  box-shadow: 0 0 8px #409EFF55;
}

.icon-label {
  font-weight: bold;
  margin-bottom: 4px;
}

.icon-group {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}

.icon-none-label {
  font-size: 12px;
  color: #888;
  text-align: center;
  margin-top: -6px;
}

.icon-label-under {
  font-size: 12px;
  color: #888;
  text-align: center;
  margin-top: 2px;
  height: 18px;
  line-height: 18px;
}

.icon-options {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}
</style>
