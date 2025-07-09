const predictWithModel = require('../model/predictor') // 模型封装模块

exports.predict = async (req, res) => {
  try {
    const { routes } = req.body

    if (!Array.isArray(routes)) {
      return res.status(400).json({ error: 'Missing or invalid routes array' })
    }

    const results = await Promise.all(
      routes.map(async (route) => {
        const risk = await predictWithModel(route.path)
        return { index: route.index, risk }
      })
    )

    res.json(results)
  } catch (err) {
    console.error('模型预测出错:', err)
    res.status(500).json({ error: '模型预测失败' })
  }
}
