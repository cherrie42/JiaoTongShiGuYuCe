// routes/predict.js

const express = require('express')
const router = express.Router()
const controller = require('../controllers/predictController')

// 定义 POST 路由 /api/predict
router.post('/predict', controller.predict)

module.exports = router
