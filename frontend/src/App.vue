<template>
  <el-container class="app-container">
    <el-header>
      <el-menu mode="horizontal" :router="true">
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          首页
        </el-menu-item>
        <el-menu-item index="/data">
          <el-icon><DataLine /></el-icon>
          数据管理
        </el-menu-item>
        <el-menu-item index="/prediction">
          <el-icon><TrendCharts /></el-icon>
          事故预测
        </el-menu-item>
        <el-menu-item index="/analysis">
          <el-icon><PieChart /></el-icon>
          数据分析
        </el-menu-item>

        <!-- ✅ 新增“路线规划”模块 -->
        <el-menu-item index="/route-planning">
          <el-icon><Location /></el-icon>
          路线规划
        </el-menu-item>
      </el-menu>
    </el-header>
    <el-main>
      <router-view></router-view>
    </el-main>
  </el-container>
</template>

<script setup>
import { HomeFilled, DataLine, TrendCharts, PieChart, Location } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
}

.el-header {
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.el-menu {
  border: none;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
