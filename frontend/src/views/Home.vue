<template>
  <el-container class="app-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo" @click="$router.push('/home')">
        <img src="@/image/logo.png" class="logo-img" />
        <span v-if="!isCollapse" class="logo-title">事故预测系统</span>
      </div>

      <el-menu
        :default-active="route.path"
        class="el-menu-vertical-demo"
        :collapse="isCollapse"
        :router="true"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/home/data">
          <el-icon><DataLine /></el-icon>
          <span>数据管理</span>
        </el-menu-item>
        <el-menu-item index="/home/route-planning">
          <el-icon><Location /></el-icon>
          <span>路线规划</span>
        </el-menu-item>
        <el-menu-item index="/home/prediction">
          <el-icon><TrendCharts /></el-icon>
          <span>事故预测</span>
        </el-menu-item>
        <el-menu-item index="/home/analysis">
          <el-icon><PieChart /></el-icon>
          <span>数据分析</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主体内容 -->
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="left">
          <el-button link @click="toggleCollapse">
            <el-icon>
              <component :is="isCollapse ? Expand : Fold" />
            </el-icon>
          </el-button>
        </div>
        <div class="right">
          <!-- 可添加用户头像、用户名、退出按钮等 -->
          <span class="username">管理员</span>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Fold, Expand, DataLine, TrendCharts, PieChart, Location } from '@element-plus/icons-vue'

const isCollapse = ref(false)
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const route = useRoute()
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
}

.sidebar {
  background-color: #001529;
  color: #fff;
  transition: width 0.2s;
  overflow: hidden;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    cursor: pointer;

    .logo-img {
      width: 32px;
      height: 32px;
      margin-right: 8px;
    }

    .logo-title {
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      white-space: nowrap;
    }
  }

  .el-menu {
    border-right: none;
  }
}

.header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .left {
    display: flex;
    align-items: center;
  }

  .right {
    .username {
      font-size: 14px;
      color: #000000;
    }
  }
}

.main-content {
  padding: 20px;
  overflow-y: auto;
  background-color: #f5f7fa;
}
</style>
