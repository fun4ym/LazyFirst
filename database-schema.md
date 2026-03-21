# BD达人管理系统 - 数据库设计

## 技术栈
- 数据库: CloudBase (MongoDB)
- 后端: Node.js + Express
- 前端: Vue.js 3 + Element Plus

## 数据库集合列表

### 1. users（用户表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,          // 所属公司
  username: String,              // 用户名（唯一）
  password: String,              // 加密密码
  realName: String,             // 真实姓名
  role: String,                  // admin, bd, viewer
  phone: String,                 // 手机号
  departmentId: ObjectId,        // 部门ID
  status: String,                // active, inactive
  createdAt: Date,
  updatedAt: Date
}
```

### 2. companies（公司表）
```javascript
{
  _id: ObjectId,
  name: String,                  // 公司名称
  contact: String,               // 联系人
  phone: String,                 // 联系电话
  email: String,                 // 邮箱
  address: String,               // 地址
  status: String,                // active, suspended
  createdAt: Date,
  updatedAt: Date
}
```

### 3. roles（角色表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  name: String,                  // 角色名称
  permissions: [String],         // 权限列表
  description: String,           // 描述
  createdAt: Date,
  updatedAt: Date
}
```

### 4. departments（部门表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  name: String,                  // 部门名称
  parentId: ObjectId,            // 父部门ID
  managerId: ObjectId,           // 部门负责人ID
  createdAt: Date,
  updatedAt: Date
}
```

### 5. influencers（达人表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  bdId: ObjectId,                // 归属BD（用户ID）
  name: String,                  // 达人名称
  nickname: String,              // 昵称
  tiktokId: String,              // TikTok ID
  tiktokUrl: String,             // TikTok主页链接
  avatar: String,                // 头像URL
  followers: Number,             // 粉丝数
  following: Number,             // 关注数
  likes: Number,                 // 点赞数
  platform: String,              // 平台（tiktok等）
  contactPhone: String,          // 联系方式
  wechat: String,                // 微信号
  email: String,                 // 邮箱
  address: String,               // 地址
  tags: [String],                // 标签
  status: String,                // active, inactive, blocked
  latestGmv: Number,             // 最新GMV
  remark: String,                // 备注
  createdAt: Date,
  updatedAt: Date
}
```

### 6. influencerMaintenances（达人维护记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  influencerId: ObjectId,       // 达人ID
  userId: ObjectId,              // 维护人ID
  type: String,                 // 维护类型
  content: String,               // 维护内容
  nextFollowUp: Date,            // 下次跟进时间
  createdAt: Date
}
```

### 7. products（产品表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  shopId: ObjectId,              // 所属店铺ID
  name: String,                  // 产品名称
  category: String,              // 品类
  sku: String,                   // SKU编号
  price: Number,                 // 价格
  image: String,                // 图片URL
  commissionRate: Number,        // 默认分润比例
  status: String,                // active, inactive
  remark: String,                // 备注
  createdAt: Date,
  updatedAt: Date
}
```

### 8. shops（店铺表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  avatar: String,                // 店铺头像
  shopName: String,              // 店铺名称
  shopNumber: String,            // 店铺号（唯一）
  identificationCode: String,    // 识别码（用于公开样品页）
  identificationCodeGeneratedAt: Date, // 识别码生成时间
  contactAddress: String,        // 联系地址
  remark: String,                // 备注
  status: String,                // active, inactive
  creditRating: Number,          // 信用等级（1-10）
  cooperationRating: Number,     // 配合程度（1-10）
  createdAt: Date,
  updatedAt: Date
}
```

### 9. shopContacts（店铺联系人表）
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,              // 店铺ID
  name: String,                  // 联系人姓名
  phone: String,                 // 手机号
  email: String,                 // 邮箱
  address: String,               // 地址
  remark: String,                // 备注
  createdAt: Date,
  updatedAt: Date
}
```

### 10. shopRatings（店铺评分表）
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,              // 店铺ID
  creditRating: Number,         // 信用等级
  creditRemark: String,         // 信用等级说明
  cooperationRating: Number,   // 配合程度
  cooperationRemark: String,   // 配合程度说明
  createdAt: Date,
  updatedAt: Date
}
```

### 11. shopTrackings（店铺跟踪记录表）
```javascript
{
  _id: ObjectId,
  shopId: ObjectId,              // 店铺ID
  userId: ObjectId,             // 跟踪人ID
  action: String,               // 操作内容
  trackingDate: Date,           // 跟踪时间
  createdAt: Date
}
```

### 12. samplemanagements（样品申请记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  shopId: ObjectId,             // 店铺ID
  productId: ObjectId,          // 产品ID
  influencerId: ObjectId,       // 达人ID
  bdId: ObjectId,               // BD用户ID
  influencerAccount: String,    // 达人账号
  productName: String,          // 产品名称
  sampleImage: String,          // 样品图片
  sampleQuantity: Number,       // 样品数量
  status: String,               // pending, approved, shipped, rejected, received
  shippingAddress: {             // 收货地址
    name: String,
    phone: String,
    address: String
  },
  trackingNumber: String,        // 快递单号
  videoStreamCode: String,      // 投流码
  requestDate: Date,            // 申请日期
  createdAt: Date,
  updatedAt: Date
}
```

