const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Company = require('../models/Company');
const Department = require('../models/Department');
const Role = require('../models/Role');
const BaseData = require('../models/BaseData');

let mongod = null;

// 创建完整的测试数据
const createSeedData = async () => {
  try {
    console.log('开始创建测试数据...');

    // 创建公司
    let company = await Company.findOne({ name: 'TAP System' });
    if (!company) {
      company = await Company.create({
        name: 'TAP System',
        contact: 'System Admin',
        phone: '13800138000',
        email: 'admin@tap.com'
      });
      console.log('✅ 创建公司');
    }

    // 创建部门
    const deptData = [
      { name: '管理部', code: 'ADMIN', description: '系统管理部门' },
      { name: '销售部', code: 'SALES', description: '销售业务部门' },
      { name: '市场部', code: 'MARKETING', description: '市场推广部门' },
      { name: '客服部', code: 'SERVICE', description: '客户服务部门' },
      { name: '财务部', code: 'FINANCE', description: '财务管理部门' }
    ];

    const departments = {};
    for (const dept of deptData) {
      const existing = await Department.findOne({ code: dept.code });
      if (!existing) {
        const newDept = await Department.create({
          companyId: company._id,
          ...dept
        });
        departments[dept.code] = newDept;
        console.log(`✅ 创建部门: ${dept.name}`);
      } else {
        departments[dept.code] = existing;
      }
    }

    // 创建角色
    const roleData = [
      { name: '超级管理员', code: 'SUPER_ADMIN', description: '系统超级管理员', permissions: ['*'] },
      { name: '销售经理', code: 'SALES_MANAGER', description: '销售团队经理', permissions: ['users:read', 'influencers:*', 'orders:*'] },
      { name: '业务专员', code: 'BD', description: '业务拓展专员', permissions: ['influencers:read', 'influencers:create', 'orders:read'] }
    ];

    const roles = {};
    for (const role of roleData) {
      const existing = await Role.findOne({ code: role.code });
      if (!existing) {
        const newRole = await Role.create({
          companyId: company._id,
          ...role
        });
        roles[role.code] = newRole;
        console.log(`✅ 创建角色: ${role.name}`);
      } else {
        roles[role.code] = existing;
      }
    }

    // 创建系统必要用户（不创建测试用户）
    const systemUsers = [
      { username: 'admin', realName: '系统管理员', phone: '13800138000', email: 'admin@tap.com', role: 'admin', deptCode: 'ADMIN', roleCode: 'SUPER_ADMIN', password: 'admin123' }
    ];

    for (const u of systemUsers) {
      const existing = await User.findOne({ username: u.username });
      if (!existing) {
        const dept = departments[u.deptCode];
        const role = roles[u.roleCode];

        if (dept && role) {
          const newUser = await User.create({
            companyId: company._id,
            deptId: dept._id,
            roleId: role._id,
            role: u.role,
            username: u.username,
            password: u.password || 'password123',
            realName: u.realName,
            phone: u.phone,
            email: u.email,
            status: 'active'
          });
          console.log(`✅ 创建系统用户: ${u.username}`);
        }
      }
    }

    // 创建基础数据（货币单位）
    try {
      const currencyData = [
        { name: '美元', code: 'USD', value: 1.0000, type: 'priceUnit', status: 'active' },
        { name: '人民币', code: 'CNY', value: 7.2000, type: 'priceUnit', status: 'active' },
        { name: '欧元', code: 'EUR', value: 0.9200, type: 'priceUnit', status: 'active' },
        { name: '英镑', code: 'GBP', value: 0.7900, type: 'priceUnit', status: 'active' },
        { name: '日元', code: 'JPY', value: 150.0000, type: 'priceUnit', status: 'active' },
        { name: '泰铢', code: 'THB', value: 35.5000, type: 'priceUnit', status: 'active' },
        { name: '马来西亚林吉特', code: 'MYR', value: 4.7000, type: 'priceUnit', status: 'active' },
        { name: '新加坡元', code: 'SGD', value: 1.3400, type: 'priceUnit', status: 'active' }
      ];

      for (const currency of currencyData) {
        const existing = await BaseData.findOne({ code: currency.code, type: currency.type });
        if (!existing) {
          await BaseData.create({
            ...currency,
            companyId: company._id,
            creatorId: null
          });
          console.log(`✅ 创建货币单位: ${currency.name}`);
        }
      }
    } catch (error) {
      console.warn('创建货币单位时出现重复，已忽略:', error.message);
    }

    console.log('✅ 测试数据创建完成！');

  } catch (error) {
    console.error('创建测试数据失败:', error.message);
  }
};

// 数据库连接
const connectDB = async () => {
  try {
    // 检查是否可以连接本地 MongoDB
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

    if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
      // 如果不是本地连接，直接使用环境变量中的 URI
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      await createSeedData();
      return;
    }

    // 尝试连接本地 MongoDB
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}, 数据库: ${conn.connection.name}`);
      await createSeedData();
    } catch (localErr) {
      console.log('⚠️  本地 MongoDB 连接失败，启动内存 MongoDB...');
      
      // 启动内存 MongoDB
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ Memory MongoDB Connected: ${conn.connection.host}`);
      await createSeedData();
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
