const mongoose = require('mongoose');
const Influencer = require('./models/Influencer');
const InfluencerMaintenance = require('./models/InfluencerMaintenance');
const BaseData = require('./models/BaseData');
const User = require('./models/User');
require('dotenv').config();

async function createTestInfluencers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');

    // 获取公司ID（假设只有一个公司）
    const company = await mongoose.connection.db.collection('companies').findOne();
    if (!company) {
      console.log('未找到公司，请先创建公司');
      return;
    }
    const companyId = company._id;

    // 获取或创建归类标签
    let categoryTags = await BaseData.find({ type: 'influencerCategory', companyId });
    if (categoryTags.length === 0) {
      const tags = await BaseData.create([
        { name: '美妆达人', type: 'influencerCategory', companyId },
        { name: '时尚穿搭', type: 'influencerCategory', companyId },
        { name: '生活分享', type: 'influencerCategory', companyId },
        { name: '美食博主', type: 'influencerCategory', companyId }
      ]);
      categoryTags = tags;
      console.log('创建归类标签成功');
    }

    // 获取BD用户
    const users = await User.find({ companyId }).limit(3);
    if (users.length === 0) {
      console.log('未找到用户，请先创建用户');
      return;
    }

    // 创建10个测试达人
    const testInfluencers = [
      {
        companyId,
        tiktokName: '小美美妆',
        tiktokId: 'xiaomei_beauty',
        formerNames: '小美',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[0]._id],
        realName: '李美美',
        nickname: '美美',
        gender: 'female',
        addresses: ['北京市朝阳区'],
        phoneNumbers: ['13800138001'],
        socialAccounts: ['xiaomei@email.com'],
        poolType: 'private',
        assignedTo: users[0]._id,
        assignedAt: new Date(),
        latestFollowers: 150000,
        latestGmv: 50000,
        latestMaintenanceTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        latestMaintainerId: users[0]._id,
        latestMaintainerName: users[0].realName || users[0].username,
        latestRemark: '达人活跃度高，继续跟进'
      },
      {
        companyId,
        tiktokName: '时尚达人阿强',
        tiktokId: 'fashion_aqiang',
        formerNames: '阿强',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[1]._id],
        realName: '王强',
        nickname: '强哥',
        gender: 'male',
        addresses: ['上海市浦东新区'],
        phoneNumbers: ['13900139002', '13900139003'],
        socialAccounts: ['aqiang@email.com', 'aqiang_line'],
        poolType: 'private',
        assignedTo: users[1]._id,
        assignedAt: new Date(),
        latestFollowers: 200000,
        latestGmv: 80000,
        latestMaintenanceTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
        latestMaintainerId: users[1]._id,
        latestMaintainerName: users[1].realName || users[1].username,
        latestRemark: '达人反馈产品不错'
      },
      {
        companyId,
        tiktokName: '生活小达人',
        tiktokId: 'life_master',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[2]._id],
        realName: '张三',
        nickname: '三哥',
        gender: 'male',
        addresses: ['广州市天河区'],
        phoneNumbers: ['13700137004'],
        socialAccounts: ['life_master@email.com'],
        poolType: 'private',
        assignedTo: users[0]._id,
        assignedAt: new Date(),
        latestFollowers: 80000,
        latestGmv: 30000,
        latestMaintenanceTime: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // 16天前
        latestMaintainerId: users[0]._id,
        latestMaintainerName: users[0].realName || users[0].username,
        latestRemark: '需要加强沟通'
      },
      {
        companyId,
        tiktokName: '美食家小李',
        tiktokId: 'food_xiaoli',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[3]._id],
        realName: '李四',
        nickname: '美食家',
        gender: 'male',
        addresses: ['深圳市南山区'],
        phoneNumbers: ['13600136005'],
        socialAccounts: ['food_lover@email.com'],
        poolType: 'public',
        assignedTo: null,
        assignedAt: null,
        latestFollowers: 120000,
        latestGmv: 60000,
        latestMaintenanceTime: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22天前
        latestMaintainerId: users[2]._id,
        latestMaintainerName: users[2].realName || users[2].username,
        latestRemark: '即将释放'
      },
      {
        companyId,
        tiktokName: '护肤达人',
        tiktokId: 'skin_care',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[0]._id],
        realName: '王五',
        nickname: '',
        gender: 'female',
        addresses: ['杭州市西湖区'],
        phoneNumbers: ['13500135006'],
        socialAccounts: ['skin_care@email.com'],
        poolType: 'private',
        assignedTo: users[1]._id,
        assignedAt: new Date(),
        latestFollowers: 95000,
        latestGmv: 45000,
        latestMaintenanceTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        latestMaintainerId: users[1]._id,
        latestMaintainerName: users[1].realName || users[1].username,
        latestRemark: ''
      },
      {
        companyId,
        tiktokName: '穿搭女王',
        tiktokId: 'fashion_queen',
        formerNames: '穿搭达人',
        formerIds: 'fashion_girl',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[1]._id, categoryTags[2]._id],
        realName: '赵六',
        nickname: '女王',
        gender: 'female',
        addresses: ['成都市武侯区'],
        phoneNumbers: ['13400134007'],
        socialAccounts: ['fashion_queen@email.com', 'queen_line'],
        poolType: 'public',
        assignedTo: null,
        assignedAt: null,
        latestFollowers: 300000,
        latestGmv: 120000,
        latestMaintenanceTime: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000), // 26天前
        latestMaintainerId: users[0]._id,
        latestMaintainerName: users[0].realName || users[0].username,
        latestRemark: '已释放到公海'
      },
      {
        companyId,
        tiktokName: '生活小妙招',
        tiktokId: 'life_tips',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[2]._id],
        realName: '孙七',
        nickname: '',
        gender: 'male',
        addresses: ['武汉市洪山区'],
        phoneNumbers: ['13300133008'],
        socialAccounts: ['life_tips@email.com'],
        poolType: 'private',
        assignedTo: users[2]._id,
        assignedAt: new Date(),
        latestFollowers: 75000,
        latestGmv: 35000,
        latestMaintenanceTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
        latestMaintainerId: users[2]._id,
        latestMaintainerName: users[2].realName || users[2].username,
        latestRemark: '新达人，首次联系'
      },
      {
        companyId,
        tiktokName: '吃货小王',
        tiktokId: 'food_wang',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[3]._id],
        realName: '周八',
        nickname: '吃货',
        gender: 'male',
        addresses: ['南京市鼓楼区'],
        phoneNumbers: ['13200132009'],
        socialAccounts: ['food_wang@email.com'],
        poolType: 'private',
        assignedTo: users[0]._id,
        assignedAt: new Date(),
        latestFollowers: 110000,
        latestGmv: 55000,
        latestMaintenanceTime: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18天前
        latestMaintainerId: users[0]._id,
        latestMaintainerName: users[0].realName || users[0].username,
        latestRemark: '达人近期较忙'
      },
      {
        companyId,
        tiktokName: '美妆小课堂',
        tiktokId: 'beauty_class',
        formerNames: '美妆教学',
        formerIds: '',
        originalTiktokId: '',
        status: 'enabled',
        categoryTags: [categoryTags[0]._id, categoryTags[1]._id],
        realName: '吴九',
        nickname: '美妆老师',
        gender: 'female',
        addresses: ['西安市雁塔区'],
        phoneNumbers: ['13100131010'],
        socialAccounts: ['beauty_class@email.com'],
        poolType: 'public',
        assignedTo: null,
        assignedAt: null,
        latestFollowers: 180000,
        latestGmv: 90000,
        latestMaintenanceTime: null,
        latestMaintainerId: null,
        latestMaintainerName: '',
        latestRemark: ''
      },
      {
        companyId,
        tiktokName: '时尚前沿',
        tiktokId: 'fashion_trend',
        formerNames: '',
        formerIds: '',
        originalTiktokId: '',
        status: 'disabled',
        categoryTags: [categoryTags[1]._id],
        realName: '郑十',
        nickname: '',
        gender: 'female',
        addresses: ['重庆市渝中区'],
        phoneNumbers: ['13000131011'],
        socialAccounts: ['fashion_trend@email.com'],
        poolType: 'private',
        assignedTo: users[1]._id,
        assignedAt: new Date(),
        latestFollowers: 250000,
        latestGmv: 100000,
        latestMaintenanceTime: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12天前
        latestMaintainerId: users[1]._id,
        latestMaintainerName: users[1].realName || users[1].username,
        latestRemark: '达人暂时合作'
      }
    ];

    // 清空现有数据
    await Influencer.deleteMany({ companyId });
    await InfluencerMaintenance.deleteMany({});

    console.log('清空现有达人数据');

    // 创建达人
    const createdInfluencers = await Influencer.create(testInfluencers);
    console.log(`成功创建 ${createdInfluencers.length} 个测试达人`);

    // 为每个达人创建维护记录
    for (let i = 0; i < createdInfluencers.length; i++) {
      const influencer = createdInfluencers[i];
      if (influencer.latestMaintenanceTime) {
        await InfluencerMaintenance.create({
          influencerId: influencer._id,
          companyId,
          followers: influencer.latestFollowers,
          gmv: influencer.latestGmv,
          remark: influencer.latestRemark || '',
          maintainerId: influencer.latestMaintainerId,
          maintainerName: influencer.latestMaintainerName,
          createdAt: influencer.latestMaintenanceTime
        });
      }
    }

    console.log('成功创建维护记录');

    // 输出统计信息
    const stats = {
      总数: createdInfluencers.length,
      公海: createdInfluencers.filter(i => i.poolType === 'public').length,
      私海: createdInfluencers.filter(i => i.poolType === 'private').length,
      启用: createdInfluencers.filter(i => i.status === 'enabled').length,
      禁用: createdInfluencers.filter(i => i.status === 'disabled').length
    };

    console.log('\n达人统计:');
    console.table(stats);

    console.log('\n测试数据创建完成！');

  } catch (error) {
    console.error('创建测试数据失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

createTestInfluencers();
