<template>
  <div class="route-risk-analysis">
    <!-- 添加路线选择器 -->
    <el-card class="route-selector">
      <template #header>
        <span>路线选择</span>
      </template>
      <el-select 
        v-model="selectedRouteIndex" 
        placeholder="请选择路线" 
        @change="handleRouteChange"
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
      <!-- 左侧地图 + 折线图 -->
      <el-col :span="16">
        <el-card class="map-card">
          <template #header>
            <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
              <span>路线风险热力图</span>
              <el-button @click="showIconDialog = true" size="small">自定义标记图标</el-button>
            </div>
          </template>
          <div id="risk-map" class="map-container"></div>
          <el-dialog v-model="showIconDialog" title="自定义标记点图标" width="600px">
            <div class="icon-select-section">
              <div class="icon-group">
                <div class="icon-label">起点：</div>
                <div class="icon-options">
                  <div
                    v-for="(icon, idx) in startIcons"
                    :key="icon"
                    style="display:inline-block;text-align:center;width:54px;"
                  >
                    <img :src="icon" :class="{selected: selectedIcons.start === icon}" @click="selectedIcons.start = icon" />
                    <div class="icon-label-under">
                      {{ idx === 0 ? '不显示' : '起点' + idx }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="icon-group">
                <div class="icon-label">终点：</div>
                <div class="icon-options">
                  <div
                    v-for="(icon, idx) in endIcons"
                    :key="icon"
                    style="display:inline-block;text-align:center;width:54px;"
                  >
                    <img :src="icon" :class="{selected: selectedIcons.end === icon}" @click="selectedIcons.end = icon" />
                    <div class="icon-label-under">
                      {{ idx === 0 ? '不显示' : '终点' + idx }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="icon-group">
                <div class="icon-label">路径点：</div>
                <div class="icon-options">
                  <div
                    v-for="(icon, idx) in waypointIcons"
                    :key="icon"
                    style="display:inline-block;text-align:center;width:54px;"
                  >
                    <img :src="icon" :class="{selected: selectedIcons.waypoint === icon}" @click="selectedIcons.waypoint = icon" />
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

        <el-card class="chart-card">
          <template #header>
            <span>风险值趋势图</span>
          </template>
          <div ref="riskChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 右侧高风险点表格 + 总结 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>高风险路段</span>
          </template>
          <el-table :data="highRiskPoints" height="250">
            <el-table-column prop="risk" label="风险值" width="80" />
            <el-table-column prop="crashType" label="事故类型" width="120" />
            <el-table-column prop="description" label="说明" />
            <el-table-column prop="suggestion" label="建议" />
          </el-table>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <span>系统总结</span>
          </template>
          <p><strong>起点：</strong>{{ summary.start }}</p>
          <p><strong>终点：</strong>{{ summary.end }}</p>
          <p><strong>最高风险值：</strong>{{ summary.maxRisk }}</p>
          <p><strong>平均风险值：</strong>{{ summary.avgRisk }}</p>
          <p><strong>系统建议：</strong>{{ summary.suggestion }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getRouteDataFromStorage } from '@/api/route'

const riskChart = ref(null)
let riskChartInstance = null
let map = null

const highRiskPoints = ref([])
const summary = ref({})
const selectedRouteIndex = ref(0) // 当前选中的路线索引
const routeOptions = ref([]) // 路线选项
const routeData = ref(null) // 存储完整的路线数据

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
let polylines = []
let markers = []
function getPlannedRoutesFromStorage() {
  const data = localStorage.getItem('plannedRoutes')
  return data ? JSON.parse(data) : []
}
function clearMap() {
  polylines.forEach(poly => poly.setMap(null))
  polylines = []
  markers.forEach(marker => marker.setMap(null))
  markers = []
}
function drawAllRoutesOnMap(selectedIdx = 0) {
  if (!map) return
  clearMap()
  const plannedRoutes = getPlannedRoutesFromStorage()
  if (!plannedRoutes.length) return
  const icons = getCustomIcons()

  // 只绘制当前选中路线
  const routeArr = plannedRoutes[selectedIdx]
  if (!routeArr || !routeArr.length) return

  // 获取风险值数组（与趋势图一致）
  let routeRiskArr = []
  if (routeData.value && routeData.value.routeRisks && routeData.value.routeRisks[selectedIdx]) {
    routeRiskArr = routeData.value.routeRisks[selectedIdx].route || []
  }

  // 获取关键节点索引
  let waypointIdxArr = []
  try {
    const allWaypointIdx = JSON.parse(localStorage.getItem('waypointIdx') || '[]')
    waypointIdxArr = allWaypointIdx[selectedIdx] || []
  } catch (e) {
    waypointIdxArr = []
  }
  // 加入起点终点索引，去重排序
  const idxSet = new Set([0, ...waypointIdxArr, routeArr.length - 1])
  const segIdxArr = Array.from(idxSet).sort((a, b) => a - b)

  // 分段绘制
  function getRiskVal(p) {
    if (!p) return 0
    if (typeof p.risk === 'number') return p.risk
    if (typeof p.risk === 'object' && p.risk && typeof p.risk.risk === 'number') return p.risk.risk
    return 0
  }
  
  // 根据风险值计算颜色
  function getColorByRisk(risk) {
    if (risk <= 0.2) return '#4AF50' // 绿色
    if (risk >= 0.4) return '#F44336' // 红色
    // 0.2渐变
    const ratio = (risk - 0.2) / (0.4 - 0.2)
    const r = Math.round(76 + (244 - 76) * ratio) //76>244
    const g = Math.round(175 + (67 - 175) * ratio) //175->67
    const b = Math.round(80 + (54 - 80) * ratio) //8054
    return `rgb(${r}, ${g}, ${b})`
  }
  
  // 颜色插值函数
  function interpolateColor(color1, color2, ratio) {
    // 解析颜色
    const parseColor = (color) => {
      if (color.startsWith('#')) {
        const hex = color.slice(1)
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        }
      } else if (color.startsWith('rgb')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        }
      }
      return { r: 0, g: 0, b: 0  }
    }
    
    const c1 = parseColor(color1)
    const c2 = parseColor(color2)
    
    const r = Math.round(c1.r + (c2.r - c1.r) * ratio)
    const g = Math.round(c1.g + (c2.g - c1.g) * ratio)
    const b = Math.round(c1.b + (c2.b - c1.b) * ratio)
    
    return `rgb(${r}, ${g}, ${b})`
  }
  
  for (let i = 0; i < segIdxArr.length - 1; i++) {
    const startIdx = segIdxArr[i]
    const endIdx = segIdxArr[i + 1]
    const segPath = routeArr.slice(startIdx, endIdx + 1)
    // 获取头尾风险值，使用分段索引 i
    const risk1 = getRiskVal(routeRiskArr[i])
    const risk2 = getRiskVal(routeRiskArr[i + 1])
    console.log(`分段 ${i + 1}: [${startIdx}-${endIdx}], risk1=${risk1}, risk2=${risk2}`)
    
    // 计算起点和终点的颜色
    const startColor = getColorByRisk(risk1)
    const endColor = getColorByRisk(risk2)
    
    // 将路径分成多个小段进行渐变
    const segmentCount = Math.min(20, segPath.length - 1) // 最多20个小段
    for (let j = 0; j < segmentCount; j++) {
      const subStartIdx = Math.floor(j * (segPath.length - 1) / segmentCount)
      const subEndIdx = Math.floor((j + 1) * (segPath.length - 1) / segmentCount)
      const subPath = segPath.slice(subStartIdx, subEndIdx + 1)
      
      // 计算当前小段在整段中的位置比例
      const ratio = j / (segmentCount - 1)
      const currentColor = interpolateColor(startColor, endColor, ratio)
      
      // 画小段
      const polyline = new window.AMap.Polyline({
        path: subPath,
        strokeColor: currentColor,
        strokeWeight: 7,
        strokeOpacity: 0.95, // 加透明度让路线更亮
        isOutline: true,
        outlineColor: '#ffeeff',
        borderWeight: 2,
        lineJoin: 'round',
        zIndex: 100
      })
      polyline.setMap(map)
      polylines.push(polyline)
    }
  }

  // 标记当前选中路线的关键节点
  if (routeArr && routeArr.length > 0) {
    // 起点
    if (icons.start !== noneIcon) {
      markers.push(new window.AMap.Marker({
        position: routeArr[0],
        map,
        title: '起点',
        icon: icons.start,
        zIndex: 200
      }))
    }
    // 终点
    if (icons.end !== noneIcon) {
      markers.push(new window.AMap.Marker({
        position: routeArr[routeArr.length - 1],
        map,
        title: '终点',
        icon: icons.end,
        zIndex: 200
      }))
    }
    // 5个均匀分布的路径点
    const step = Math.floor(routeArr.length / 6)
    if (icons.waypoint !== noneIcon) {
      for (let i = 1; i <= 5; i++) {
        const idx = Math.min(i * step, routeArr.length - 2)
        markers.push(new window.AMap.Marker({
          position: routeArr[idx],
          map,
          title: `路径点${i}`,
          icon: icons.waypoint,
          zIndex: 150
        }))
      }
    }
    map.setFitView(polylines.concat(markers))
  }
}

