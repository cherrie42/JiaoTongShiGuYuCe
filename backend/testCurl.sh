#!/bin/bash

echo "🚀 开始使用curl测试后端API接口..."
echo ""

# 测试模型状态接口
echo "📊 测试模型状态接口..."
curl -s http://localhost:3001/api/model-status | jq .
echo ""

# 测试特征重要性接口
echo "📊 测试特征重要性接口..."
curl -s http://localhost:3001/api/feature-importance | jq .
echo ""

# 测试预测接口
echo "📊 测试预测接口..."
curl -s -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "crash_date": "2023-01-15",
    "traffic_control_device": "Traffic Signal",
    "weather_condition": "Clear",
    "lighting_condition": "Daylight",
    "first_crash_type": "Rear End",
    "trafficway_type": "Two-Way, Not Divided",
    "alignment": "Straight",
    "roadway_surface_cond": "Dry",
    "road_defect": "None",
    "intersection_related_i": "Non-Intersection",
    "crash_hour": 14,
    "crash_day_of_week": 1,
    "crash_month": 1
  }' | jq .
echo ""

echo "✅ curl测试完成！" 