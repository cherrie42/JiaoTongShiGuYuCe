const express = require('express')
const router = express.Router()
const db = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// 注册
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  try {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email])
    if (rows.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '邮箱已被注册',
        data: null
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await db.query(
      'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    )

    res.status(200).json({
      code: 200,
      message: '注册成功',
      data: null
    })
  } catch (err) {
    res.status(500).json({
      code: 500,
      message: '注册失败',
      data: null
    })
  }
})

// 登录
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email])
    if (rows.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '用户不存在,请先注册',
        data: null
      })
    }

    const user = rows[0]
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({
        code: 400,
        message: '密码错误',
        data: null
      })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'your_jwt_secret',
      { expiresIn: '7d' }
    )

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    })
  } catch (err) {
  console.error('登录接口异常:', err)
  res.status(500).json({
    code: 500,
    message: '登录失败',
    data: null
  })
}
})

module.exports = router
