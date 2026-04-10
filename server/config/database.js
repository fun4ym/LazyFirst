const mongoose = require('mongoose');

let mongod = null;

// 数据库连接
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

    console.log(`正在连接 MongoDB: ${uri}`);
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}, 数据库: ${conn.connection.name}`);

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

// 清理
const closeDB = async () => {
  if (mongod) {
    await mongod.stop();
  }
  await mongoose.disconnect();
};

module.exports = connectDB;
module.exports.closeDB = closeDB;
