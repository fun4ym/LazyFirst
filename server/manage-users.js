const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');

// 用户列表
const usersToCreate = [
  { username: 'eye', realName: 'Eye', role: 'bd' },
  { username: 'sa', realName: 'Sa', role: 'bd' },
  { username: 'cin', realName: 'Cin', role: 'bd' },
  { username: 'film', realName: 'Film', role: 'bd' },
  { username: 'nam', realName: 'Nam', role: 'bd' },
  { username: 'dingyan', realName: 'Dingyan', role: 'bd' },
  { username: 'sun', realName: 'Sun', role: 'bd' },
  { username: 'ice', realName: 'Ice', role: 'bd' },
  { username: 'tee', realName: 'Tee', role: 'bd' },
  { username: 'doiya', realName: 'Doiya', role: 'bd' }
];

// 默认密码
const DEFAULT_PASSWORD = '123456';

(async () => {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';
    await mongoose.connect(mongoUri);
    console.log('✓ 数据库连接成功');

    // 查找公司
    const company = await Company.findOne();
    if (!company) {
      console.error('✗ 未找到公司，请先创建公司');
      process.exit(1);
    }
    console.log(`✓ 找到公司: ${company.name} (ID: ${company._id})`);

    // 1. 删除除admin以外的所有用户
    const deletedUsers = await User.deleteMany({
      companyId: company._id,
      username: { $ne: 'admin' }
    });
    console.log(`✓ 已删除 ${deletedUsers.deletedCount} 个非admin用户`);

    // 2. 创建新用户
    let createdCount = 0;
    let updatedCount = 0;

    for (const userData of usersToCreate) {
      try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({
          companyId: company._id,
          username: userData.username
        });

        if (existingUser) {
          // 更新现有用户
          await User.findByIdAndUpdate(existingUser._id, {
            realName: userData.realName,
            role: userData.role,
            phone: '',
            email: '',
            status: 'active'
          });
          console.log(`  ✓ 更新用户: ${userData.username} (${userData.realName})`);
          updatedCount++;
        } else {
          // 创建新用户
          await User.create({
            companyId: company._id,
            username: userData.username,
            password: DEFAULT_PASSWORD,
            realName: userData.realName,
            role: userData.role,
            phone: '',
            email: '',
            status: 'active'
          });
          console.log(`  ✓ 创建用户: ${userData.username} (${userData.realName}) - 密码: ${DEFAULT_PASSWORD}`);
          createdCount++;
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠ 用户 ${userData.username} 已存在，跳过`);
        } else {
          console.error(`  ✗ 创建/更新用户 ${userData.username} 失败:`, error.message);
        }
      }
    }

    console.log(`\n✓ 成功创建 ${createdCount} 个新用户`);
    console.log(`✓ 成功更新 ${updatedCount} 个现有用户`);

    // 显示用户列表
    console.log('\n当前用户列表:');
    const allUsers = await User.find({ companyId: company._id })
      .select('-password')
      .sort({ username: 1 });

    for (const user of allUsers) {
      console.log(`  - ${user.username} (${user.realName}) - 角色: ${user.role} - 状态: ${user.status}`);
    }

    console.log('\n✓ 用户管理完成');
    process.exit(0);

  } catch (error) {
    console.error('✗ 执行失败:', error);
    process.exit(1);
  }
})();
