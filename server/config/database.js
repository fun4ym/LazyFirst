const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

// 数据库连接
const connectDB = async () => {
  try {
    // 检查是否可以连接本地 MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

    if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
      // 如果不是本地连接，直接使用环境变量中的 URI
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    }

    // 尝试连接本地 MongoDB
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}, 数据库: ${conn.connection.name}`);
    } catch (localErr) {
      console.log('⚠️  本地 MongoDB 连接失败，启动内存 MongoDB...');
      
      // 启动内存 MongoDB
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ Memory MongoDB Connected: ${conn.connection.host}`);
    }

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
