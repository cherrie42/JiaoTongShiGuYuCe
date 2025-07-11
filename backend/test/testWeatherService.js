const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';

// 测试前端发送的数据
async function testWeatherServiceData() {
  console.log('🧪 测试 WeatherService 接收到的数据\n');

  // 模拟前端发送的数据
  const frontendData = {
    origin: '北京',
    destination: '上海',
    departTime: new Date().toISOString(),
    vehicleType: '小客车'
  };

  console.log('📤 前端发送的数据:');
  console.log(JSON.stringify(frontendData, null, 2));
  console.log('');

  try {
    const response = await axios.post(`${BASE_URL}/api/plan`, frontendData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 后端返回的数据:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('错误详情:', error.response.data);
    }
  }
}

// 运行测试
async function runTest() {
  console.log('=' * 50);
  console.log('🔍 WeatherService 数据接收测试');
  console.log('=' * 50);

  await testWeatherServiceData();

  console.log('\n' + '=' * 50);
  console.log('🏁 测试完成');
  console.log('=' * 50);
}

runTest().catch(console.error); 