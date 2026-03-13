# BD达人管理系统 - 数据库设计

## 技术栈
- 数据库: CloudBase (MongoDB)
- 后端: Node.js + Express
- 前端: Vue.js 3

## 数据库表结构

### 1. companies（公司表）
```javascript
{
  _id: "company_id",
  name: "公司名称",
  contact: "联系人",
  phone: "联系电话",
  email: "邮箱",
  status: "active",  // active, suspended
  createdAt: Date,
  settings: {
    commissionRate: 0.1,  // 默认分润比例
    sampleLimit: 100  // 申样数量限制
  }
}
```

### 2. users（用户表）
```javascript
{
  _id: "user_id",
  companyId: "company_id",  // 多租户隔离
  username: "用户名",
  password: "加密密码",
  realName: "真实姓名",
  role: "admin",  // admin, bd, viewer
  phone: "手机号",
  status: "active",
  createdAt: Date
}
```

### 3. influencers（达人表）
```javascript
{
  _id: "influencer_id",
  companyId: "company_id",
  bdId: "bd_user_id",  // 归属BD
  name: "达人名称",
  nickname: "昵称",
  platform: "douyin",  // douyin, xiaohongshu, kuaishou
  platformId: "平台ID",
  followers: 100000,
  contactPhone: "联系方式",
  wechat: "微信号",
  tags: ["美妆", "穿搭"],
  status: "active",  // active, inactive
  createdAt: Date
}
```

### 4. sampleRequests（申样记录表）
```javascript
{
  _id: "request_id",
  companyId: "company_id",
  bdId: "bd_user_id",
  influencerId: "influencer_id",
  requestDate: Date,
  products: [{
    productId: "产品ID",
    productName: "产品名称",
    category: "品类",
    quantity: 1,
    unitPrice: 99.00
  }],
  status: "pending",  // pending, approved, shipped, rejected, received
  shippingAddress: {
    name: "收货人",
    phone: "电话",
    address: "详细地址"
  },
  trackingNumber: "快递单号",
  createdAt: Date
}
```

### 5. orders（订单表）
```javascript
{
  _id: "order_id",
  companyId: "company_id",
  influencerId: "influencer_id",
  orderDate: Date,
  orderNo: "订单号",
  platform: "douyin",
  products: [{
    productId: "产品ID",
    productName: "产品名称",
    quantity: 10,
    unitPrice: 199.00,
    totalAmount: 1990.00
  }],
  totalAmount: 1990.00,
  commissionRate: 0.15,  // 该订单分润比例
  status: "completed",  // pending, completed, cancelled
  createdAt: Date
}
```

### 6. commissions（分润记录表）
```javascript
{
  _id: "commission_id",
  companyId: "company_id",
  bdId: "bd_user_id",
  influencerId: "influencer_id",
  orderId: "order_id",
  sampleRequestId: "sample_request_id",  // 关联申样记录
  orderAmount: 1990.00,
  commissionAmount: 298.50,  // 分润金额
  commissionRate: 0.15,
  calculatedDate: Date,
  status: "pending",  // pending, paid, settled
  createdAt: Date
}
```

### 7. products（产品表）
```javascript
{
  _id: "product_id",
  companyId: "company_id",
  name: "产品名称",
  category: "品类",
  sku: "SKU编号",
  price: 199.00,
  commissionRate: 0.15,  // 默认分润比例
  status: "active",
  createdAt: Date
}
```

## 核心业务逻辑

### 分润计算规则
1. 订单成交后，查找关联的申样记录
2. 根据申样记录中的BD和订单金额计算分润
3. 分润金额 = 订单总额 × 分润比例
4. 生成分润记录，状态为待结算

### 多租户隔离
- 所有数据表都包含 `companyId` 字段
- 查询时必须按 `companyId` 过滤
- 用户只能看到自己公司的数据

### 索引设计
```javascript
// users
db.users.createIndex({ companyId: 1, username: 1 })
db.users.createIndex({ companyId: 1, role: 1 })

// influencers
db.influencers.createIndex({ companyId: 1, bdId: 1 })
db.influencers.createIndex({ companyId: 1, platform: 1 })

// sampleRequests
db.sampleRequests.createIndex({ companyId: 1, bdId: 1 })
db.sampleRequests.createIndex({ companyId: 1, influencerId: 1 })

// orders
db.orders.createIndex({ companyId: 1, influencerId: 1 })
db.orders.createIndex({ companyId: 1, orderNo: 1 })

// commissions
db.commissions.createIndex({ companyId: 1, bdId: 1 })
db.commissions.createIndex({ companyId: 1, status: 1 })
```
