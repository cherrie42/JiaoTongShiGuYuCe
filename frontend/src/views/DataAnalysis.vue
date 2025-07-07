<template>
  <div class="data-analysis">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>事故趋势分析</span>
              <el-radio-group v-model="trendTimeRange" size="small">
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
                <el-radio-button label="year">年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>地理分布热力图</span>
            </div>
          </template>
          <div ref="heatmapChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>事故类型分布</span>
            </div>
          </template>
          <div ref="typeChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>天气影响分析</span>
            </div>
          </template>
          <div ref="weatherChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>道路状况分析</span>
            </div>
          </template>
          <div ref="roadChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import axios from 'axios'

// 图表引用
const trendChart = ref(null)
const heatmapChart = ref(null)
const typeChart = ref(null)
const weatherChart = ref(null)
const roadChart = ref(null)

// 图表实例
let trendChartInstance = null
let heatmapChartInstance = null
let typeChartInstance = null
let weatherChartInstance = null
let roadChartInstance = null

// 时间范围选择
const trendTimeRange = ref('month')

// 初始化趋势图
const initTrendChart = async () => {
  try {
    const response = await axios.get(`/api/analysis/trend?range=${trendTimeRange.value}`)
    const { dates, counts } = response.data

    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        name: '事故数量'
      },
      series: [{
        data: counts,
        type: 'line',
        smooth: true,
        areaStyle: {}
      }]
    }

    trendChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取趋势数据失败')
  }
}

// 初始化热力图
const initHeatmapChart = async () => {
  try {
    const response = await axios.get('/api/analysis/heatmap')
    const { locations } = response.data

    const option = {
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        inRange: {
          color: ['#50a3ba', '#eac736', '#d94e5d']
        }
      },
      geo: {
        map: 'china',
        roam: true,
        emphasis: {
          label: {
            show: false
          },
          itemStyle: {
            areaColor: '#51689b'
          }
        }
      },
      series: [{
        name: '事故热力图',
        type: 'heatmap',
        coordinateSystem: 'geo',
        data: locations
      }]
    }

    heatmapChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取热力图数据失败')
  }
}

// 初始化类型分布图
const initTypeChart = async () => {
  try {
    const response = await axios.get('/api/analysis/types')
    const { types, counts } = response.data

    const option = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        name: '事故类型',
        type: 'pie',
        radius: '50%',
        data: types.map((type, index) => ({
          value: counts[index],
          name: type
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }

    typeChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取类型分布数据失败')
  }
}

// 初始化天气影响图
const initWeatherChart = async () => {
  try {
    const response = await axios.get('/api/analysis/weather')
    const { weather, counts } = response.data

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: weather
      },
      yAxis: {
        type: 'value',
        name: '事故数量'
      },
      series: [{
        data: counts,
        type: 'bar'
      }]
    }

    weatherChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取天气影响数据失败')
  }
}

// 初始化道路状况图
const initRoadChart = async () => {
  try {
    const response = await axios.get('/api/analysis/road')
    const { conditions, counts } = response.data

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: conditions
      },
      yAxis: {
        type: 'value',
        name: '事故数量'
      },
      series: [{
        data: counts,
        type: 'bar'
      }]
    }

    roadChartInstance.setOption(option)
  } catch (error) {
    ElMessage.error('获取道路状况数据失败')
  }
}

// 监听时间范围变化
watch(trendTimeRange, () => {
  initTrendChart()
})

// 初始化所有图表
onMounted(() => {
  // 创建图表实例
  trendChartInstance = echarts.init(trendChart.value)
  heatmapChartInstance = echarts.init(heatmapChart.value)
  typeChartInstance = echarts.init(typeChart.value)
  weatherChartInstance = echarts.init(weatherChart.value)
  roadChartInstance = echarts.init(roadChart.value)

  // 加载数据
  initTrendChart()
  initHeatmapChart()
  initTypeChart()
  initWeatherChart()
  initRoadChart()

  // 响应式调整
  window.addEventListener('resize', () => {
    trendChartInstance.resize()
    heatmapChartInstance.resize()
    typeChartInstance.resize()
    weatherChartInstance.resize()
    roadChartInstance.resize()
  })
})
</script>

<style lang="scss" scoped>
.data-analysis {
  .chart-row {
    margin-top: 20px;
  }

  .chart-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chart-container {
      height: 400px;
    }
  }
}
</style>