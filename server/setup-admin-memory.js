const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
  console.log('数据库已连接');
  
  const User = require('./models/User');
  const Company = require('./models/Company');
  const Department = require('./models/Department');
  const Role = require('./models/Role');
  
  // 创建公司
  const company = await Company.create({
    name: 'TAP System',
    contact: 'System Admin',
    phone: '13800138000',
    email: 'admin@tap.com'
  });
  console.log('创建公司:', company._id);
  
  // 创建部门
  const department = await Department.create({
    companyId: company._id,
    name: '管理部',
    code: 'ADMIN',
    description: '系统管理部门'
  });
  console.log('创建部门:', department._id);
  
  // 创建角色
  const role = await Role.create({
    companyId: company._id,
    name: '超级管理员',
    code: 'SUPER_ADMIN',
    description: '系统超级管理员',
    permissions: ['*']
  });
  console.log('创建角色:', role._id);
  
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
  
  console.log('\n✅ admin 用户创建成功!');
  console.log('用户名: admin');
  console.log('密码: admin123');
  
  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n完成！现在请使用 ./start.sh 启动服务');
})();