### 13. orders（订单表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  influencerId: ObjectId,        // 达人ID
  orderNo: String,              // 订单号
  orderDate: Date,              // 订单日期
  platform: String,             // 平台
  products: [{                  // 产品列表
    productId: ObjectId,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    totalAmount: Number
  }],
  totalAmount: Number,           // 订单总额
  commissionRate: Number,        // 分润比例
  status: String,               // pending, completed, cancelled
  createdAt: Date,
  updatedAt: Date
}
```

### 14. commissions（分润记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  bdId: ObjectId,               // BD用户ID
  influencerId: ObjectId,       // 达人ID
  orderId: ObjectId,            // 订单ID
  sampleRequestId: ObjectId,    // 申样记录ID
  orderAmount: Number,          // 订单金额
  commissionAmount: Number,     // 分润金额
  commissionRate: Number,       // 分润比例
  calculatedDate: Date,         // 计算日期
  status: String,               // pending, paid, settled
  remark: String,               // 备注
  createdAt: Date,
  updatedAt: Date
}
```

### 15. activities（TikTok活动表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  tikTokActivityId: String,     // TikTok活动ID
  name: String,                 // 活动名称
  type: String,                 // self_initiated, merchant_initiated
  partnerCenter: String,         // Partner Center
  startDate: Date,              // 开始日期
  endDate: Date,                // 结束日期
  budget: Number,               // 预算
  status: String,               // active, completed, cancelled
  createdAt: Date,
  updatedAt: Date
}
```

### 16. activityHistories（活动历史记录表）
```javascript
{
  _id: ObjectId,
  activityId: ObjectId,          // 活动ID
  influencerId: ObjectId,       // 达人ID
  content: String,               // 内容
  createdAt: Date
}
```

### 17. cooperationProducts（合作产品表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  activityId: ObjectId,         // 活动ID
  productId: ObjectId,          // 产品ID
  influencerCommissionRate: Number, // 达人佣金比例
  tapCommissionRate: Number,    // TAP佣金比例
  bdCommissionRate: Number,     // BD佣金比例
  businessCommissionRate: Number, // 商务佣金比例
  status: String,               // active, inactive
  createdAt: Date,
  updatedAt: Date
}
```

### 18. bdDailies（BD每日统计表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  userId: ObjectId,              // BD用户ID
  date: Date,                    // 统计日期
  newInfluencers: Number,        // 新增达人
  sampleRequests: Number,         // 申样数
  orders: Number,                // 订单数
  gmv: Number,                   // GMV
  createdAt: Date,
  updatedAt: Date
}
```

### 19. commissionRules（分润规则表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  name: String,                  // 规则名称
  type: String,                  // 规则类型
  condition: String,             // 条件
  commissionRate: Number,        // 分润比例
  status: String,                // active, inactive
  createdAt: Date,
  updatedAt: Date
}
```

### 20. baseData（基础数据表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  type: String,                 // 数据类型（country, city, bank, social_app等）
  code: String,                  // 代码
  name: String,                  // 名称
  icon: String,                  // 图标
  isDefault: Boolean,           // 是否默认
  createdAt: Date,
  updatedAt: Date
}
```

### 21. reportOrders（订单报表表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  orderNo: String,               // 订单号
  orderDate: Date,              // 订单日期
  influencerId: ObjectId,       // 达人ID
  influencerName: String,       // 达人名称
  productName: String,          // 产品名称
  quantity: Number,             // 数量
  unitPrice: Number,            // 单价
  totalAmount: Number,          // 总金额
  commission: Number,           // 佣金
  status: String,               // 状态
  createdAt: Date,
  updatedAt: Date
}
```

### 22. performances（业绩报表表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  userId: ObjectId,              // 用户ID
  period: String,                // 统计周期（month, week, day）
  startDate: Date,              // 开始日期
  endDate: Date,                // 结束日期
  totalOrders: Number,          // 总订单数
  totalGmv: Number,             // 总GMV
  totalCommission: Number,       // 总佣金
  newInfluencers: Number,        // 新增达人
  sampleRequests: Number,        // 申样数
  createdAt: Date,
  updatedAt: Date
}
```

## 核心业务逻辑

### 多租户隔离
- 所有数据表都包含 `companyId` 字段
- 查询时必须按 `companyId` 过滤
- 用户只能看到自己公司的数据

### 分润计算规则
1. 订单成交后，查找关联的申样记录
2. 根据申样记录中的BD和订单金额计算分润
3. 分润金额 = 订单总额 × 分润比例
4. 生成分润记录，状态为待结算
