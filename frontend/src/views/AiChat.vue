<template>
  <div class="ai-chat-container">
    <el-card class="chat-card">
      <template #header>
        <div class="card-header">
          <span>AI 智能助手</span>
        </div>
      </template>

      <div class="chat-messages" ref="chatMessages">
        <div v-for="(message, index) in messages" :key="index" :class="['message-item', message.role]">
          <div class="avatar">
            <el-avatar v-if="message.role === 'user'" :icon="UserFilled" />
            <el-avatar v-else :icon="Cpu" />
          </div>
          <div class="content">
            <div class="text">{{ message.content }}</div>
          </div>
        </div>
      </div>

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
import { ref, nextTick } from 'vue';
import { UserFilled, Cpu, Promotion } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const messages = ref([
  { role: 'ai', content: '您好！我是您的智能助手，有什么可以帮助您的吗？' }
]);
const currentInput = ref('');
const isLoading = ref(false);
const chatMessages = ref(null);

function scrollToBottom() {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
  });
}

const sendMessage = () => {
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
  const aiMsgIndex = messages.value.length - 1;

  const encodedQuestion = encodeURIComponent(userMessage);
  const evtSource = new EventSource(`http://localhost:4550/api/chat/stream?question=${encodedQuestion}`);

  evtSource.onmessage = (event) => {
    // 去掉所有星号，替换 \\n 为真实换行符
    messages.value[aiMsgIndex].content += event.data.replace(/\*/g, '').replace(/\\n/g, '\n');
    scrollToBottom();
  };

  evtSource.addEventListener('end', () => {
    isLoading.value = false;
    evtSource.close();
  });

  evtSource.addEventListener('error', (e) => {
    ElMessage.error('与AI通信出错，请稍后重试');
    messages.value[aiMsgIndex].content += '\n[错误] 无法获取回答。';
    isLoading.value = false;
    evtSource.close();
  });
};
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.chat-card {
  width: 100%;
  max-width: 800px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  overflow: hidden;
}

.chat-card .card-header {
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.chat-messages {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9f9f9;
  display: flex;
  flex-direction: column;
}

.message-item {
  display: flex;
  margin-bottom: 15px;
  align-items: flex-start;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.ai {
  justify-content: flex-start;
}

.message-item .avatar {
  flex-shrink: 0;
  margin: 0 10px;
}

.message-item.user .avatar {
  order: 2;
  margin-left: 10px;
  margin-right: 0;
}

.message-item.ai .avatar {
  order: 1;
  margin-right: 10px;
  margin-left: 0;
}

.message-item .content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  word-wrap: break-word;
  white-space: pre-wrap; /* 重要：保留换行符显示 */
}

.message-item.user .content {
  background-color: #409eff;
  color: white;
  border-bottom-right-radius: 0;
}

.message-item.ai .content {
  background-color: #e4e7ed;
  color: #333;
  border-bottom-left-radius: 0;
}

.chat-input {
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
  background-color: #fff;
}

.chat-input .el-input {
  width: 100%;
}
</style>
