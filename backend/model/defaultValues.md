# 交通事故预测模型 - 缺失值默认值策略

## 概述
当输入数据缺失时，模型会使用以下策略来处理缺失值，确保预测的准确性。

## 默认值策略

### 分类特征默认值

| 特征名称 | 默认值 | 编码值 | 选择理由 |
|---------|--------|--------|----------|
| `traffic_control_device` | "NO CONTROLS" | 2 | 最常见的交通控制状态 |
| `weather_condition` | "CLEAR" | 0 | 晴天是最常见的天气条件 |
| `lighting_condition` | "DAYLIGHT" | 0 | 白天是最常见的照明条件 |
| `trafficway_type` | "NOT DIVIDED" | 0 | 最常见的道路类型 |
| `alignment` | "STRAIGHT AND LEVEL" | 0 | 最常见的道路线形 |
| `roadway_surface_cond` | "DRY" | 0 | 干燥路面是最常见的状况 |
| `road_defect` | "NO DEFECTS" | 0 | 无缺陷是最常见的道路状况 |
| `intersection_related_i` | "N" | 1 | 非交叉口相关的事故更常见 |

### 数值特征默认值

| 特征名称 | 默认值 | 选择理由 |
|---------|--------|----------|
| `crash_hour` | 12 | 中午12点，一天中的中间时间 |
| `crash_day_of_week` | 1 | 周一，一周的开始 |
| `crash_month` | 6 | 6月，一年中的中间月份 |

### 日期特征默认值
- `crash_date`: 使用当前系统日期

## 缺失值识别

系统会将以下情况识别为缺失值：
- `null` 或 `undefined`
- 空字符串 `""`
- 字符串 "unknown"（不区分大小写）
- 字符串 "not reported"（不区分大小写）

## 使用建议

1. **优先使用真实数据**：尽可能提供完整的真实数据
2. **了解默认值影响**：默认值基于训练数据中的最常见值，但可能影响预测准确性
3. **记录缺失情况**：建议记录哪些特征使用了默认值，以便后续分析
4. **定期更新**：随着数据变化，可能需要调整默认值策略

## 代码示例

```javascript
// 使用默认值进行预测
const predictionData = {
  traffic_control_device: null,  // 将使用 "NO CONTROLS"
  weather_condition: "unknown",  // 将使用 "CLEAR"
  crash_hour: undefined,         // 将使用 12
  // ... 其他特征
};

const probability = predictor.predictSingle(predictionData);
```

## 注意事项

- 默认值策略基于训练数据的分布
- 大量使用默认值可能降低预测准确性
- 建议在应用层面记录缺失值的使用情况
- 定期评估默认值策略的有效性 