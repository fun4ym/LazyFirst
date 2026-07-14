# BD达人管理系统 - 数据库设计

> **⚠️ 文档更新说明（2026-07-14）**
> 本文档原始版本仅记录 **24 个模型**，经《项目优化方案-20260714.md》勘察，实际 `server/models/` 共有 **34 个模型文件**。
> 下方"## 数据库集合列表"仅保留原始 24 个模型的逐字段详述；**新增模型与字段偏离**统一在文末「附录：模型清单校正（34 个）」中说明，避免与逐字段详述冲突。
> 已知冗余/悬空引用点见《项目优化方案-20260714.md》第 3 章，本文档仅做事实补充，不含改动。

## 技术栈
- 数据库: MongoDB (Mongoose ODM)
- 后端: Node.js + Express
- 前端: Vue.js 3 + Element Plus

## 数据库集合列表（原始 24 个模型，字段详述见下；完整 34 个见文末附录）

### 1. users（用户表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,          // 所属公司
  deptId: ObjectId,             // 部门ID
  roleId: ObjectId,             // 角色ID
  role: String,                 // admin, bd, viewer（默认bd）
  username: String,             // 用户名（唯一）
  password: String,             // bcrypt加密密码
  realName: String,             // 真实姓名
  phone: String,                // 手机号
  email: String,                // 邮箱
  avatar: String,               // 头像
  status: String,               // active, inactive, suspended
  bankAccount: String,          // 银行账号
  employmentStatus: String,     // 任职状态: fulltime/parttime/nocommission
  settlementType: String,       // 结算类型: monthly/weekly
  settlementDay: Number,        // 结算日（月结1-31，周结1-7）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, username: 1 }, { companyId: 1, deptId: 1 }
