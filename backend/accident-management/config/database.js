const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('traffic', 'root', 'Fyt@3855', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false,  // 关闭SQL日志，方便调试时改为true
  define: {
    freezeTableName: true, // 模型名称和表名相同，不自动复数化
    timestamps: false,     // 关闭自动时间戳字段
  },
});

module.exports = sequelize;
