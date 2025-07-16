const express = require('express')
const router = express.Router()
const db = require('../db')
const jwt = require('jsonwebtoken')

// 中间件：验证token并解析用户信息
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) return res.status(401).json({ code: 401, message: '未授权，缺少Token', data: null })

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ code: 403, message: 'Token无效或过期', data: null })

    req.user = user // 解码后的用户信息，包含id,email,role
    next()
  })
}

// 获取当前登录用户角色
router.get('/user/role', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    const [rows] = await db.query('SELECT role, email FROM user WHERE id = ?', [userId])

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null })
    }

    res.status(200).json({
      code: 200,
      message: '获取角色成功',
      data: {
        role: rows[0].role,
        email: rows[0].email
      }
    })
  } catch (err) {
    console.error('获取用户角色异常:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

module.exports = router
