const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tap-system');
    console.log('MongoDB connected');

    const User = require('./models/User');
    const Company = require('./models/Company');
    const Department = require('./models/Department');
    const Role = require('./models/Role');

    // 检查是否已有 admin 用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('admin 用户已存在');
      process.exit(0);
    }

    // 创建公司
    let company = await Company.findOne({ name: 'TAP System' });
    if (!company) {
      company = await Company.create({
        name: 'TAP System',
        contact: 'System Admin',
        phone: '13800138000',
        email: 'admin@tap.com'
      });
      console.log('创建公司成功:', company._id);
    }

    // 创建部门
    let department = await Department.findOne({ name: '管理部' });
    if (!department) {
      department = await Department.create({
        companyId: company._id,
        name: '管理部',
        code: 'ADMIN',
        description: '系统管理部门'
      });
      console.log('创建部门成功:', department._id);
    }

    // 创建角色
    let role = await Role.findOne({ name: '超级管理员' });
    if (!role) {
      role = await Role.create({
        companyId: company._id,
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统超级管理员',
        permissions: ['*']
      });
      console.log('创建角色成功:', role._id);
    }

    // 创建 admin 用户
    const admin = await User.create({
      companyId: company._id,
      deptId: department._id,
      roleId: role._id,
      role: 'admin',
      username: 'admin',
      password: 'admin123',
      realName: '系统管理员',
      phone: '13800138000',
      email: 'admin@tap.com',
      status: 'active'
    });

    console.log('✅ admin 用户创建成功!');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('ID:', admin._id);

    process.exit(0);
  } catch (error) {
    console.error('创建用户失败:', error);
    process.exit(1);
  }
};

connectDB();