// 钩子: pre('save') 自动bcrypt加密密码
// 方法: comparePassword(), toJSON()隐藏密码
```

### 2. companies（公司表）
```javascript
{
  _id: ObjectId,
  name: String,                 // 公司名称
  contact: String,              // 联系人
  phone: String,                // 联系电话
  email: String,                // 邮箱
  status: String,               // active, suspended
  settings: {
    defaultCurrency: String,    // 默认货币（USD）
    defaultCountry: String,     // 默认国家（US）
    sampleTimeout: Number,      // 样品超时天数（7）
    flowRules: {
      publicPoolReturnDays: Number,   // 公池回收天数（30）
      privatePoolMaxDays: Number      // 私池最大天数（90）
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3. roles（角色表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  code: String,                  // 角色编码（唯一）
  name: String,                  // 角色名称
  description: String,           // 描述
  permissions: [String],         // 权限列表
  dataScope: String,             // 数据权限: self/dept/all
  moduleDataScopes: Object,      // 模块级数据权限 { influencers: 'all', samples: 'dept' }
  allowedDepts: [ObjectId],      // 允许查看的部门ID列表
  status: String,                // active, inactive
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, name: 1 } (unique)
```

### 4. departments（部门表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  parentId: ObjectId,            // 父部门ID（支持树形结构）
  name: String,                  // 部门名称
  description: String,           // 描述
  managerId: ObjectId,           // 部门负责人ID
  status: String,                // active, inactive
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, parentId: 1 }, { companyId: 1, name: 1 }
```

### 5. influencers（达人表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  // TikTok信息
  tiktokName: String,            // TikTok名称（必填）
  tiktokId: String,              // TikTok ID（必填）
  formerNames: String,           // 曾用名
  formerIds: String,             // 曾用ID
  originalTiktokId: String,      // 原始TikTok ID
  // 状态
  status: String,                // enabled, disabled
  // 归类标签
  categoryTags: [ObjectId],      // 关联BaseData
  // 真实信息
  realName: String,
  nickname: String,
  gender: String,                // male, female, other
  addresses: [String],
  phoneNumbers: [String],
  socialAccounts: [String],
  // 达人归属
  poolType: String,              // public, private
  assignedTo: ObjectId,          // 归属BD（User ID）
  assignedAt: Date,
  // 最新维护信息
  latestFollowers: Number,       // 最新粉丝数
  latestGmv: Number,             // 最新GMV
  latestMaintenanceTime: Date,   // 最近维护时间
  latestMaintainerId: ObjectId,  // 最近维护人ID
  latestMaintainerName: String,
  latestRemark: String,
  // 达人参数
  monthlySalesCount: Number,     // 月销件数
  suitableCategories: [ObjectId],// 适用品类（关联BaseData）
  avgVideoViews: Number,         // 视频均播
  // 黑名单
  isBlacklisted: Boolean,
  blacklistedAt: Date,
  blacklistedBy: ObjectId,
  blacklistedByName: String,
  blacklistReason: String,
  createdAt: Date,
  updatedAt: Date
}
// 虚拟字段: maintenanceStatus (public/pending/normal/maintenance_needed/at_risk/about_to_release/released)
// 索引: { companyId: 1, poolType: 1 }, { companyId: 1, assignedTo: 1 }, { companyId: 1, tiktokId: 1 }, { companyId: 1, tiktokName: 1 }, { companyId: 1, status: 1 }
```

### 6. influencerMaintenances（达人维护记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  influencerId: ObjectId,        // 达人ID（必填）
  followers: Number,             // 粉丝数
  gmv: Number,                   // GMV
  monthlySalesCount: Number,     // 月销件数
  avgVideoViews: Number,         // 视频均播
  poolType: String,              // public, private
  remark: String,                // 维护备注
  maintainerId: ObjectId,        // 维护人ID（必填）
  maintainerName: String,        // 维护人姓名（必填）
  recordType: String,            // maintenance, sample_application
  sampleId: ObjectId,            // 关联样品ID（sample_application时）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { influencerId: 1, createdAt: -1 }, { companyId: 1, maintainerId: 1 }
```

### 7. products（产品表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  supplierId: ObjectId,          // 供应商ID
  shopId: ObjectId,              // 店铺ID
  categoryId: ObjectId,          // 品类ID（ProductCategory）
  gradeId: ObjectId,             // 等级ID（ProductGrade）
  name: String,                  // 产品名称（必填）
  sku: String,                   // SKU编号（必填）
  tiktokSku: String,             // TikTok SKU
  tiktokProductId: String,       // TikTok商品ID
  productCategory: String,       // 品类
  price: Number,                 // 价格
  currency: String,              // 货币（默认USD）
  sellingPrice: Number,          // 售价（合作价格）
  priceRangeMin: Number,         // 价格区间下限
  priceRangeMax: Number,         // 价格区间上限
  commissionRate: Number,        // 默认佣金率（0.15）
  squareCommissionRate: Number,  // 广场佣金率
  cooperationMode: {
    commissionEnabled: Boolean,  // 是否启用佣金
    sampleRequired: Boolean,     // 是否需要样品
    sampleMode: String,          // online/offline
    sampleRequirements: String,  // 样品要求
    activityParticipation: Boolean // 是否参与活动
  },
  // 商品信息
  productGrade: String,          // ordinary/hot/main/new
  productImages: [String],       // 商品图片
  productIntro: String,          // 商品介绍
  referenceVideo: String,        // 参考视频
  sellingPoints: String,         // 卖点
  // 活动配置（一个商品可参与多个活动）
  activityConfigs: [{
    activityId: ObjectId,        // 活动ID（必填）
    isDefault: Boolean,          // 是否为默认活动
    activityLink: String,        // 活动专属链接
    // 达人要求
    requirementGmv: Number,
    requirementMonthlySales: Number,
    requirementFollowers: Number,
    requirementAvgViews: Number,
    requirementRemark: String,
    // 样品信息
    sampleMethod: String,
    cooperationCountry: String,
    // 推广时佣金配置
    promotionInfluencerRate: Number,
    promotionOriginalRate: Number,
    promotionCompanyRate: Number,
    // 投广告时佣金配置
    adInfluencerRate: Number,
    adOriginalRate: Number,
    adCompanyRate: Number
  }],
  images: [String],
  description: String,
  status: String,                // active, inactive
  createdAt: Date,
  updatedAt: Date
}
// 钩子: pre('save') 验证同一产品不能参与同一活动多次
// 索引: { companyId: 1, supplierId: 1 }, { companyId: 1, sku: 1 }
```

### 8. shops（店铺表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  avatar: String,                // 店铺头像
  shopName: String,              // 店铺名称（必填）
  shopNumber: String,            // 店铺号（唯一）
  contactAddress: String,        // 联系地址
  remark: String,                // 备注
  status: String,                // active, inactive
  identificationCode: String,    // 识别码（用于公开样品页）
  identificationCodeGeneratedAt: Date, // 识别码生成时间
  products: [String],            // 关联商品ID列表
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, shopNumber: 1 }, { companyId: 1, shopName: 1 }, { companyId: 1, status: 1 }
```

