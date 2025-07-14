const express = require('express')
const router = express.Router()

// 工具函数：根据经纬度反向解析地址（如城市）
const axios = require('axios')
const getCityByCoord = async (lng, lat) => {
  try {
    const key = '79bb58e3344bcd57dfb6dc82c904fb36' // ⚠️ 替换为你自己的高德 key
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${key}&radius=1000`
    const res = await axios.get(url)
    if (res.data.status === '1') {
      return res.data.regeocode.addressComponent.city || res.data.regeocode.addressComponent.province
    }
    return '未知'
  } catch (err) {
    console.error('反向解析失败:', err.message)
    return '未知'
  }
}

// POST 接口：接收前端路线详情数据
router.post('/plan', async (req, res) => {
  const { routes } = req.body

  if (!Array.isArray(routes)) {
    return res.status(400).json({ error: '请求体格式错误' })
  }

  const result = await Promise.all(
    routes.map(async (route) => {
      const sampledPoints = route.path.filter((_, index) => index % 10 === 0) // 每隔10个点采样一次
      const cities = await Promise.all(
        sampledPoints.map(([lng, lat]) => getCityByCoord(lng, lat))
      )

      const uniqueCities = [...new Set(cities.filter(Boolean))]

      return {
        index: route.index,
        cityList: uniqueCities,
        departTime: route.departTime,
        vehicleType: route.vehicleType
      }
    })
  )

  // 返回封装的路线信息
  res.json({ routes: result })
})

module.exports = router
