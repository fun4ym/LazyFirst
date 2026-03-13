const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

async function fixAdmin() {
  try {
    console.log('🔗 连接到 MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    const User = require('../models/User');
    const Role = require('../models/Role');
    const Company = require('../models/Company');

    // 查找或创建管理员角色
    let adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'admin',
        displayName: '管理员',
        description: '系统管理员，拥有所有权限',
        permissions: ['all']
      });
      console.log('✅ 管理员角色创建成功');
    } else {
      console.log('✅ 管理员角色已存在');
    }

    // 查找或创建默认公司
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

    // 删除旧的管理员
    await User.deleteOne({ username: 'admin' });
    console.log('✅ 删除旧的管理员账号');

    // 创建新的管理员账号
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await User.create({
      companyId: company._id,
      roleId: adminRole._id,
      username: 'admin',
      password: hashedPassword,
      realName: '系统管理员',
      phone: '13800138000',
      status: 'active'
    });

    console.log('✅ 管理员账号创建成功！');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   角色ID:', admin.roleId);
    console.log('   所属公司: 默认公司');

  } catch (error) {
    console.error('❌ 修复管理员失败:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 数据库连接已关闭');
  }
}

fixAdmin();
