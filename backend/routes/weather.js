const express = require('express')
const axios = require('axios')
const router = express.Router()

// 使用你前端 HTML 中的高德 Key 和安全码
const GAODE_KEY = '79bb58e3344bcd57dfb6dc82c904fb36'
// 安全码 `securityJsCode` 只用于前端，不影响后端请求

/**
 * 根据经纬度获取行政区 adcode（调用逆地理编码 API）
 */
async function getAdcodeFromLocation(lng, lat) {
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${GAODE_KEY}`
  const resp = await axios.get(url)
  const regeo = resp.data.regeocode
  if (regeo?.addressComponent?.adcode) {
    return regeo.addressComponent.adcode
  }
  throw new Error('未能获取城市编码')
}

/**
 * 根据 adcode 获取实时天气信息（调用天气查询 API）
 */
async function getWeatherByAdcode(adcode) {
  const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${GAODE_KEY}&city=${adcode}&extensions=base`
  const resp = await axios.get(url)
  const live = resp.data.lives?.[0]

  if (!live) {
    throw new Error('天气信息获取失败')
  }

  // 自定义光照、路面判断逻辑（你可根据需要更复杂化）
  let light = '中等'
  let road = '一般'
  if (live.weather.includes('晴')) {
    light = '强'
    road = '干燥'
  } else if (live.weather.includes('雨')) {
    light = '弱'
    road = '湿滑'
  } else if (live.weather.includes('雪')) {
    light = '弱'
    road = '结冰'
  }

  return {
    text: live.weather,
    temp: parseInt(live.temperature),
    light,
    road
  }
}

/**
 * GET /api/weather?lng=...&lat=...
 * 返回：{ text: '晴', temp: 28, light: '强', road: '干燥' }
 */
router.get('/', async (req, res) => {
  const { lng, lat } = req.query

  if (!lng || !lat) {
    return res.status(400).json({ error: '请提供 lng 和 lat 参数' })
  }

  try {
    const adcode = await getAdcodeFromLocation(lng, lat)
    const weather = await getWeatherByAdcode(adcode)
    res.json(weather)
  } catch (err) {
    console.error('天气查询失败：', err.message)
    res.status(500).json({ error: '天气查询失败，请稍后重试' })
  }
})

module.exports = router
