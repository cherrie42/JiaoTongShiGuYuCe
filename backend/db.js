// backend/db.js
const mysql = require('mysql2')

const pool = mysql.createPool({
  host: '127.0.0.1',  // 这里改成你的 MySQL 服务器 IP
  user: 'root',
  password: 'Fyt@3855',
  database: 'traffic',
})

module.exports = pool.promise()
