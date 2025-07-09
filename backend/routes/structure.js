const express = require('express')
const axios = require('axios')
const router = express.Router()

const GAODE_KEY = '79bb58e3344bcd57dfb6dc82c904fb36'

/**
 * 将 [{ lng, lat }] 转换为 "lng1,lat1|lng2,lat2|..."
 */
function formatPathToStr(path) {
  return path.map(p => `${p.lng},${p.lat}`).join('|')
}

/**
 * 根据高德轨迹纠偏 API 获取每个点的道路结构信息
 */
async function getRoadStructureFromPath(path) {
  const url = `https://restapi.amap.com/v4/grasproad/driving`

  const coords = formatPathToStr(path)
  const resp = await axios.post(url, {
    key: GAODE_KEY,
    locations: coords
  })

  if (resp.data.errcode !== 0 || !resp.data.data.points) {
    throw new Error('轨迹纠偏失败')
  }

  return resp.data.data.points // 每个点的道路结构信息
}

/**
 * 计算“弯路占比”和“主路占比”
 * 简单策略：相邻角度变化 > 15° 就认为是转弯
 */
function analyzeStructure(points) {
  let turns = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]

    if (prev.angle != null && curr.angle != null) {
      const delta = Math.abs(curr.angle - prev.angle)
      if (delta > 15) {
        turns++
      }
    }
  }

  const total = points.length
  const curveRatio = (turns / total) * 100
  const mainRoadRatio = 100 - curveRatio

  return {
    curveRatio: parseFloat(curveRatio.toFixed(2)),
    mainRoadRatio: parseFloat(mainRoadRatio.toFixed(2))
  }
}

// POST /api/structure
router.post('/', async (req, res) => {
  const path = req.body.path

  if (!Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: '无效的 path 数据' })
  }

  try {
    const roadPoints = await getRoadStructureFromPath(path)
    const result = analyzeStructure(roadPoints)
    res.json(result)
  } catch (err) {
    console.error('结构分析失败', err.message)
    res.status(500).json({ error: '结构分析失败，请稍后重试' })
  }
})

module.exports = router
