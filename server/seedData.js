const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Company = require('./models/Company');
const Department = require('./models/Department');
const Role = require('./models/Role');
const Influencer = require('./models/Influencer');
const SampleRequest = require('./models/SampleRequest');
const Order = require('./models/Order');
const Commission = require('./models/Commission');

// 需要先创建 Product 模型
const productSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  sku: String,
  category: String,
  price: Number,
  description: String
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

// 需要先创建 Store 模型
const storeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: String,
  platform: String
}, { timestamps: true });
const Store = mongoose.model('Store', storeSchema);

// 需要先创建 Activity 模型
const activitySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: String,
  startDate: Date,
  endDate: Date
}, { timestamps: true });
const Activity = mongoose.model('Activity', activitySchema);

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
  console.log('数据库已连接');

  // 创建公司
  let company = await Company.findOne({ name: 'TAP System' });
  if (!company) {
    company = await Company.create({
      name: 'TAP System',
      contact: 'System Admin',
      phone: '13800138000',
      email: 'admin@tap.com'
    });
    console.log('创建公司:', company._id);
  }

  // 创建部门
  const departments = [];
  const deptData = [
    { name: '管理部', code: 'ADMIN', description: '系统管理部门' },
    { name: '销售部', code: 'SALES', description: '销售业务部门' },
    { name: '市场部', code: 'MARKETING', description: '市场推广部门' },
    { name: '客服部', code: 'SERVICE', description: '客户服务部门' },
    { name: '财务部', code: 'FINANCE', description: '财务管理部门' }
  ];
  
  for (const dept of deptData) {
    const existing = await Department.findOne({ code: dept.code });
    if (!existing) {
      const newDept = await Department.create({
        companyId: company._id,
        ...dept
      });
      departments.push(newDept);
      console.log('创建部门:', newDept.name);
    }
  }

  // 创建角色
  const roles = [];
  const roleData = [
    { name: '超级管理员', code: 'SUPER_ADMIN', description: '系统超级管理员', permissions: ['*'] },
    { name: '销售经理', code: 'SALES_MANAGER', description: '销售团队经理', permissions: ['users:read', 'influencers:*', 'orders:*'] },
    { name: '业务专员', code: 'BD', description: '业务拓展专员', permissions: ['influencers:read', 'influencers:create', 'orders:read'] }
  ];
  
  for (const role of roleData) {
    const existing = await Role.findOne({ code: role.code });
    if (!existing) {
      const newRole = await Role.create({
        companyId: company._id,
        ...role
      });
      roles.push(newRole);
      console.log('创建角色:', newRole.name);
    }
  }

  // 创建用户
  const users = [];
  const userData = [
    { username: 'zhangsan', realName: '张三', phone: '13800138001', email: 'zhangsan@tap.com', role: 'bd', deptCode: 'SALES', roleCode: 'BD' },
    { username: 'lisi', realName: '李四', phone: '13800138002', email: 'lisi@tap.com', role: 'bd', deptCode: 'SALES', roleCode: 'BD' },
    { username: 'wangwu', realName: '王五', phone: '13800138003', email: 'wangwu@tap.com', role: 'bd', deptCode: 'SALES', roleCode: 'BD' },
    { username: 'zhaoliu', realName: '赵六', phone: '13800138004', email: 'zhaoliu@tap.com', role: 'bd', deptCode: 'SALES', roleCode: 'BD' },
    { username: 'sunqi', realName: '孙七', phone: '13800138005', email: 'sunqi@tap.com', role: 'bd', deptCode: 'MARKETING', roleCode: 'BD' },
    { username: 'zhouba', realName: '周八', phone: '13800138006', email: 'zhouba@tap.com', role: 'bd', deptCode: 'SERVICE', roleCode: 'BD' },
    { username: 'wujiu', realName: '吴九', phone: '13800138007', email: 'wujiu@tap.com', role: 'admin', deptCode: 'ADMIN', roleCode: 'SUPER_ADMIN' },
    { username: 'zhengshi', realName: '郑十', phone: '13800138008', email: 'zhengshi@tap.com', role: 'bd', deptCode: 'FINANCE', roleCode: 'BD' },
    { username: 'fengyi', realName: '冯一', phone: '13800138009', email: 'fengyi@tap.com', role: 'bd', deptCode: 'SALES', roleCode: 'BD' },
    { username: 'chener', realName: '陈二', phone: '13800138010', email: 'chener@tap.com', role: 'bd', deptCode: 'MARKETING', roleCode: 'BD' }
  ];
  
  for (const u of userData) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      let dept = await Department.findOne({ code: u.deptCode });
      let role = await Role.findOne({ code: u.roleCode });
      
      // 如果找不到部门或角色，使用第一个
      if (!dept) dept = departments[0];
      if (!role) role = roles[0];
      
      const newUser = await User.create({
        companyId: company._id,
        deptId: dept._id,
        roleId: role._id,
        role: u.role,
        username: u.username,
        password: 'password123',
        realName: u.realName,
        phone: u.phone,
        email: u.email,
        status: 'active'
      });
      users.push(newUser);
      console.log('创建用户:', newUser.username);
    }
  }

  // 创建产品和活动
  const products = [];
  for (let i = 1; i <= 20; i++) {
    const product = await Product.create({
      companyId: company._id,
      name: `产品 ${i}`,
      sku: `SKU${String(i).padStart(4, '0')}`,
      category: '美妆',
      price: Math.floor(Math.random() * 100) + 20,
      description: `产品 ${i} 的描述`
    });
    products.push(product);
  }

  const activities = [];
  for (let i = 1; i <= 5; i++) {
    const activity = await Activity.create({
      companyId: company._id,
      name: `活动 ${i}`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    activities.push(activity);
  }

  const stores = [];
  for (let i = 1; i <= 10; i++) {
    const store = await Store.create({
      companyId: company._id,
      name: `店铺 ${i}`,
      platform: 'TikTok Shop'
    });
    stores.push(store);
  }

  // 创建达人
  const influencers = [];
  const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'KR'];
  for (let i = 1; i <= 100; i++) {
    const influencer = await Influencer.create({
      companyId: company._id,
      tiktokInfo: {
        cid: `cid${i}`,
        tiktokId: `tiktok${i}`,
        username: `user${i}`,
        displayName: `Influencer ${i}`,
        avatar: `https://i.pravatar.cc/150?u=${i}`
      },
      crmInfo: {
        poolType: Math.random() > 0.5 ? 'public' : 'private',
        assignedTo: users[Math.floor(Math.random() * users.length)]?._id,
        assignedAt: new Date()
      },
      basicInfo: {
        realName: `达人 ${i}`,
        phone: `1${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
        email: `influencer${i}@example.com`,
        country: countries[Math.floor(Math.random() * countries.length)]
      },
      statistics: {
        followers: Math.floor(Math.random() * 1000000) + 10000,
        gmv: Math.floor(Math.random() * 500000) + 1000,
        avgViews: Math.floor(Math.random() * 50000) + 1000,
        avgSales: Math.floor(Math.random() * 1000) + 10
      },
      status: Math.random() > 0.1 ? 'active' : 'inactive'
    });
    influencers.push(influencer);
    if (i % 20 === 0) console.log('创建达人:', i);
  }

  // 创建样品
  const samples = [];
  for (let i = 1; i <= 200; i++) {
    const sample = await SampleRequest.create({
      companyId: company._id,
      productId: products[Math.floor(Math.random() * products.length)]._id,
      influencerId: influencers[Math.floor(Math.random() * influencers.length)]._id,
      registrarId: users[Math.floor(Math.random() * users.length)]._id,
      activityId: activities[Math.floor(Math.random() * activities.length)]._id,
      status: ['pending', 'approved', 'shipped', 'rejected', 'received'][Math.floor(Math.random() * 5)]
    });
    samples.push(sample);
    if (i % 50 === 0) console.log('创建样品:', i);
  }

  // 创建订单
  const orders = [];
  for (let i = 1; i <= 300; i++) {
    const influencer = influencers[Math.floor(Math.random() * influencers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const totalAmount = product.price * quantity;
    
    const order = await Order.create({
      companyId: company._id,
      influencerId: influencer._id,
      productId: product._id,
      storeId: stores[Math.floor(Math.random() * stores.length)]._id,
      activityId: activities[Math.floor(Math.random() * activities.length)]._id,
      orderNo: `ORD${Date.now()}${String(i).padStart(4, '0')}`,
      orderDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
      products: [{
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        totalAmount: totalAmount
      }],
      totalAmount: totalAmount,
      commissionRate: 0.15,
      currency: 'USD',
      status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)]
    });
    orders.push(order);
    if (i % 50 === 0) console.log('创建订单:', i);
  }

  // 创建分润
  for (let i = 1; i <= 2; i++) {
    const order = orders[Math.floor(Math.random() * orders.length)];
    const influencer = await Influencer.findById(order.influencerId);
    const bd = users[Math.floor(Math.random() * users.length)];
    
    const commission = await Commission.create({
      companyId: company._id,
      influencerId: influencer._id,
      bdId: bd._id,
      orderId: order._id,
      orderAmount: order.totalAmount,
      commissionAmount: order.totalAmount * order.commissionRate,
      commissionRate: order.commissionRate,
      status: ['pending', 'paid', 'settled'][Math.floor(Math.random() * 3)]
    });
    console.log('创建分润:', i);
  }

  console.log('\n✅ 数据创建完成！');
  console.log('- 角色: 3条');
  console.log('- 部门: 5条');
  console.log('- 用户: 10条');
  console.log('- 达人: 100条');
  console.log('- 样品: 200条');
  console.log('- 订单: 300条');
  console.log('- 分润: 2条');

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n完成！');
})();
