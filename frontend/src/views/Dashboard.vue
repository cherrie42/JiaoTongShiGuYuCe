<template>
  <div class="home">
    <div class="welcome-header">
      <h1 class="welcome-title">交通事故预测系统</h1>
      <p class="welcome-subtitle">基于机器学习的智能预测分析平台</p>
    </div>

    <el-row class="feature-cards" :gutter="20">
      <el-col
        v-for="card in cards"
        :key="card.title"
        :xs="24"
        :sm="12"
        :md="12"
        :lg="12"
        :xl="12"
      >
        <el-card class="feature-card" shadow="hover" @click="$router.push(card.path)">
          <div class="card-body">
            <el-icon :size="28" class="card-icon">
              <component :is="card.icon" />
            </el-icon>
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { DataLine, TrendCharts, PieChart, Location } from '@element-plus/icons-vue'

// 路径都加上 /home 前缀，和路由保持一致
const cards = [
  {
    title: '数据管理',
    description: '管理历史事故数据，支持数据导入导出和编辑',
    icon: DataLine,
    path: '/home/data'
  },
  {
    title: '路径规划',
    description: '智能推荐路线并显示沿途天气和风险等级',
    icon: Location,
    path: '/home/route-planning'
  },
  {
    title: '事故预测',
    description: '基于机器学习的事故风险预测和分析',
    icon: TrendCharts,
    path: '/home/prediction'
  },
  {
    title: '数据分析',
    description: '多维度数据分析和可视化展示',
    icon: PieChart,
    path: '/home/analysis'
  }
]
</script>

<style scoped lang="scss">
.home {
  min-height: 100vh;
  padding: 30px 40px;
  background: #f5f7fa;
  box-sizing: border-box;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;

  .welcome-title {
    font-size: 2.4em;
    color: #409eff;
    margin-bottom: 10px;
  }

  .welcome-subtitle {
    font-size: 1.2em;
    color: #666;
  }
}

.feature-cards {
  width: 100%;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  height: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .card-icon {
      margin-bottom: 15px;
      color: #409eff;
      transition: transform 0.3s;

      &:hover {
        transform: rotate(10deg);
      }
    }

    h3 {
      font-size: 1.2em;
      color: #333;
      margin-bottom: 8px;
    }

    p {
      font-size: 0.95em;
      color: #666;
      line-height: 1.4;
    }
  }
}
</style>
