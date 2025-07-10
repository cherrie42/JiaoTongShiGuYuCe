const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testWeatherSegmentation() {
  console.log('=== 测试道路分段天气信息 ===\n');
  
  // 测试不同距离的分段
  const testCases = [
    { origin: '北京', destination: '天津', description: '短距离路线（约130公里）' },
    { origin: '北京', destination: '上海', description: '长距离路线（约1200公里）' },
    { origin: '广州', destination: '深圳', description: '短距离路线（约140公里）' },
    { origin: '成都', destination: '重庆', description: '中等距离路线（约300公里）' }
  ];
  
  for (const testCase of testCases) {
    console.log(`测试: ${testCase.description}`);
    console.log(`路线: ${testCase.origin} → ${testCase.destination}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/weather/route`, {
        params: {
          origin: testCase.origin,
          destination: testCase.destination,
          strategy: 'driving'
        }
      });
      
      // 打印完整返回内容，便于调试
      console.log('接口返回：', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.log('❌ API错误:', error.response.status, error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ 连接被拒绝，请确保后端服务器正在运行在端口3001上');
      } else {
        console.log('❌ 测试失败:', error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

// 运行测试
testWeatherSegmentation().catch(console.error); 