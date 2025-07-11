const Redis = require('ioredis');
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

redis.on('connect', () => {
  console.log('Redis 连接成功');
});

redis.on('error', (err) => {
  console.error('Redis 连接错误:', err);
});

(async () => {
  try {
    await redis.set('test_key', '测试成功');
    const val = await redis.get('test_key');
    console.log('从 Redis 读取到的值:', val);
  } catch (error) {
    console.error('操作 Redis 出错:', error);
  } finally {
    redis.disconnect();
  }
})();
