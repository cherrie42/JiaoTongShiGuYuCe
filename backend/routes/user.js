const express = require('express')
const router = express.Router()
const db = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const sendVerifyMail = require('../utils/sendMail')
const { setCode, verifyCode, clearCode } = require('../utils/verifyCodeStore')

// 发送验证码
router.post('/sendCode', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ code: 400, message: '邮箱不能为空', data: null })
  }

  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  try {
    await sendVerifyMail(email, code)
    setCode(email, code)
    res.json({ code: 200, message: '验证码已发送', data: null })
  } catch (err) {
    console.error('发送验证码失败', err)
    res.status(500).json({ code: 500, message: '验证码发送失败', data: null })
  }
})

// 注册接口
router.post('/register', async (req, res) => {
  const { username, email, password, code } = req.body

  try {
    if (!verifyCode(email, code)) {
      return res.status(400).json({ code: 400, message: '验证码错误或已过期', data: null })
    }

    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email])
    if (rows.length > 0) {
      return res.status(400).json({ code: 400, message: '邮箱已被注册', data: null })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await db.query(
      'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    )

    clearCode(email)

    res.status(200).json({ code: 200, message: '注册成功', data: null })
  } catch (err) {
    console.error('注册异常:', err)
    res.status(500).json({ code: 500, message: '注册失败', data: null })
  }
})

// 登录接口
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  try {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email])
    if (rows.length === 0) {
      return res.status(400).json({ code: 400, message: '用户不存在,请先注册', data: null })
    }

    const user = rows[0]
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: '密码错误', data: null })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
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
    res.status(500).json({ code: 500, message: '登录失败', data: null })
  }
})

// 获取用户信息列表
router.get('/userLists', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, role, email, created_at, updated_at FROM user'
    )

    res.status(200).json({
      code: 200,
      message: '获取用户列表成功',
      data: rows
    })
  } catch (err) {
    console.error('获取用户列表异常:', err)
    res.status(500).json({ code: 500, message: '获取用户列表失败', data: null })
  }
})

// 新增用户
router.post('/addUser', async (req, res) => {
  const { username, email, password, role } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ code: 400, message: '用户名、邮箱、密码不能为空', data: null })
  }

  try {
    const [existing] = await db.query('SELECT * FROM user WHERE email = ?', [email])
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '邮箱已存在', data: null })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await db.query(
      'INSERT INTO user (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role || 'user']
    )

    res.status(200).json({ code: 200, message: '新增用户成功', data: null })
  } catch (err) {
    console.error('新增用户异常:', err)
    res.status(500).json({ code: 500, message: '新增用户失败', data: null })
  }
})

// 修改用户
router.put('/updateUser/:id', async (req, res) => {
  const { id } = req.params
  const { username, email, password, role } = req.body

  try {
    const updateFields = []
    const values = []

    if (username) {
      updateFields.push('username = ?')
      values.push(username)
    }
    if (email) {
      updateFields.push('email = ?')
      values.push(email)
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10)
      updateFields.push('password = ?')
      values.push(hashed)
    }
    if (role) {
      updateFields.push('role = ?')
      values.push(role)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ code: 400, message: '无更新内容', data: null })
    }

    values.push(id)

    await db.query(
      `UPDATE user SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    )

    res.status(200).json({ code: 200, message: '用户信息更新成功', data: null })
  } catch (err) {
    console.error('修改用户异常:', err)
    res.status(500).json({ code: 500, message: '修改用户失败', data: null })
  }
})

// 删除用户
router.delete('/deleteUser/:id', async (req, res) => {
  const { id } = req.params
  try {
    const [user] = await db.query('SELECT * FROM user WHERE id = ?', [id])
    if (user.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在', data: null })
    }

    await db.query('DELETE FROM user WHERE id = ?', [id])
    res.status(200).json({ code: 200, message: '用户删除成功', data: null })
  } catch (err) {
    console.error('删除用户异常:', err)
    res.status(500).json({ code: 500, message: '删除用户失败', data: null })
  }
})

module.exports = router
