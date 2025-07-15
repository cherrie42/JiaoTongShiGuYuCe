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
  { role: 'ai', content: '您好，我是道路安全助手，请问有什么可以为你服务？' }
]);
const currentInput = ref('');
const isLoading = ref(false);
const chatMessages = ref(null);

const quickQuestions = [
  '雨天出行注意什么？',
  '出门前需要检查什么？',
  '骑电动车有什么风险？',
  '夜间开车注意什么？',
  '我怎么规划安全路线？'
];

const quickAnswers = {
  '雨天出行注意什么？': '雨天路滑，低速慢行，避开井盖，行车保持车距。',
  '出门前需要检查什么？': '出门前请检查轮胎状况、刹车是否正常，确保油量充足，雨刮器有效。',
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

<style scoped>
.ai-chat-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90vh; /* 容器占满视口高度 */
  background: linear-gradient(120deg, #c8dafd 0%, #d8e3ff 60%, #eaf0ff 100%); /* 更柔和的蓝紫渐变背景 */
  padding: 20px;
  box-sizing: border-box;
}

.chat-card {
  width: 100%;
  max-width: 1200px; /* 最大宽度 */
  height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(50, 90, 230, 0.15); /* 蓝紫色柔和阴影 */
  background-color: rgba(245, 250, 255, 0.75); /* 半透明白蓝色 */
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(140, 170, 255, 0.4);
}

.card-header {
  flex-shrink: 0;
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: linear-gradient(90deg, #8eaaff, #7a92f7);
  color: #ffffff;
  font-size: 26px;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(86, 116, 255, 0.3);
  z-index: 1;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  letter-spacing: 0.05em;
}

.chat-messages {
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 0 0 20px 20px;
  scrollbar-width: thin;
  scrollbar-color: #a0b8ff transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 9px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #7a92f7, #4e67db);
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.quick-questions {
  flex-shrink: 0;
  max-height: 90px;
  overflow-y: auto;
  background-color: rgba(160, 190, 255, 0.15);
  border-top: 1px solid rgba(140, 170, 255, 0.3);
  border-bottom: 1px solid rgba(140, 170, 255, 0.3);
  padding: 14px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 0 0 20px 20px;
}

.quick-tag {
  cursor: pointer;
  white-space: nowrap;
  background: linear-gradient(135deg, #9caeff, #6682ff);
  color: #e6ebff;
  border: none;
  border-radius: 24px;
  padding: 8px 18px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 3px 8px rgba(85, 110, 230, 0.4);
  transition: all 0.25s ease-in-out;
}

.quick-tag:hover {
  background: linear-gradient(135deg, #5c7aff, #3b54e3);
  color: #fff;
  box-shadow: 0 6px 15px rgba(60, 80, 220, 0.7);
  transform: translateY(-3px);
}

.chat-input {
  flex-shrink: 0;
  height: 72px;
  padding: 16px 24px;
  background-color: rgba(230, 240, 255, 0.9);
  border-top: 1px solid rgba(140, 170, 255, 0.4);
  box-shadow: 0 -3px 12px rgba(80, 100, 255, 0.15);
  display: flex;
  align-items: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .el-input {
    flex-grow: 1;
    border-radius: 36px;
    background: white;
  }

  .el-input__inner {
    border-radius: 36px !important;
    padding-left: 20px !important;
    font-size: 16px;
    color: #2d3e8c;
  }

  .el-button {
    margin-left: 14px;
    background: linear-gradient(135deg, #5b7aff, #2e48dd);
    color: white;
    font-weight: 600;
    border-radius: 36px;
    padding: 10px 24px;
    transition: background 0.3s ease;

    &:hover {
      background: linear-gradient(135deg, #4666e6, #1e32b8);
      box-shadow: 0 5px 18px rgba(40, 60, 200, 0.8);
    }
  }
}

/* 消息样式 */
.message-item {
  display: flex;
  margin-bottom: 20px;
  animation: fadeInSlideUp 0.35s ease forwards;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.ai {
  justify-content: flex-start;
}

.avatar {
  margin: 0 14px;
  .el-avatar {
    background: linear-gradient(135deg, #4a69d7, #2d3e8c);
    color: white;
    box-shadow: 0 4px 12px rgba(60, 90, 200, 0.5);
  }
}

.content {
  max-width: 72%;
  padding: 16px 20px;
  border-radius: 20px;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 4px 14px rgba(40, 80, 230, 0.15);
  font-size: 16px;
  line-height: 1.5;
  user-select: text;
}

.message-item.user .content {
  background: linear-gradient(135deg, #7a9aff, #3e65d9);
  color: #f0f6ff;
  border-bottom-right-radius: 8px;
  box-shadow: 0 6px 20px rgba(50, 80, 230, 0.45);
}

.message-item.ai .content {
  background: linear-gradient(135deg, #dae3ff, #b5c5ff);
  color: #24305e;
  border-bottom-left-radius: 8px;
  box-shadow: 0 6px 18px rgba(100, 120, 230, 0.25);
}

/* AI 加载动画 */
.loading-indicator {
  display: flex;
  align-items: center;
  height: 22px;
}

.loading-indicator span {
  width: 9px;
  height: 9px;
  background: linear-gradient(135deg, #7a92f7, #4e67db);
  border-radius: 50%;
  margin: 0 4px;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

/* 动画 */
@keyframes fadeInSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
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