### 9. shopContacts（店铺联系人表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  shopId: ObjectId,              // 店铺ID（必填）
  name: String,                  // 联系人姓名（必填）
  phone: String,                 // 手机号
  email: String,                 // 邮箱
  trackerId: ObjectId,           // 跟踪人ID（User）
  trackerName: String,           // 跟踪人姓名
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, shopId: 1 }
```

### 10. shopRatings（店铺评分表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  shopId: ObjectId,              // 店铺ID（唯一）
  creditRating: Number,          // 信用等级（1-10，默认5）
  creditRemark: String,          // 信用等级说明
  cooperationRating: Number,     // 配合程度（1-10，默认5）
  cooperationRemark: String,     // 配合程度说明
  updatedBy: ObjectId,           // 更新人
  updatedAt: Date,
  createdAt: Date
}
// 索引: { companyId: 1, shopId: 1 }
```

### 11. shopTrackings（店铺跟踪记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  shopId: ObjectId,              // 店铺ID（必填）
  userId: ObjectId,              // 跟踪人ID（必填）
  userName: String,              // 跟踪人姓名（必填）
  action: String,                // 操作内容（必填）
  trackingDate: Date,            // 跟踪时间
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, shopId: 1, trackingDate: -1 }
```

### 12. samplemanagements（样品管理表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  date: Date,                    // 日期（必填）
  productName: String,           // 商品名称（必填）
  productId: String,             // TikTok商品ID（String类型，必填）
  influencerAccount: String,     // 达人账号（必填）
  followerCount: Number,         // 粉丝数
  monthlySalesCount: Number,     // 月销件数
  avgVideoViews: Number,         // 视频均播
  salesman: String,              // 归属业务员ID
  shippingInfo: String,          // 收货信息
  sampleImage: String,           // 样品图片URL
  isSampleSent: Boolean,         // 是否寄样（兼容旧数据）
  sampleStatus: String,          // pending/shipping/sent/refused
  refusalReason: String,         // 不合作原因
  sampleStatusUpdatedBy: ObjectId, // 寄样状态更新人
  sampleStatusUpdatedAt: Date,   // 寄样状态更新时间
  trackingNumber: String,        // 发货单号
  shippingDate: Date,            // 发货日期
  logisticsCompany: String,      // 物流公司
  receivedDate: Date,            // 收样日期
  fulfillmentTime: String,       // 履约时间
  videoLink: String,             // 达人视频链接
  videoStreamCode: String,       // 视频推流码
  isAdPromotion: Boolean,        // 是否投流
  adPromotionTime: Date,         // 投流时间
  isOrderGenerated: Boolean,     // 是否出单
  fulfillmentUpdatedBy: ObjectId,// 履约信息更新人
  fulfillmentUpdatedAt: Date,    // 履约信息更新时间
  adPromotionUpdatedBy: ObjectId,// 投流信息更新人
  adPromotionUpdatedAt: Date,    // 投流信息更新时间
  creatorId: ObjectId,           // 创建人
  createdAt: Date,
  updatedAt: Date
}
// 唯一索引: { companyId: 1, date: 1, influencerAccount: 1, productId: 1 }
// 辅助索引: { companyId: 1, influencerAccount: 1 }, { companyId: 1, productId: 1 }, { companyId: 1, isSampleSent: 1 }, { companyId: 1, isOrderGenerated: 1 }
```

