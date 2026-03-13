# TAP系统 - 完整数据库设计

## 系统架构
- 多租户SaaS系统
- TikTok达人管理与分润平台
- 支持供应链管理、活动管理、样品管理、达人CRM

---

## 数据库表结构

### 1. companies（公司表）
```javascript
{
  _id: "company_id",
  name: "公司名称",
  contact: "联系人",
  phone: "联系电话",
  email: "邮箱",
  status: "active",
  createdAt: Date,
  settings: {
    defaultCurrency: "USD",  // 默认货币单位
    defaultCountry: "US",    // 默认国家
    sampleTimeout: 7,        // 样品超时天数
    flowRules: {
      publicPoolReturnDays: 30,  // 公海回收天数
      privatePoolMaxDays: 90     // 私海最大持有天数
    }
  }
}
```

### 2. departments（部门表）
```javascript
{
  _id: "dept_id",
  companyId: "company_id",
  name: "部门名称",
  parentId: "父部门ID",
  managerId: "部门负责人ID",
  description: "部门描述",
  status: "active",
  createdAt: Date
}
```

### 3. roles（角色表）
```javascript
{
  _id: "role_id",
  companyId: "company_id",
  name: "角色名称",
  description: "角色描述",
  permissions: ["permission1", "permission2"],  // 权限列表
  status: "active",
  createdAt: Date
}
```

### 4. users（用户表）
```javascript
{
  _id: "user_id",
  companyId: "company_id",
  deptId: "部门ID",
  roleId: "角色ID",
  username: "用户名",
  password: "加密密码",
  realName: "真实姓名",
  phone: "手机号",
  email: "邮箱",
  avatar: "头像URL",
  status: "active",
  createdAt: Date
}
```

### 5. productCategories（商品类目表）
```javascript
{
  _id: "category_id",
  companyId: "company_id",
  name: "类目名称",
  parentId: "父类目ID",
  level: 1,  // 层级
  sortOrder: 1,
  status: "active",
  createdAt: Date
}
```

### 6. productGrades（商品等级表）
```javascript
{
  _id: "grade_id",
  companyId: "company_id",
  name: "等级名称",  // S/A/B/C
  description: "等级描述",
  minGMV: 10000,
  minFollowers: 100000,
  sortOrder: 1,
  status: "active",
  createdAt: Date
}
```

### 7. suppliers（供货商表）
```javascript
{
  _id: "supplier_id",
  companyId: "company_id",
  name: "供货商名称",
  shortName: "简称",
  description: "备注",
  contact: {
    name: "联系人",
    phone: "电话",
    email: "邮箱",
    address: "地址"
  },
  status: "active",
  createdAt: Date
}
```

### 8. stores（店铺表）
```javascript
{
  _id: "store_id",
  companyId: "company_id",
  supplierId: "供货商ID",
  name: "店铺名称",
  country: "国家",  // US, UK, etc.
  tiktokId: "TikTok店铺ID",
  tiktokShopName: "TikTok店名",
  contact: {
    name: "联系人",
    phone: "电话",
    email: "邮箱"
  },
  maintainerId: "维护人ID",
  status: "active",
  createdAt: Date
}
```

### 9. products（商品表）
```javascript
{
  _id: "product_id",
  companyId: "company_id",
  supplierId: "供货商ID",
  storeId: "店铺ID",
  categoryId: "类目ID",
  gradeId: "等级ID",
  name: "商品名称",
  sku: "SKU编号",
  tiktokSku: "TikTok SKU",
  price: 199.00,
  currency: "USD",
  commissionRate: 0.15,  // 佣金比例
  cooperationMode: {
    commissionEnabled: true,
    sampleRequired: true,        // 是否需要寄样
    sampleMode: "offline",       // online/offline
    sampleRequirements: "样品要求",
    activityParticipation: true   // 是否参与活动
  },
  images: ["image1.jpg"],
  description: "商品描述",
  status: "active",
  createdAt: Date
}
```

### 10. commissionSettings（分润设置表）
```javascript
{
  _id: "setting_id",
  companyId: "company_id",
  supplierId: "供货商ID",
  storeId: "店铺ID",
  productId: "商品ID",
  rules: [{
    minAmount: 0,
    maxAmount: 1000,
    commissionRate: 0.10
  }],
  status: "active",
  createdAt: Date
}
```

