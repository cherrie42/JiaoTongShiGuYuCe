exports.predictRiskLevel = (data) => {
  const { weather, road, light, time, location } = data

  let score = 0
  if (weather === 'rainy' || weather === 'foggy') score += 2
  if (road === 'icy' || road === 'snowy') score += 2
  if (light === 'high') score += 1

  let level = '低风险'
  if (score >= 4) level = '高风险'
  else if (score >= 2) level = '中风险'

  return {
    riskLevel: level,
    riskFactors: ['天气: ' + weather, '道路状况: ' + road, '交通流量: ' + light],
    suggestions: [
      { title: '减速慢行', content: '当前路况较差，建议减速，保持车距。' },
      { title: '避开高峰期', content: '交通流量较大，可选择错峰出行。' }
    ]
  }
}