### 13. orders（订单表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  influencerId: ObjectId,        // 达人ID
  // Excel导入字段
  orderNo: String,               // 订单号（必填）
  subOrderNo: String,            // 子订单号
  influencerUsername: String,    // 达人用户名
  productId: String,             // 产品ID
  productName: String,           // 产品名称
  sku: String,                   // SKU
  productPrice: Number,          // 产品价格
  orderQuantity: Number,         // 订单数量
  shopName: String,              // 店铺名称
  shopCode: String,              // 店铺编码
  orderStatus: String,           // 订单状态
  contentType: String,           // 内容类型
  contentId: String,             // 内容ID
  // 佣金率字段（6种）
  affiliatePartnerCommissionRate: Number,
  creatorCommissionRate: Number,
  serviceProviderRewardCommissionRate: Number,
  influencerRewardCommissionRate: Number,
  affiliateServiceProviderShopAdCommissionRate: Number,
  influencerShopAdCommissionRate: Number,
  // 预计佣金（7种）
  estimatedCommissionAmount: Number,
  estimatedAffiliatePartnerCommission: Number,
  estimatedServiceProviderRewardCommission: Number,
  estimatedInfluencerRewardCommission: Number,
  estimatedCreatorCommission: Number,
  estimatedInfluencerShopAdPayment: Number,
  estimatedAffiliateServiceProviderShopAdPayment: Number,
  // 实际佣金（7种）
  actualCommissionAmount: Number,
  actualAffiliatePartnerCommission: Number,
  actualCreatorCommission: Number,
  actualServiceProviderRewardCommission: Number,
  actualInfluencerRewardCommission: Number,
  actualAffiliateServiceProviderShopAdPayment: Number,
  actualInfluencerShopAdPayment: Number,
  // 退货退款
  returnedProductCount: Number,
  refundedProductCount: Number,
  // 时间字段
  createTime: Date,
  orderDeliveryTime: Date,
  commissionSettlementTime: Date,
  // 打款信息
  paymentNo: String,
  paymentMethod: String,
  paymentAccount: String,
  // 其他
  iva: String,
  isr: String,
  platform: String,              // 默认tiktok
  attributionType: String,
  // 兼容字段
  storeId: ObjectId,
  activityId: ObjectId,
  orderDate: Date,
  products: [{ productId, productName, quantity, unitPrice, totalAmount }],
  totalAmount: Number,           // 订单总额（必填）
  commissionRate: Number,        // 佣金率（默认0.15）
  currency: String,              // 默认USD
  status: String,                // pending/completed/cancelled
  creatorId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, influencerId: 1 }, { companyId: 1, orderNo: 1 }, { companyId: 1, status: 1 }, { companyId: 1, createTime: -1 }, { companyId: 1, commissionSettlementTime: -1 }
```

### 14. commissions（佣金记录表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  influencerId: ObjectId,        // 达人ID（必填）
  bdId: ObjectId,                // BD用户ID（必填）
  orderId: ObjectId,             // 订单ID（必填）
  sampleRequestId: ObjectId,     // 样品申请ID
  orderAmount: Number,           // 订单金额（必填）
  commissionAmount: Number,      // 佣金金额（必填）
  commissionRate: Number,        // 佣金比例（必填）
  calculatedDate: Date,          // 计算日期
  status: String,                // pending/paid/settled
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, bdId: 1 }, { companyId: 1, status: 1 }, { companyId: 1, orderId: 1 }
```