### 11. activities（活动表）
```javascript
{
  _id: "activity_id",
  companyId: "company_id",
  name: "活动名称",
  partnerCenter: {
    campaignId: "活动ID"
  },
  description: "活动描述",
  startDate: Date,
  endDate: Date,
  products: ["product_id1", "product_id2"],
  influencers: ["influencer_id1"],
  status: "active",
  createdAt: Date
}
```

### 12. sampleRequests（样品申请表）
```javascript
{
  _id: "request_id",
  companyId: "company_id",
  activityId: "活动ID",
  productId: "商品ID",
  influencerId: "达人ID",
  registrarId: "登记人ID",  // BD
  applicantId: "申请人ID",
  requestDate: Date,
  status: "pending",  // pending, approved, shipped, rejected, received
  feedback: {
    result: "approved",  // approved, rejected
    feedbackBy: "反馈人ID",
    feedbackAt: Date,
    remark: "反馈备注"
  },
  createdAt: Date
}
```

### 13. influencers（达人表）
```javascript
{
  _id: "influencer_id",
  companyId: "company_id",
  tiktokInfo: {
    cid: "TikTok CID",
    partnerCenterId: "PartnerCenter ID",
    tiktokId: "TikTok ID",
    username: "用户名",
    displayName: "显示名称",
    avatar: "头像URL"
  },
  crmInfo: {
    poolType: "private",  // public, private
    assignedTo: "维护人ID",  // BD
    assignedAt: Date,
    lastActivityAt: Date
  },
  basicInfo: {
    realName: "真实姓名",
    phone: "联系电话",
    wechat: "微信号",
    email: "邮箱",
    address: "地址",
    country: "国家"
  },
  statistics: {
    followers: 100000,
    gmv: 500000,
    avgViews: 10000,
    avgSales: 500
  },
  tags: ["美妆", "穿搭"],
  expertise: ["化妆教程", "产品评测"],
  status: "active",
  createdAt: Date
}
```

### 14. influencerFlows（达人流动记录表）
```javascript
{
  _id: "flow_id",
  companyId: "company_id",
  influencerId: "达人ID",
  fromUserId: "从哪个用户",
  toUserId: "到哪个用户",
  poolType: "private",  // public, private
  flowType: "assign",  // assign, reclaim, transfer
  reason: "流动原因",
  operatorId: "操作人ID",
  createdAt: Date
}
```

### 15. influencerMaintenanceRecords（达人维护记录表）
```javascript
{
  _id: "record_id",
  companyId: "company_id",
  influencerId: "达人ID",
  maintainerId: "维护人ID",
  recordType: "data_change",  // data_change, cooperation, remark
  dataChange: {
    type: "followers",  // followers, gmv
    oldValue: 100000,
    newValue: 120000,
    changeDate: Date
  },
  cooperation: {
    score: 8,  // 配合度打分 1-10
    recordedAt: Date
  },
  inquiry: {
    isPaid: true,
    price: 500,
    currency: "USD",
    recordedAt: Date
  },
  remark: "备注内容",
  createdAt: Date
}
```

### 16. influencerVideoScores（达人视频打分表）
```javascript
{
  _id: "score_id",
  companyId: "company_id",
  influencerId: "达人ID",
  scorerId: "打分人ID",
  tiktokData: {
    weeklyViews: 50000,
    monthlyViews: 200000,
    recordedAt: Date
  },
  salesData: {
    weeklySales: 1000,
    monthlySales: 5000,
    recordedAt: Date
  },
  subjectiveRequirements: {
    faceShown: true,        // 露脸出镜
    voiceOver: true,        // 旁白解说
    productClear: true,     // 商品清晰
    duration: 60            // 时长（秒）
  },
  totalScore: 85,
  createdAt: Date
}
```

### 17. influencerProfiles（达人画像表）
```javascript
{
  _id: "profile_id",
  companyId: "company_id",
  influencerId: "达人ID",
  expertise: ["化妆教程", "产品评测", "穿搭分享"],
  cooperationScore: {
    historicalWeight: 0.5,
    historicalScore: 7.5,
    recentWeight: 0.5,
    recentScore: 8.5,
    totalScore: 8.0
  },
  videoQualityScore: {
    historicalWeight: 0.7,
    historicalScore: 80,
    recentWeight: 0.3,
    recentScore: 85,
    totalScore: 81.5
  },
  tags: ["美妆博主", "高转化", "粉丝粘性强"],
  status: "active",
  createdAt: Date
}
```

