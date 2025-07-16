const axios = require('axios');

// 多组测试输入
const testInputs = [
  {
    crash_date: '2024-06-01',
    traffic_control_device: 'TRAFFIC SIGNAL',
    weather_condition: 'CLEAR',
    lighting_condition: 'DAYLIGHT',
    trafficway_type: 'FOUR WAY',
    alignment: 'STRAIGHT AND LEVEL',
    roadway_surface_cond: 'DRY',
    road_defect: 'NO DEFECTS',
    intersection_related_i: 'Y',
    crash_hour: 14,
    crash_day_of_week: 6,
    crash_month: 6
  },
  {
    crash_date: '2024-01-15',
    traffic_control_device: 'STOP SIGN',
    weather_condition: 'RAIN',
    lighting_condition: 'DARKNESS',
    trafficway_type: 'T-INTERSECTION',
    alignment: 'CURVE',
    roadway_surface_cond: 'WET',
    road_defect: 'POTHOLES',
    intersection_related_i: 'N',
    crash_hour: 22,
    crash_day_of_week: 1,
    crash_month: 1
  },
  {
    crash_date: '2024-03-10',
    traffic_control_device: 'NO CONTROLS',
    weather_condition: 'SNOW',
    lighting_condition: 'DAYLIGHT',
    trafficway_type: 'CENTER TURN LANE',
    alignment: 'STRAIGHT AND LEVEL',
    roadway_surface_cond: 'SNOW/SLUSH',
    road_defect: 'NO DEFECTS',
    intersection_related_i: 'Y',
    crash_hour: 8,
    crash_day_of_week: 7,
    crash_month: 3
  }
  // 可以继续添加更多场景
];

async function testModel() {
  for (let i = 0; i < testInputs.length; i++) {
    try {
      const response = await axios.post('http://localhost:3001/api/predict', testInputs[i]);
      console.log(`输入${i + 1} 预测结果:`, response.data);
    } catch (error) {
      if (error.response) {
        console.error(`输入${i + 1} 模型API返回错误:`, error.response.data);
      } else {
        console.error(`输入${i + 1} 请求模型API失败:`, error.message);
      }
    }
  }
}

testModel(); 