### 15. activities（TikTok活动表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  tikTokActivityId: String,      // TikTok活动ID
  name: String,                  // 活动名称（必填）
  type: String,                  // self_initiated/merchant_initiated
  partnerCenter: String,         // Partner Center
  tapLink: String,               // TAP链接
  sampleMethod: String,          // 线上/线下
  cooperationCountry: String,    // 合作国家
  startDate: Date,               // 开始日期（必填）
  endDate: Date,                 // 结束日期（必填）
  budget: Number,                // 预算
  // 佣金配置 - 推广
  promotionInfluencerRate: Number,  // 推广达人佣金率（0-100）
  promotionOriginalRate: Number,    // 推广原创佣金率
  promotionCompanyRate: Number,     // 推广公司佣金率
  // 佣金配置 - 广告
  adInfluencerRate: Number,         // 广告达人佣金率
  adOriginalRate: Number,           // 广告原创佣金率
  adCompanyRate: Number,            // 广告公司佣金率
  // 达人要求
  requirementGmv: Number,
  gmvCurrency: String,
  requirementMonthlySales: Number,
  requirementFollowers: Number,
  requirementAvgViews: Number,
  requirementRemark: String,
  description: String,
  status: String,                // pending/upcoming/active/ended
  creatorId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, createdAt: -1 }, { status: 1 }