### 18. orders（订单表）
```javascript
{
  _id: "order_id",
  companyId: "company_id",
  influencerId: "达人ID",
  productId: "商品ID",
  storeId: "店铺ID",
  activityId: "活动ID",
  orderNo: "订单号",
  orderDate: Date,
  platform: "tiktok",
  products: [{
    productId: "product_id",
    productName: "商品名称",
    quantity: 10,
    unitPrice: 199.00,
    totalAmount: 1990.00
  }],
  totalAmount: 1990.00,
  commissionRate: 0.15,
  currency: "USD",
  status: "completed",  // pending, completed, cancelled
  createdAt: Date
}
```

### 19. commissions（分润记录表）
```javascript
{
  _id: "commission_id",
  companyId: "company_id",
  influencerId: "达人ID",
  bdId: "BD用户ID",
  orderId: "订单ID",
  sampleRequestId: "样品申请ID",
  orderAmount: 1990.00,
  commissionAmount: 298.50,
  commissionRate: 0.15,
  calculatedDate: Date,
  status: "pending",  // pending, paid, settled
  createdAt: Date
}
```

---

## 核心业务逻辑

### 1. 达人流动规则
- **公海池**：无人维护的达人
- **私海池**：BD专属维护的达人
- **自动回收**：超过30天未跟进的达人自动回公海
- **手动分配**：管理员可以将达人分配给BD

### 2. 达人评分体系
```
配合度加权值 = 历史评分 × 50% + 最近评分 × 50%
视频质量加权 = 历史评分 × 70% + 最近评分 × 30%
```

### 3. 分润计算流程
```
订单成交 → 查找关联样品申请 → 确认BD → 计算分润 → 生成分润记录
分润金额 = 订单金额 × 佣金比例
```

### 4. 样品申请流程
```
BD登记样品申请 → 审批 → 发货 → 达人收货 → 反馈结果
```

---

## 索引设计

### 用户相关
```javascript
db.users.createIndex({ companyId: 1, username: 1 })
db.users.createIndex({ companyId: 1, deptId: 1 })
db.users.createIndex({ companyId: 1, roleId: 1 })
```

### 达人相关
```javascript
db.influencers.createIndex({ companyId: 1, crmInfo.poolType: 1 })
db.influencers.createIndex({ companyId: 1, crmInfo.assignedTo: 1 })
db.influencers.createIndex({ companyId: 1, tiktokInfo.cid: 1 })
```

### 供应链相关
```javascript
db.suppliers.createIndex({ companyId: 1 })
db.stores.createIndex({ companyId: 1, supplierId: 1 })
db.products.createIndex({ companyId: 1, supplierId: 1 })
db.products.createIndex({ companyId: 1, storeId: 1 })
```

### 订单和分润
```javascript
db.orders.createIndex({ companyId: 1, influencerId: 1 })
db.orders.createIndex({ companyId: 1, orderNo: 1 })
db.commissions.createIndex({ companyId: 1, bdId: 1 })
db.commissions.createIndex({ companyId: 1, status: 1 })
```

---

## API路由规划

### 基础规则模块
```
GET    /api/departments         - 获取部门列表
POST   /api/departments         - 创建部门
GET    /api/roles               - 获取角色列表
POST   /api/roles               - 创建角色
GET    /api/users               - 获取用户列表
POST   /api/users               - 创建用户
```

### 供应链模块
```
GET    /api/suppliers           - 获取供货商列表
POST   /api/suppliers           - 创建供货商
GET    /api/stores              - 获取店铺列表
POST   /api/stores              - 创建店铺
GET    /api/products            - 获取商品列表
POST   /api/products            - 创建商品
```

### 活动模块
```
GET    /api/activities          - 获取活动列表
POST   /api/activities          - 创建活动
```

### 样品模块
```
GET    /api/samples             - 获取样品申请列表
POST   /api/samples             - 创建样品申请
PUT    /api/samples/:id/feedback - 反馈样品申请
```

### 达人模块
```
GET    /api/influencers         - 获取达人列表
POST   /api/influencers         - 创建达人
PUT    /api/influencers/:id     - 更新达人
GET    /api/influencers/:id/profile - 获取达人画像
POST   /api/influencers/:id/assign - 分配达人
POST   /api/influencers/:id/reclaim - 回收达人
GET    /api/influencers/:id/maintenance - 获取维护记录
POST   /api/influencers/:id/maintenance - 添加维护记录
POST   /api/influencers/:id/video-score - 视频打分
```

### 订单和分润模块
```
GET    /api/orders              - 获取订单列表
POST   /api/orders              - 创建订单
GET    /api/commissions         - 获取分润记录
POST   /api/commissions/calculate - 计算分润
```
