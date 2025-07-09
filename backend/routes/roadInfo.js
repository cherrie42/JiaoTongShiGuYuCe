const express = require('express')
const axios = require('axios')
const router = express.Router()

const GAODE_KEY = '你的高德key'

// 将 [{ lng, lat }] 转为 "lng1,lat1|lng2,lat2|..."
function formatPath(path) {
  return path.map(p => `${p.lng},${p.lat}`).join('|')
}

// 对道路名称和等级做分类
function analyzeRoadInfo(points) {
  const stats = {
    total: points.length,
    roadCount: {},
    levelCount: {
      expressway: 0,   // 高速
      trunk: 0,        // 主干道
      secondary: 0,    // 次干道
      local: 0,        // 地方路
      other: 0
    }
  }

  points.forEach(pt => {
    const name = pt.road_name || '未知'
    const level = pt.road_level || 'other'

    stats.roadCount[name] = (stats.roadCount[name] || 0) + 1

    if (level.includes('express')) stats.levelCount.expressway++
    else if (level.includes('trunk')) stats.levelCount.trunk++
    else if (level.includes('secondary')) stats.levelCount.secondary++
    else if (level.includes('local')) stats.levelCount.local++
    else stats.levelCount.other++
  })

  // 计算比例
  const levelRatio = {}
  for (const key in stats.levelCount) {
    levelRatio[key] = parseFloat(
      ((stats.levelCount[key] / stats.total) * 100).toFixed(2)
    )
  }

  return {
    levelRatio,
    roadUsage: stats.roadCount
  }
}

// 路由处理
router.post('/', async (req, res) => {
  const path = req.body.path

  if (!Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: '无效 path' })
  }

  try {
    const url = 'https://restapi.amap.com/v4/grasproad/driving'
    const response = await axios.post(url, {
      key: GAODE_KEY,
      locations: formatPath(path)
    })

    const points = response.data.data.points

    if (!points || points.length === 0) {
      return res.status(500).json({ error: '未返回有效道路信息' })
    }

    const result = analyzeRoadInfo(points)
    res.json(result)
  } catch (err) {
    console.error('道路分析失败', err)
    res.status(500).json({ error: '道路分析失败，请检查高德API配置' })
  }
})

module.exports = router