```

### 16. activityHistories（活动历史记录表）
```javascript
{
  _id: ObjectId,
  activityId: ObjectId,          // 活动ID（必填）
  action: String,                // create/update/delete/status_change（必填）
  changes: Mixed,                // 变更内容
  previousData: Mixed,           // 变更前数据
  newData: Mixed,                // 变更后数据
  changedBy: ObjectId,           // 变更人ID（必填）
  changedByName: String,         // 变更人姓名
  companyId: ObjectId,           // 所属公司（必填）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { activityId: 1, createdAt: -1 }, { companyId: 1, createdAt: -1 }
```

### 17. recruitments（招募表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  name: String,                  // 招募名称（必填）
  description: String,           // 简介
  isStrict: Boolean,             // 是否强要求（默认false）
  requirementGmv: Number,        // GMV要求
  requirementFollowers: Number,  // 粉丝数要求(K)
  requirementMonthlySales: Number, // 月销件数要求
  requirementAvgViews: Number,   // 视频均播要求
  products: [ObjectId],          // 关联产品（Product）
  callableUsers: [ObjectId],     // 可调用人员（User）
  enabled: Boolean,              // 启用状态（默认true）
  creatorId: ObjectId,           // 新增人
  updatedBy: ObjectId,           // 最后编辑人
  identificationCode: String,    // 识别码（刷新按钮生成：名称+时间+1126 取16位MD5哈希）
  pageStyle: {                    // 页面样式配置
    layoutStyle: String,          // 页面布局样式: style1/style2/style3（默认style1）
    themeColor: String            // 主题色十六进制值（默认#775999）
  },
  createdAt: Date,
  updatedAt: Date
}
// 索引: { companyId: 1, enabled: 1 }, { name: 'text', description: 'text' }
// API: POST /api/recruitments/:id/refresh-code 刷新识别码
```

### 18. bills（账单表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  billNo: String,                // 账单号（唯一，自动生成 BILL+日期+序号）
  validStartDate: Date,          // 有效期开始
  validEndDate: Date,            // 有效期结束
  totalCommission: Number,       // 佣金总金额
  isSettled: Boolean,            // 是否结清
  settlementTime: Date,          // 结算时间
  settlementNotes: [{            // 结算备注（多条）
    type: String,                // salary/commission
    bdName: String,
    bankAccount: String,
    bankFlowNo: String,
    amount: Number,
    note: String,
    createdAt: Date,
    updatedAt: Date,
    creatorId: ObjectId,
    creatorName: String,
    history: [{ bankAccount, bankFlowNo, note, updatedAt, editorId, editorName }]
  }],
  orderCount: Number,            // 包含订单数
  bdList: [{ bdName, commission, orderCount }],
  creatorId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
// 静态方法: generateBillNo(companyId) 自动生成账单号
// 索引: { companyId: 1, createdAt: -1 }, { billNo: 1 } (unique)
```

### 19. bdDailies（BD日报表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司
  date: Date,                    // 统计日期（必填）
  salesman: String,              // BD姓名（必填）
  sampleCount: Number,           // 本日申样数
  sampleIds: String,             // 申样记录ID（逗号分隔）
  revenue: Number,               // 本日收入（GMV）
  estimatedCommission: Number,   // 本日预估服务费
  revenueIds: String,            // 收入记录ID（逗号分隔）
  orderCount: Number,            // 本日订单数
  commission: Number,            // 本日佣金
  orderGeneratedCount: Number,   // 本日出单数
  creatorId: ObjectId,
  updaterId: ObjectId,
  remark: String,
  createdAt: Date,
  updatedAt: Date
}
// 唯一索引: { companyId: 1, date: 1, salesman: 1 }
// 辅助索引: { companyId: 1, date: -1 }, { companyId: 1, salesman: 1 }
```

### 20. performances（绩效表）
```javascript
{
  _id: ObjectId,
  summaryDate: String,           // 汇总日期（必填）
  userId: ObjectId,              // 用户ID（必填）
  deptId: ObjectId,              // 部门ID
  gmv: Number,                   // GMV
  orderCount: Number,            // 订单数
  totalProfit: Number,           // 总利润
  commissionRate: Number,        // 佣金率（0-1）
  commissionType: String,        // fixed/tiered
  commissionAmount: Number,      // 佣金金额
  status: String,                // pending/approved
  remark: String,
  creatorId: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { summaryDate: 1, userId: 1, companyId: 1 }, { companyId: 1, createdAt: -1 }
```

### 21. commissionRules（佣金规则表）
```javascript
{
  _id: ObjectId,
  deptId: ObjectId,              // 部门ID（必填）
  ranges: [{                     // 阶梯费率
    rangeStart: Number,          // 起始值（必填）
    rangeEnd: Number,            // 结束值
    commissionRate: Number,      // 佣金率（0-1，必填）
    commissionType: String,      // fixed/tiered
    createdAt: Date
  }],
  status: String,                // active, inactive
  creatorId: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { deptId: 1, companyId: 1 }
```

### 22. reportOrders（报表订单表）
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  influencerId: ObjectId,        // 达人ID
  userId: ObjectId,              // 用户ID
  creatorId: ObjectId,           // 创建人
  // 与Order表相同的Excel导入字段、佣金率、预计/实际佣金、退货退款、时间、打款字段
  // 额外报表字段：
  summaryDate: String,           // 汇总日期（必填）
  merchandiser: String,          // 业务员
  bdName: String,                // 归属BD
  orderCount: Number,            // 订单数
  gmv: Number,                   // GMV
  groupInfo: String,             // 分组信息
  country: String,               // 国家
  isBlacklistedInfluencer: Boolean, // 达人是否黑名单
  settlementStatus: String,      // 未结清/已结清
  settlementBillNo: String,      // 结清账单号
  createdAt: Date,
  updatedAt: Date
}
// 索引: { summaryDate: 1, companyId: 1 }, { companyId: 1, createdAt: -1 }, { companyId: 1, commissionSettlementTime: -1 }
// 唯一索引: { orderNo: 1, subOrderNo: 1, companyId: 1 }
```

### 23. baseData（基础数据字典表）
```javascript
{
  _id: ObjectId,
  name: String,                  // 名称（必填）
  type: String,                  // country/category/grade/priceUnit/timeoutConfig/trackingUrl/influencerCategory（必填）
  code: String,                  // 代码
  englishName: String,           // 英文名
  value: Mixed,                  // 值
  description: String,           // 描述
  status: String,                // active, inactive
  isDefault: Boolean,            // 是否默认
  creatorId: ObjectId,
  companyId: ObjectId,           // 所属公司（必填）
  createdAt: Date,
  updatedAt: Date
}
// 索引: { type: 1, companyId: 1 }, { companyId: 1, createdAt: -1 }
```

### 24. tempIdMappings（临时ID映射表）
```javascript
{
  _id: ObjectId,
  tableName: String,             // 表名: shop/product/influencer（必填）
  originalId: String,            // Excel中的原始ID（必填）
  newId: ObjectId,               // MongoDB生成的新ID（必填）
  companyId: ObjectId,           // 公司ID（必填）
  createdAt: Date
}
// 唯一索引: { tableName: 1, originalId: 1 }
// 辅助索引: { tableName: 1, newId: 1 }
```

## 模型关系图

```
Company ─┬── User ──── Role
         ├── Department
         ├── Influencer ──── InfluencerMaintenance
         ├── Product ──── activityConfigs[] ──── Activity
         ├── Shop ─┬── ShopContact
         │         ├── ShopRating
         │         └── ShopTracking
         ├── SampleManagement
         ├── Order
         ├── ReportOrder
         ├── Commission
         ├── Recruitment ──── products[] ──── Product
         ├── Activity ──── ActivityHistory
         ├── Bill
         ├── BdDaily
         ├── Performance
         ├── CommissionRule
         ├── BaseData
         └── TempIdMapping
