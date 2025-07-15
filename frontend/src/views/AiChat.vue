<template> 
  <div class="ai-chat-container">
    <el-card
      class="chat-card"
      :body-style="{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }"
    >
      <template #header>
        <div class="card-header">道路安全助手</div>
      </template>

      <!-- 聊天消息区域 -->
      <div class="chat-messages" ref="chatMessages">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message-item', message.role]"
        >
          <div class="avatar">
            <el-avatar v-if="message.role === 'user'" :icon="UserFilled" />
            <el-avatar v-else :icon="Cpu" />
          </div>
          <div class="content">
            <div class="text">{{ message.content }}</div>
            <!-- AI 思考中的等待效果 -->
            <div v-if="message.role === 'ai' && isLoading && message.content === ''" class="loading-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 常见问题 (固定在消息上方) -->
      <div class="quick-questions">
        <el-tag
          v-for="(q, idx) in quickQuestions"
          :key="idx"
          type="info"
          class="quick-tag"
          @click="sendQuickQuestion(q)"
        >
          {{ q }}
        </el-tag>
      </div>

      <!-- 输入框 (固定在最下方) -->
      <div class="chat-input">
        <el-input
          v-model="currentInput"
          placeholder="请输入您的问题..."
          @keyup.enter="sendMessage"
          clearable
        >
          <template #append>
            <el-button :icon="Promotion" @click="sendMessage" :loading="isLoading">发送</el-button>
          </template>
        </el-input>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue';
import { UserFilled, Cpu, Promotion } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const messages = ref([
  { role: 'ai', content: '您好，我是道路安全助手，请问有什么可以为我服务？' }
]);
const currentInput = ref('');
const isLoading = ref(false);
const chatMessages = ref(null);

const quickQuestions = [
  '雨天出行注意什么？',
  '高峰期怎么避堵？',
  '骑电动车有什么风险？',
  '夜间开车注意什么？',
  '我怎么规划安全路线？'
];

const quickAnswers = {
  '雨天出行注意什么？': '雨天路滑，低速慢行，避开井盖，行车保持车距。',
  '高峰期怎么避堵？': '建议错峰出行或使用实时导航避开高峰路段。',
  '骑电动车有什么风险？': '注意佩戴头盔，雨天慢行防滑，避开机动车道。',
  '夜间开车注意什么？': '注意开近光灯，避免疲劳驾驶，减速慢行。',
  '我怎么规划安全路线？': '请提供起点和终点，我帮您推荐低风险路线。'
};

function scrollToBottom() {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
  });
}

function sendQuickQuestion(q) {
  if (quickAnswers[q]) {
    messages.value.push({ role: 'user', content: q });
    scrollToBottom();
    messages.value.push({ role: 'ai', content: quickAnswers[q] });
    scrollToBottom();
  } else {
    currentInput.value = q;
    sendMessage();
  }
}

function sendMessage() {
  if (!currentInput.value.trim()) {
    ElMessage.warning('请输入内容！');
    return;
  }

  const userMessage = currentInput.value;
  messages.value.push({ role: 'user', content: userMessage });
  currentInput.value = '';
  scrollToBottom();

  isLoading.value = true;
  messages.value.push({ role: 'ai', content: '' });
  const aiIdx = messages.value.length - 1;

  const encoded = encodeURIComponent(userMessage);
  // 注意：这里的URL需要是您实际的后端服务地址
  const evtSource = new EventSource(`http://localhost:4550/api/chat/stream?question=${encoded}`);

  evtSource.onmessage = (event) => {
    // 移除星号和转义的换行符
    messages.value[aiIdx].content += event.data.replace(/\*/g, '').replace(/\\n/g, '\n');
    scrollToBottom();
  };

  evtSource.addEventListener('end', () => {
    isLoading.value = false;
    evtSource.close();
  });

  evtSource.onerror = () => {
    ElMessage.error('AI服务连接异常，请稍后重试');
    if (messages.value[aiIdx].content === '') {
      messages.value[aiIdx].content = '抱歉，AI服务连接中断。';
    }
    isLoading.value = false;
    evtSource.close();
  };
}

onMounted(() => {
  scrollToBottom();
});

watch(messages, () => {
  scrollToBottom();
}, { deep: true });
</script>

<style>
/* 全局样式：确保html和body占据整个视口高度，并隐藏可能出现的全局滚动条 */
html, body, #app { /* 如果您的Vue应用挂载在id为app的div上，也需要设置它 */
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 隐藏浏览器默认的滚动条，只允许内部元素滚动 */
}
</style>

<style scoped>
.ai-chat-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; /* 容器占满视口高度 */
  background: linear-gradient(to right, #f8f0ff, #f0e6ff); /* 更浅的淡紫色渐变背景 */
  padding: 20px;
  box-sizing: border-box;
}

.chat-card {
  width: 100%;
  max-width: 1200px; /* 增加最大宽度 */
  height: 90vh; /* 增加高度 */
  display: flex;
  flex-direction: column; /* 垂直布局 */
  border-radius: 16px; /* 增加圆角 */
  overflow: hidden; /* 防止内容溢出卡片 */
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15); /* 增强阴影效果 */
  background-color: rgba(255, 255, 255, 0.6); /* 半透明白色背景 */
  backdrop-filter: blur(20px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(20px); /* Safari兼容性 */
}

