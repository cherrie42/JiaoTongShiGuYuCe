const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('traffic_prediction', 'root', '258488qw', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,  // 关闭SQL日志，方便调试时改为true
  define: {
    freezeTableName: true, // 模型名称和表名相同，不自动复数化
    timestamps: false,     // 关闭自动时间戳字段
  },
});

module.exports = sequelize;
