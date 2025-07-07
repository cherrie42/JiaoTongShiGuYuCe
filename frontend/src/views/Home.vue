<template>
  <div class="home">
    <el-row :gutter="20">
      <el-col :span="24">
        <h1 class="welcome-title">交通事故预测系统</h1>
        <p class="welcome-subtitle">基于机器学习的智能预测分析平台</p>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="feature-cards">
      <el-col :span="8">
        <el-card shadow="hover" @click="$router.push('/data')">
          <template #header>
            <div class="card-header">
              <el-icon><DataLine /></el-icon>
              <span>数据管理</span>
            </div>
          </template>
          <div class="card-content">
            管理历史事故数据，支持数据导入导出和编辑
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" @click="$router.push('/prediction')">
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span>事故预测</span>
            </div>
          </template>
          <div class="card-content">
            基于机器学习的事故风险预测和分析
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" @click="$router.push('/analysis')">
          <template #header>
            <div class="card-header">
              <el-icon><PieChart /></el-icon>
              <span>数据分析</span>
            </div>
          </template>
          <div class="card-content">
            多维度数据分析和可视化展示
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { DataLine, TrendCharts, PieChart } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
.home {
  padding: 20px;
}

.welcome-title {
  text-align: center;
  font-size: 2.5em;
  color: #409EFF;
  margin-bottom: 10px;
}

.welcome-subtitle {
  text-align: center;
  font-size: 1.2em;
  color: #909399;
  margin-bottom: 40px;
}

.feature-cards {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2em;
}

.el-card {
  cursor: pointer;
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-5px);
  }
}

.card-content {
  color: #606266;
  line-height: 1.5;
}
</style>