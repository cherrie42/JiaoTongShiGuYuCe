// testClient.js
const axios = require('axios');

async function testChat() {
  try {
    const res = await axios.post('http://localhost:3000/api/chat', {
      question: '雨天驾驶车辆有什么风险？'
    });
    console.log('回答:', res.data.answer);
  } catch (err) {
    console.error('请求失败:', err.response?.data || err.message);
  }
}

testChat();
