const ModelTrainer = require('./trainModel');

async function main() {
  const trainer = new ModelTrainer();
  
  try {
    console.log('开始从数据库训练模型...');
    
    // 从数据库训练，使用前5000条数据
    await trainer.trainAndSaveModelFromDatabase(5000);
    
    console.log('✅ 模型训练完成！');
    console.log('模型已保存到 trained_model/ 目录');
    
  } catch (error) {
    console.error('❌ 训练失败:', error.message);
    process.exit(1);
  }
}

// 运行训练
main(); 