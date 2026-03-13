const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: __dirname + '/../.env' });

// 引入模型
const User = require('../models/User');
const Company = require('../models/Company');

async function createAdmin() {
  try {
    // 连接数据库
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 创建或查找默认公司
    let company = await Company.findOne({ name: '默认公司' });
    if (!company) {
      company = await Company.create({
        name: '默认公司',
        contact: '管理员',
        phone: '13800138000',
        email: 'admin@tap.com'
      });
      console.log('✅ 默认公司创建成功');
    } else {
      console.log('✅ 默认公司已存在');
    }

    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  管理员账号已存在，跳过创建');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      return;
    }

    // 删除旧的管理员账号（如果存在）
    await User.deleteOne({ username: 'admin' });

    // 创建管理员账号
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await User.create({
      companyId: company._id,
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      role: 'admin',
      phone: '13800138000',
      status: 'active'
    });

    console.log('✅ 管理员账号创建成功！');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   角色: admin');
    console.log('   所属公司: 默认公司');

  } catch (error) {
    console.error('❌ 创建管理员失败:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📡 数据库连接已关闭');
  }
}

createAdmin();
