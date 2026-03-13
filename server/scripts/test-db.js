const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

async function testConnection() {
  try {
    console.log('🔗 尝试连接到 MongoDB Atlas...');
    console.log('连接字符串:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@'));

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });

    console.log('✅ 数据库连接成功！');
    console.log(`   主机: ${conn.connection.host}`);
    console.log(`   数据库: ${conn.connection.name}`);
    console.log(`   状态: ${conn.connection.readyState === 1 ? '已连接' : '未连接'}`);

    // 测试查询
    const User = require('../models/User');
    const count = await User.countDocuments();
    console.log(`   用户数量: ${count}`);

  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误详情:', error);

    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n⚠️  可能的原因：');
      console.log('   1. MongoDB Atlas 网络访问未配置（需要添加 IP 白名单）');
      console.log('   2. 连接字符串不正确');
      console.log('   3. 网络连接问题');
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 数据库连接已关闭');
  }
}

testConnection();
