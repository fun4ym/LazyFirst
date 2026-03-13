const mongoose = require('mongoose');
const User = require('./models/User');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lazyfirst')
  .then(async () => {
    console.log('数据库连接成功');

    // 查询所有用户
    const users = await User.find({}).select('username realName email status role');
    console.log('\n=== 系统用户列表 ===');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}, 姓名: ${user.realName || '-'}, 邮箱: ${user.email || '-'}, 状态: ${user.status || '-'}`);
    });

    // 检查是否有admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.log('\n⚠️  未找到admin用户，需要先注册');
    } else {
      console.log('\n✅ 找到admin用户');
      console.log('用户名:', adminUser.username);
      console.log('状态:', adminUser.status);
      console.log('角色:', adminUser.roleId);
    }

    process.exit(0);
  })
  .catch(error => {
    console.error('错误:', error);
    process.exit(1);
  });