```

## 核心业务逻辑

### 多租户隔离
- 所有数据表都包含 `companyId` 字段
- 查询时必须按 `companyId` 过滤
- 用户只能看到自己公司的数据

### 达人池管理
- 公池(public)：无归属BD，任何人可认领
- 私池(private)：归属某BD，需定期维护
- 维护状态虚拟字段：public/pending/normal/maintenance_needed/at_risk/about_to_release/released
- 超过24天未维护自动释放回公池

### 佣金计算
- 活动级佣金配置：推广(3费率) + 广告(3费率)
- 产品级活动配置(activityConfigs)：每个商品可参与多个活动
- 阶梯佣金规则(CommissionRule)：按部门配置

### 分润计算规则
1. 订单成交后，查找关联的申样记录
2. 根据申样记录中的BD和订单金额计算分润
3. 分润金额 = 订单总额 × 分润比例
4. 生成分润记录，状态为待结算

### 招募识别码
- 生成规则：`活动名称 + 系统时间 + 1126` 取16位MD5哈希
- 存储在 `recruitments.identificationCode` 字段
- 通过 `POST /api/recruitments/:id/refresh-code` 手动刷新

---

## 附录：模型清单校正（共 34 个，2026-07-14 勘察）

> 实际 `server/models/` 共 34 个文件（含 `index.js`）。原始文档列出 24 个，**缺失 10 个**，另有部分已记录模型字段已实质偏离。

### A. 原始文档已记录（24 个，字段详述见上文）
users, companies, roles, departments, influencer_managements(Influencer), products(Product), orders(Order), sample_managements(SampleManagement), report_orders(ReportOrder), commissions(Commission), commission_rules(CommissionRule), activities(Activity), activity_histories(ActivityHistory), influencer_maintenances(InfluencerMaintenance), base_data(BaseData), bd_daily(BdDaily), performances(Performance), bills(Bill), shops(Shop), shop_contacts(ShopContact), shop_ratings(ShopRating), shop_trackings(ShopTracking), recruitments(Recruitment), temp_id_mappings(TempIdMapping)

### B. 文档缺失的 10 个模型（新增）

| 模型文件 | 集合/中文名 | 用途 | 主要字段（节选） |
|---|---|---|---|
| `Video.js` | videos / 视频 | 达人视频登记，关联样品与商品 | `companyId`, `sampleId`(→SampleManagement), `productId`(→Product), `tiktokProductId`, 播放/点赞/评论/分享指标 |
| `TiktokExtensionData.js` | tiktok_extension_data / 插件采集 | Chrome 插件采集的达人原始数据，待同步到 Influencer | `companyId`, `tiktokId`, `tiktokName`, `followerCount` 等 |
| `DigitalHuman.js` | digital_humans / 数字人 | BD 工具箱：数字人配置 | `companyId`, 名称/形象/配置 |
| `AiModel.js` | ai_models / AI 模型 | BD 工具箱：AI 模型配置 | `companyId`, 模型名/类型/参数 |
| `PointsTransaction.js` | points_transactions / 点数交易 | 达人点数赚取/消耗历史 | `influencerId`(→Influencer), `type`(earn/consume/gift), `amount` |
| `PromptTemplate.js` | prompt_templates / 提示词模板 | BD 工具箱：提示词模板 | `companyId`, 标题/内容/分类 |
| `PageVisit.js` | page_visits / 页面访问 | 页面访问埋点 | `companyId`, 路径/访客/时长 |
| `VideoGenerationTask.js` | video_generation_tasks / 视频生成任务 | AI 视频生成任务状态 | `influencerId`, `productId`, `prompt`, `status` |
| `Supplier.js` | suppliers / 供应商 | 供应链：供应商管理 | `companyId`, 名称/联系方式 |
| `ActivityHistory.js` | activity_histories / 活动历史 | 活动变更历史（已在 A 中，字段需补全） | 活动快照/操作人/时间 |

> 注：`ActivityHistory` 已在原始文档 A 中列出但字段节略，其余 9 个为完全缺失；完整字段以 `server/models/*.js` 源码为准。

### C. 已记录模型中已知的字段偏离 / 冗余点（详见《项目优化方案-20260714.md》第 3 章）

| 模型 | 问题 |
|---|---|
| `Order` | `storeId` ref `Store`（**模型不存在，悬空**）；`activityId`/`orderDate`/`products`/`totalAmount`/`commissionRate` 等"兼容字段"导入流程不写入 |
| `ReportOrder` | 与 `Order` 字段大面积重复（Excel 导入字段/6 佣金率/7 预计佣金/7 实际佣金/退货退款/打款字段），需明确职责边界 |
| `SampleManagement` | 三组兼容旧字段并存：`isSampleSent`(Boolean) vs `sampleStatus`；`influencerAccount`(String) vs `influencerId`；`salesman`(String) vs `salesmanId` |
| `Influencer` | `latestFollowers`/`latestGmv`/`latestMaintainerName` 等为反范式快照，与 `InfluencerMaintenance` 冗余（有意缓存） |
| `Commission` | `sampleRequestId` ref `SampleRequest`（**模型不存在**，应为 `SampleManagement`） |
| `Shop` | 新增 `products:[String]` 与 `Product.shopId` 构成双向冗余 |
| `Activity` | `sampleMethod` 枚举 `['线上','线下','']` 与 `Product.activityConfigs[].sampleMethod` 的 `online/offline` 不一致 |
| `TempIdMapping` | 仅 Excel 导入临时用，导入后应清理 / 加 TTL |

### D. 索引一致性
- 所有表均按 `companyId` 建索引（一致，保留）。
- `ReportOrder` 唯一索引 `{orderNo, subOrderNo, companyId}`；`Order` 无唯一约束（合并前需先解决去重语义）。
- `SampleManagement` 唯一索引 `{companyId, date, influencerId, productId}`；`isSampleSent` 索引应随字段废弃移除。