.card-header {
  flex-shrink: 0; /* 不会收缩，保持固定高度 */
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px; /* 调整内边距 */
  background-color: rgba(190, 160, 250, 0.8); /* 更改为更浅的半透明淡紫色 */
  color: #fff;
  font-size: 24px; /* 稍微增大字体 */
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 头部底部阴影 */
  z-index: 1; /* 确保阴影在消息上方 */
  backdrop-filter: blur(10px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(10px); /* Safari兼容性 */
}

.chat-messages {
  flex-grow: 1; /* 占据所有可用空间 */
  min-height: 0; /* 允许在flex容器中正确收缩，使overflow-y: auto生效 */
  overflow-y: auto; /* 消息区域内部滚动 */
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.8); /* 半透明白色背景，保持可读性 */
  scrollbar-width: thin;
  scrollbar-color: #d8bfff transparent; /* 调整滚动条颜色为更浅的淡紫色 */
}

.chat-messages::-webkit-scrollbar {
  width: 8px; /* 稍微增大滚动条宽度 */
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #d8bfff; /* 调整滚动条颜色为更浅的淡紫色 */
  border-radius: 4px; /* 调整滚动条圆角 */
}

.quick-questions {
  flex-shrink: 0; /* 不会收缩，保持固定高度 */
  max-height: 90px; /* 稍微增加高度 */
  overflow-y: auto; /* 常见问题区域内部滚动 */
  background-color: rgba(250, 245, 255, 0.8); /* 更改为更浅的半透明淡紫色背景 */
  border-top: 1px solid rgba(224, 224, 224, 0.5); /* 调整边框颜色为半透明 */
  border-bottom: 1px solid rgba(224, 224, 224, 0.5);
  padding: 12px 20px; /* 调整内边距 */
  display: flex;
  flex-wrap: wrap; /* 允许标签换行 */
  gap: 12px; /* 增加标签间距 */
  backdrop-filter: blur(8px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(8px); /* Safari兼容性 */
}

.quick-tag {
  cursor: pointer;
  white-space: nowrap; /* 防止标签文本换行 */
  background-color: rgba(240, 230, 255, 0.9); /* 标签背景色为更浅的淡紫色，略微透明 */
  color: #c0a0ff; /* 标签文字颜色为更浅的淡紫色 */
  border: 1px solid rgba(210, 180, 255, 0.7); /* 标签边框为更浅的淡紫色，略微透明 */
  border-radius: 20px; /* 更大的圆角 */
  padding: 6px 14px; /* 调整内边距 */
  transition: all 0.2s ease-in-out; /* 添加过渡效果 */
}

.quick-tag:hover {
  background-color: #c0a0ff; /* 悬停背景色为更浅的淡紫色 */
  color: #fff; /* 悬停文字颜色 */
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); /* 悬停阴影 */
  transform: translateY(-2px); /* 悬停上浮效果 */
}

.chat-input {
  flex-shrink: 0; /* 不会收缩，保持固定高度 */
  height: 70px; /* 稍微增加高度 */
  padding: 12px 20px; /* 调整内边距 */
  background-color: rgba(255, 255, 255, 0.8); /* 半透明白色背景 */
  border-top: 1px solid rgba(224, 224, 224, 0.5); /* 调整边框颜色为半透明 */
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05); /* 顶部阴影 */
  display: flex; /* 使输入框和按钮对齐 */
  align-items: center;
  backdrop-filter: blur(8px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(8px); /* Safari兼容性 */
}

/* 消息样式 */
.message-item {
  display: flex;
  margin-bottom: 18px; /* 增加消息间距 */
  animation: fadeInSlideUp 0.3s ease-out forwards; /* 淡入上滑动画 */
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.ai {
  justify-content: flex-start;
}

.avatar {
  margin: 0 12px; /* 调整头像间距 */
}

.content {
  max-width: 70%; /* 稍微缩小最大宽度 */
  padding: 14px 18px; /* 调整内边距 */
  border-radius: 18px; /* 增加圆角 */
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* 增强气泡阴影 */
}

.message-item.user .content {
  background-color: rgba(190, 160, 250, 0.9); /* 用户气泡背景为更浅的淡紫色，略微透明 */
  color: #fff;
  border-bottom-right-radius: 6px; /* 调整气泡角 */
}

.message-item.ai .content {
  background-color: rgba(250, 245, 255, 0.9); /* AI气泡背景为更浅的淡紫色，略微透明 */
  color: #333;
  border-bottom-left-radius: 6px; /* 调整气泡角 */
}

/* AI 思考中的加载指示器样式 */
.loading-indicator {
  display: flex;
  align-items: center;
  height: 20px; /* 确保有足够空间显示点 */
}

.loading-indicator span {
  width: 8px;
  height: 8px;
  background-color: #c0a0ff; /* 与淡紫色主题保持一致 */
  border-radius: 50%;
  margin: 0 3px;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

/* 动画定义 */
@keyframes fadeInSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>