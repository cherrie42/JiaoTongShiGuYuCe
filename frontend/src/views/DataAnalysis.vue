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
              <span>事故地点分布图</span> <!-- 修改标题 -->
            </div>
          </template>
          <div id="amap-container" class="chart-container"></div> <!-- 修改为地图容器 -->
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
// const heatmapChart = ref(null) // 移除热力图引用
const typeChart = ref(null)
const weatherChart = ref(null)
const roadChart = ref(null)

// 图表实例
let trendChartInstance = null
// let heatmapChartInstance = null // 移除热力图实例
let typeChartInstance = null
let weatherChartInstance = null
let roadChartInstance = null

// 高德地图实例
let map = null;

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

// 初始化高德地图
const initAMap = async () => {
  // 确保 AMap 对象已加载
  if (!window.AMap) {
    ElMessage.error('高德地图SDK未加载，请检查index.html配置。');
    return;
  }

  map = new window.AMap.Map('amap-container', {
    zoom: 11, // 初始缩放级别
    center: [116.397428, 39.90923], // 初始中心点，例如北京天安门
    viewMode: '3D' // 使用3D视图
  });

  try {
    // 假设 /api/analysis/locations 返回事故地点的经纬度、天气和描述
    // 例如：[{ longitude: 116.39, latitude: 39.9, weather: '晴', description: '轻微刮蹭' }]
    const response = await axios.get('/api/analysis/locations'); // 新增或修改的API接口
    const locations = response.data;

    locations.forEach(item => {
      const marker = new window.AMap.Marker({
        position: [item.longitude, item.latitude],
        map: map,
        title: item.description || '事故地点'
      });

      // 添加信息窗体
      const infoWindow = new window.AMap.InfoWindow({
        content: `
          <div>
            <h3>事故地点</h3>
            <p>经纬度: ${item.longitude}, ${item.latitude}</p>
            <p>天气: ${item.weather || '未知'}</p>
            <p>描述: ${item.description || '无'}</p>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -30) // 偏移量
      });

      // 鼠标点击标记点时显示信息窗体
      marker.on('click', () => {
        infoWindow.open(map, marker.getPosition());
      });
    });

    // 如果有多个标记点，调整地图视野以包含所有标记点
    if (locations.length > 0) {
      const bounds = new window.AMap.Bounds();
      locations.forEach(item => {
        bounds.extend(new window.AMap.LngLat(item.longitude, item.latitude));
      });
      map.setFitView(null, false, [60, 60, 60, 60]); // 调整视野，留出边距
    }

  } catch (error) {
    ElMessage.error('获取事故地点数据失败');
    console.error('Error fetching map data:', error);
  }
};

// 移除 ECharts 热力图初始化函数
// const initHeatmapChart = async () => { /* ... */ }

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
  // heatmapChartInstance = echarts.init(heatmapChart.value) // 移除热力图实例创建
  typeChartInstance = echarts.init(typeChart.value)
  weatherChartInstance = echarts.init(weatherChart.value)
  roadChartInstance = echarts.init(roadChart.value)

  // 加载数据
  initTrendChart()
  initAMap() // 调用高德地图初始化函数
  initTypeChart()
  initWeatherChart()
  initRoadChart()

  // 响应式调整
  window.addEventListener('resize', () => {
    trendChartInstance.resize()
    // heatmapChartInstance.resize() // 移除热力图resize
    typeChartInstance.resize()
    weatherChartInstance.resize()
    roadChartInstance.resize()
    if (map) { // 地图也需要响应式调整
      map.checkResize();
    }
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