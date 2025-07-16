const axios = require('axios');

// 构造一组测试输入特征（请根据你的模型实际特征调整）
const testInput = {
  crash_date: '2024-06-01',
  traffic_control_device: 'TRAFFIC SIGNAL',
  weather_condition: 'CLEAR',
  lighting_condition: 'DARKNESS',
  trafficway_type: 'FOUR WAY',
  alignment: 'STRAIGHT AND LEVEL',
  roadway_surface_cond: 'ICE',
  road_defect: 'NO DEFECTS',
  intersection_related_i: 'Y',
  crash_hour: 14,
  crash_day_of_week: 6,
  crash_month: 6
};

async function testModel() {
  try {
    const response = await axios.post('http://localhost:3001/api/predict', testInput);
    console.log('模型输出结果:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('模型API返回错误:', error.response.data);
    } else {
      console.error('请求模型API失败:', error.message);
    }
  }
}

testModel(); 