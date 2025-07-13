<template>
  <div class="route-risk-analysis">
    <el-row :gutter="20">
      <!-- 左侧地图 + 折线图 -->
      <el-col :span="16">
        <el-card class="map-card">
          <template #header>
            <span>路线风险热力图</span>
          </template>
          <div id="risk-map" class="map-container"></div>
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
  const routeData = getRouteDataFromStorage()
  
  if (!routeData || !routeData.routeRisks || routeData.routeRisks.length === 0) {
    ElMessage.error('未找到路线风险数据，请先进行路线规划')
    return
  }

  // 使用第一条路线的风险数据
  const routeRisk = routeData.routeRisks[0]
  
  highRiskPoints.value = routeRisk.highRiskPoints || []
  summary.value = routeRisk.summary || {}

  initMap(routeRisk.route)
  initChart(routeRisk.route)
}

onMounted(() => {
  riskChartInstance = echarts.init(riskChart.value)

  if (!window.AMap) {
    ElMessage.error('高德地图未加载')
    return
  }

  loadRouteRiskData()
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
</style>