// 路线切换处理函数
const handleRouteChange = (index) => {
  if (!routeData.value || !routeData.value.routeRisks || !routeData.value.routeRisks[index]) {
    ElMessage.error('路线数据不存在')
    return
  }

  const routeRisk = routeData.value.routeRisks[index]
  
  // 更新数据
  highRiskPoints.value = routeRisk.highRiskPoints || []
  summary.value = routeRisk.summary || {}

  // 重新初始化地图和图表
  if (map) {
    map.destroy()
  }
  // drawAllRoutesOnMap替代initMap
  map = new window.AMap.Map('risk-map', {
    zoom: 13,
    center: [routeRisk.route[0].lng, routeRisk.route[0].lat]
  })
  drawAllRoutesOnMap(index)
  initChart(routeRisk.route)
}

// 初始化路线风险热力图
const initMap = (routePoints) => {
  map = new window.AMap.Map('risk-map', {
    zoom: 13,
    center: [routePoints[0].lng, routePoints[0].lat]
  })

  const path = routePoints.map(p => [p.lng, p.lat])
  const polyline = new window.AMap.Polyline({
    path,
    isOutline: true,
    outlineColor: '#ffeeff',
    borderWeight: 2,
    strokeColor: '#00f',
    strokeWeight: 6,
    lineJoin: 'round'
  })
  polyline.setMap(map)

  highRiskPoints.value.forEach(point => {
    const marker = new window.AMap.Marker({
      position: [point.lng, point.lat],
      map,
      title: `风险值 ${point.risk}`
    })

    const infoWindow = new window.AMap.InfoWindow({
      content: `
        <div>
          <h4>高风险点</h4>
          <p>风险值: ${point.risk}</p>
          <p>事故类型: ${point.crashType || '未知'}</p>
          <p>说明: ${point.description}</p>
          <p>建议: ${point.suggestion}</p>
        </div>
      `
    })

    marker.on('click', () => {
      infoWindow.open(map, marker.getPosition())
    })
  })
}

