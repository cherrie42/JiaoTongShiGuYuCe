const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🚀 开始测试后端API接口...\n');
  
  try {
    // 1. 测试模型状态接口
    console.log('📊 测试模型状态接口...');
    const statusResponse = await axios.get(`${BASE_URL}/model/status`);
    console.log('✅ 模型状态:', statusResponse.data);
    
    // 2. 测试特征重要性接口
    console.log('\n📊 测试特征重要性接口...');
    const importanceResponse = await axios.get(`${BASE_URL}/feature/importance`);
    console.log('✅ 特征重要性:', importanceResponse.data);
    
    // 3. 测试预测接口
    console.log('\n📊 测试预测接口...');
    const testData = {
      crash_date: '2023-01-15',
      traffic_control_device: 'Traffic Signal',
      weather_condition: 'Clear',
      lighting_condition: 'Daylight',
      first_crash_type: 'Rear End',
      trafficway_type: 'Two-Way, Not Divided',
      alignment: 'Straight',
      roadway_surface_cond: 'Dry',
      road_defect: 'None',
      intersection_related_i: 'Non-Intersection',
      crash_hour: 14,
      crash_day_of_week: 1,
      crash_month: 1
    };
    
    const predictionResponse = await axios.post(`${BASE_URL}/predict`, testData);
    console.log('✅ 预测结果:', predictionResponse.data);
    
    // 4. 测试多个预测案例
    console.log('\n📊 测试多个预测案例...');
    const testCases = [
      {
        name: '晴天白天追尾事故',
        data: {
          crash_date: '2023-01-15',
          traffic_control_device: 'Traffic Signal',
          weather_condition: 'Clear',
          lighting_condition: 'Daylight',
          first_crash_type: 'Rear End',
          trafficway_type: 'Two-Way, Not Divided',
          alignment: 'Straight',
          roadway_surface_cond: 'Dry',
          road_defect: 'None',
          intersection_related_i: 'Non-Intersection',
          crash_hour: 14,
          crash_day_of_week: 1,
          crash_month: 1
        }
      },
      {
        name: '雨天夜间角度碰撞',
        data: {
          crash_date: '2023-06-20',
          traffic_control_device: 'Stop Sign',
          weather_condition: 'Rain',
          lighting_condition: 'Dark - Street Lights On',
          first_crash_type: 'Angle',
          trafficway_type: 'Two-Way, Not Divided',
          alignment: 'Curve',
          roadway_surface_cond: 'Wet',
          road_defect: 'None',
          intersection_related_i: 'Intersection',
          crash_hour: 22,
          crash_day_of_week: 3,
          crash_month: 6
        }
      },
      {
        name: '雪天夜间侧滑事故',
        data: {
          crash_date: '2023-12-10',
          traffic_control_device: 'No Control',
          weather_condition: 'Snow',
          lighting_condition: 'Dark - No Street Lights',
          first_crash_type: 'Sideswipe',
          trafficway_type: 'One-Way',
          alignment: 'Straight',
          roadway_surface_cond: 'Snow/Slush',
          road_defect: 'Pothole',
          intersection_related_i: 'Non-Intersection',
          crash_hour: 8,
          crash_day_of_week: 7,
          crash_month: 12
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📊 测试案例: ${testCase.name}`);
      console.log(`  天气: ${testCase.data.weather_condition}`);
      console.log(`  照明: ${testCase.data.lighting_condition}`);
      console.log(`  事故类型: ${testCase.data.first_crash_type}`);
      console.log(`  道路状况: ${testCase.data.roadway_surface_cond}`);
      
      const response = await axios.post(`${BASE_URL}/predict`, testCase.data);
      const prediction = response.data.prediction;
      
      console.log(`  预测事故严重程度: ${prediction.toFixed(2)} 分`);
      
      // 根据预测值给出严重程度评估
      let severity = '';
      if (prediction < 20) severity = '轻微';
      else if (prediction < 40) severity = '一般';
      else if (prediction < 60) severity = '严重';
      else severity = '非常严重';
      
      console.log(`  严重程度评估: ${severity}`);
    }
    
    console.log('\n✅ 所有API测试完成！');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API错误:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ 连接被拒绝，请确保后端服务器正在运行在端口3001上');
    } else {
      console.error('❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
testAPI(); 