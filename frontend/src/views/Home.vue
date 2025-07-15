<template>
  <el-container class="app-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo" @click="$router.push('/home')">
        <img src="@/image/logo.png" class="logo-img" />
        <span v-if="!isCollapse" class="logo-title">事故预测系统</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :router="true"
        background-color="#ffffff"
        text-color="#4A4A4A"
        active-text-color="#409EFF"
        class="menu"
      >
        <el-menu-item index="/home/data">
          <el-icon><DataLine /></el-icon><span>数据管理</span>
        </el-menu-item>
        <el-menu-item index="/home/route-planning">
          <el-icon><Location /></el-icon><span>路线规划</span>
        </el-menu-item>
        <el-menu-item index="/home/prediction">
          <el-icon><TrendCharts /></el-icon><span>事故预测</span>
        </el-menu-item>
        <el-menu-item index="/home/analysis">
          <el-icon><PieChart /></el-icon><span>数据分析</span>
        </el-menu-item>
        <el-menu-item index="/home/ai-chat">
          <el-icon><ChatDotRound /></el-icon><span>AI 聊天</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧主区域 -->
    <el-container>
      <el-header class="header">
        <div class="left">
          <el-button link @click="toggleCollapse">
            <el-icon><component :is="isCollapse ? Expand : Fold" /></el-icon>
          </el-button>
        </div>
        <div class="right">
          <el-dropdown trigger="click">
            <span class="el-dropdown-link">
              <el-avatar size="small" style="background-color: #409EFF">
                <el-icon><User /></el-icon>
              </el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goToUserManagement">用户管理</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, Expand, DataLine, TrendCharts, PieChart, Location, User, ChatDotRound } from '@element-plus/icons-vue'

const isCollapse = ref(false)
const toggleCollapse = () => (isCollapse.value = !isCollapse.value)
const router = useRouter()
const route = useRoute()
const goToUserManagement = () => router.push('/home/user-management')
const logout = () => router.push('/login')
</script>

<style lang="scss" scoped>
.app-container {
  height: 100vh;
  background: linear-gradient(135deg, #e6f0ff, #cce0ff);
  display: flex;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 侧边栏 */
.sidebar {
  background: rgba(204, 224, 255, 0.95);
  margin: 10px;
  border-radius: 18px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: 700;
    color: #1e3a8a;
    font-size: 22px;
    border-bottom: 1px solid rgba(150, 180, 255, 0.5);
    letter-spacing: 0.05em;

    .logo-img {
      width: 36px;
      height: 36px;
      margin-right: 10px;
      border-radius: 10px;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
    }
  }

  .menu {
    flex: 1;
    border-right: none;
    padding: 12px 0;

    .el-menu-item {
      height: 52px;
      line-height: 52px;
      margin: 6px 14px;
      border-radius: 14px;
      color: #2a4db7;
      font-weight: 500;
      display: flex;
      align-items: center;
      transition: all 0.3s ease;

      el-icon {
        font-size: 22px;
        margin-right: 12px;
        color: #4169e1;
        transition: color 0.3s ease;
      }

      &:hover {
        background: linear-gradient(90deg, #a2c0ff 0%, #638cff 100%);
        color: #fff;

        el-icon {
          color: #fff;
        }
        box-shadow: 0 8px 20px rgba(99, 140, 255, 0.4);
      }

      &.is-active {
        background: linear-gradient(90deg, #2e55d9 0%, #1742a1 100%);
        color: #e0e7ff;
        font-weight: 700;
        box-shadow: 0 10px 25px rgba(30, 58, 138, 0.7);

        el-icon {
          color: #e0e7ff;
        }
      }
    }
  }
}

/* 顶部导航栏 */
.header {
  background: linear-gradient(135deg, #a6b8ff, #d0dbff);
  margin: 10px;
  border-radius: 18px;
  box-shadow: 0 6px 24px rgba(80, 100, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;

  .left {
    el-button {
      border-radius: 50%;
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      color: #2e4ddb;

      &:hover {
        background-color: #5678ff;
        color: #fff;
        box-shadow: 0 6px 16px rgba(86, 120, 255, 0.75);
      }

      el-icon {
        font-size: 24px;
      }
    }
  }

  .right {
    .el-dropdown-link {
      cursor: pointer;
      display: flex;
      align-items: center;

      .el-avatar {
        background: linear-gradient(135deg, #617cff, #4169e1);
        transition: box-shadow 0.3s ease;
      }

      &:hover .el-avatar {
        box-shadow: 0 0 10px 3px rgba(81, 107, 255, 0.8);
      }
    }
  }
}

/* 主内容区域 */
.main-content {
  background: linear-gradient(135deg, #e2e8ff, #b8caff);
  margin: 10px;
  border-radius: 18px;
  box-shadow: inset 0 0 25px rgba(80, 90, 220, 0.15);
  padding: 30px;
  overflow-y: auto;
  min-height: calc(100vh - 100px);
  color: #2b3a8d;
  font-size: 16px;
  line-height: 1.6;
  transition: background 0.3s ease;
}

/* 统一字体颜色 */
.sidebar,
.header,
.main-content {
  color: #2b3a8d;
}

/* 滚动条美化 */
.main-content::-webkit-scrollbar {
  width: 10px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(170, 190, 255, 0.3);
  border-radius: 10px;
}

.main-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #5678ff, #2e4ddb);
  border-radius: 10px;
}

/* 链接样式示例 */
a {
  color: #3f5dd1;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #1e2f91;
    text-decoration: underline;
  }
}
</style>