// 初始化折线图
const initChart = (routePoints) => {
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: routePoints.map((_, i) => `点${i + 1}`)
    },
    yAxis: {
      type: 'value',
      name: '风险值'
    },
    series: [
      {
        data: routePoints.map(p => p.risk),
        type: 'line',
        smooth: true,
        areaStyle: {},
        lineStyle: { color: '#f56c6c' },
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }

  riskChartInstance.setOption(option)
}

// 从 localStorage 获取数据
const loadRouteRiskData = () => {
  const data = getRouteDataFromStorage()
  
  if (!data || !data.routeRisks || data.routeRisks.length === 0) {
    ElMessage.error('未找到路线风险数据，请先进行路线规划')
    return
  }

  // 存储完整数据
  routeData.value = data
  
  // 生成路线选项
  routeOptions.value = data.routeRisks.map((route, index) => ({
    index,
    riskLevel: data.routes[index]?.riskLevel || '未知风险'
  }))

  // 默认选择第一条路线
  selectedRouteIndex.value = 0
  handleRouteChange(0)
}

onMounted(() => {
  riskChartInstance = echarts.init(riskChart.value)

  if (!window.AMap) {
    ElMessage.error('高德地图未加载')
    return
  }

  loadRouteRiskData()
  // 默认绘制第一条路线
  setTimeout(() => {
    drawAllRoutesOnMap(0)
  }, 300)
})
</script>

<style scoped>
.route-risk-analysis {
  padding: 20px;
}

.map-container {
  width: 100%;
  height: 400px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.map-card,
.chart-card {
  margin-bottom: 20px;
}

/* 路线选择器样式 */
.route-selector {
  margin-bottom: 20px;
}

.route-selector .el-select {
  width: 300px;
}
.icon-select-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.icon-label {
  font-weight: bold;
  margin-bottom: 4px;
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
.icon-group {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}
</style>
