<template>
  <div class="home">
    <!-- 粒子背景 -->
    <Particles
      id="tsparticles"
      :options="particlesOptions"
      class="particles-bg"
    />

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
import { reactive } from 'vue'
import { DataLine, TrendCharts, PieChart, Location } from '@element-plus/icons-vue'

// 卡片数据
const cards = [
  {
    title: '数据管理',
    description: '管理历史事故数据，支持数据导入导出和编辑',
    icon: DataLine,
    path: '/home/data',
    roles: ['admin', 'user']
  },
  {
    title: '路径规划',
    description: '智能推荐路线并显示沿途天气和风险等级',
    icon: Location,
    path: '/home/route-planning',
    roles: ['admin', 'user']
  },
  {
    title: '事故预测',
    description: '基于机器学习的事故风险预测和分析',
    icon: TrendCharts,
    path: '/home/prediction',
    roles: ['admin', 'user']
  },
  {
    title: '数据分析',
    description: '多维度数据分析和可视化展示',
    icon: PieChart,
    path: '/home/analysis',
    roles: ['admin', 'user']
  }
]

// 粒子背景配置
const particlesOptions = reactive({
  background: {
    color: '#0f0f1c'
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: 'repulse'
      },
      resize: true
    },
    modes: {
      repulse: {
        distance: 100,
        duration: 0.4
      }
    }
  },
  particles: {
    color: { value: '#00eaff' },
    links: {
      color: '#00eaff',
      distance: 150,
      enable: true,
      opacity: 0.3,
      width: 1
    },
    collisions: { enable: false },
    move: {
      enable: true,
      speed: 1.5,
      direction: 'none',
      outModes: 'bounce'
    },
    number: {
      density: {
        enable: true,
        area: 800
      },
      value: 40
    },
    opacity: { value: 0.5 },
    shape: { type: 'circle' },
    size: { value: { min: 1, max: 3 } }
  },
  detectRetina: true
})
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500&display=swap');

.home {
  min-height: 100vh;
  padding: 30px 40px;
  /* background: #0f0f1c;  删除纯色背景 */
  
  background-image: url('@/image/3.jpg');
  background-size: cover;      /* 图片覆盖整个容器 */
  background-position: center; /* 图片居中显示 */
  background-repeat: no-repeat;
  
  font-family: 'Orbitron', sans-serif;
  color: #ffffff;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}


.particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.welcome-header {
  text-align: center;
  margin-bottom: 40px;
  position: relative;
  z-index: 2;

  .welcome-title {
    font-size: 2.4em;
    color: #00eaff;
    text-shadow: 0 0 10px #00eaff;
    margin-bottom: 10px;
    animation: fadeInDown 1s ease;
  }

  .welcome-subtitle {
    font-size: 1.2em;
    color: #aaa;
    animation: fadeIn 1.5s ease;
  }
}

.feature-cards {
  width: 100%;
  position: relative;
  z-index: 2;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 234, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  box-shadow: 0 0 12px rgba(0, 234, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 0 25px rgba(0, 234, 255, 0.3);
    border-color: rgba(0, 234, 255, 0.6);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .card-icon {
      margin-bottom: 15px;
      color: #00eaff;
      transition: transform 0.3s;

      &:hover {
        transform: scale(1.2) rotate(8deg);
      }
    }

    h3 {
      font-size: 1.2em;
      color: #e0f7ff;
      margin-bottom: 8px;
    }

    p {
      font-size: 0.95em;
      color: #ccc;
      line-height: 1.4;
    }
  }
}

/* 动画关键帧 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>