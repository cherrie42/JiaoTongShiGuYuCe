const mysql = require('mysql2/promise');
const dbConfig = require('./dbConfig');

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...');
  console.log('配置信息:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '已设置' : '未设置'
  });

  try {
    // 首先尝试不指定数据库连接
    console.log('\n1. 测试基础连接（不指定数据库）...');
    const connection1 = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    console.log('✅ 基础连接成功！');
    await connection1.end();

    // 然后尝试连接指定数据库
    console.log('\n2. 测试数据库连接...');
    const connection2 = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功！');

    // 检查表是否存在
    console.log('\n3. 检查traffic_accidents表...');
    const [rows] = await connection2.execute('SHOW TABLES LIKE "traffic_accidents"');
    if (rows.length > 0) {
      console.log('✅ traffic_accidents表存在');
      
      // 检查表结构
      const [columns] = await connection2.execute('DESCRIBE traffic_accidents');
      console.log('表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'}`);
      });

      // 检查数据量
      const [countResult] = await connection2.execute('SELECT COUNT(*) as count FROM traffic_accidents');
      console.log(`\n数据量: ${countResult[0].count} 条记录`);

      // 显示前几条数据
      const [sampleData] = await connection2.execute('SELECT * FROM traffic_accidents LIMIT 3');
      console.log('\n前3条数据示例:');
      sampleData.forEach((row, index) => {
        console.log(`记录 ${index + 1}:`, row);
      });

    } else {
      console.log('❌ traffic_accidents表不存在');
      console.log('请确保数据库中存在该表');
    }

    await connection2.end();
    console.log('\n🎉 数据库连接测试完成！');

  } catch (error) {
    console.error('\n❌ 数据库连接失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('1. 检查MySQL密码是否正确');
      console.log('2. 确认MySQL服务是否启动');
      console.log('3. 检查用户权限');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:');
      console.log('1. 确认MySQL服务是否启动');
      console.log('2. 检查端口是否正确（默认3306）');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('1. 确认数据库 traffic_prediction 是否存在');
      console.log('2. 创建数据库: CREATE DATABASE traffic_prediction;');
    }
  }
}

// 运行测试
testDatabaseConnection(); 