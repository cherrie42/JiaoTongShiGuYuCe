// backend/middleware/auth.js
const { verifyToken } = require('../utils/auth');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供 token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // 挂载用户信息到请求对象
    next();
  } catch (err) {
    return res.status(401).json({ message: '无效的 token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '管理员权限不足' });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAdmin
};
