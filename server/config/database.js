const mongoose = require('mongoose');

let mongod = null;

// 数据库连接
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

    // 生产环境：直接连接外部 MongoDB
    if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } else {
      // 开发环境：尝试连接本地 MongoDB
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}, 数据库: ${conn.connection.name}`);
      } catch (localErr) {
        console.log('⚠️  本地 MongoDB 连接失败');

        // 仅在开发时尝试启动内存数据库（生产环境不需要）
        if (process.env.NODE_ENV !== 'production') {
          try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            mongod = await MongoMemoryServer.create();
            const memoryUri = mongod.getUri();
            const conn = await mongoose.connect(memoryUri);
            console.log(`✅ Memory MongoDB Connected: ${conn.connection.host}`);
          } catch (memErr) {
            console.error('❌ 内存 MongoDB 启动失败:', memErr.message);
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }
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
