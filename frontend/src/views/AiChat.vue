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
import axios from 'axios'; // 假设您会使用 axios 进行后端通信

const messages = ref([
  { role: 'ai', content: '您好！我是您的智能助手，有什么可以帮助您的吗？' }
]);
const currentInput = ref('');
const isLoading = ref(false);
const chatMessages = ref(null); // 用于滚动到底部

const sendMessage = async () => {
  if (!currentInput.value.trim()) {
    ElMessage.warning('请输入内容！');
    return;
  }

  const userMessage = currentInput.value;
  messages.value.push({ role: 'user', content: userMessage });
  currentInput.value = '';
  scrollToBottom();

  isLoading.value = true;
  try {
    const response = await axios.post('http://localhost:4550/api/chat', {
      question: userMessage, // ✅必须是question字段
    });

    const aiResponse = response.data.answer || '抱歉，我暂时无法回答您的问题。'; // ✅后端返回字段是answer
    messages.value.push({ role: 'ai', content: aiResponse });
  } catch (error) {
    console.error('AI聊天请求失败:', error);
    messages.value.push({ role: 'ai', content: '抱歉，与AI助手的通信出现问题，请稍后再试。' });
    ElMessage.error('AI聊天请求失败！');
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};


const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
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
  order: 2; /* 用户头像在右侧 */
  margin-left: 10px;
  margin-right: 0;
}

.message-item.ai .avatar {
  order: 1; /* AI头像在左侧 */
  margin-right: 10px;
  margin-left: 0;
}

.message-item .content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  word-wrap: break-word;
  white-space: pre-wrap; /* 保留换行符和空格 */
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