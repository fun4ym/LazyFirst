# SampleManagement 数据模型重构方案

## 一、重构目标

将 `SampleManagement` 中的冗余字段移除，改为通过 MongoDB `populate` 关联查询获取数据。新建 `Video` 表实现 1个Sample对多个Video的一对多关系。

## 二、用户确认的决策

- **Video表**: 方案B — 1个Sample对应多个Video（一对多）
- **冗余字段策略**: 完全删除，全靠populate关联查询
- **重构范围**: 全面重构，一步到位（数据模型 + API + 所有前端页面）

---

## 三、新数据模型设计

### 3.1 新建 Video 模型 (`server/models/Video.js`)

```
Video {
  companyId:           ObjectId, ref 'Company', required
  sampleId:            ObjectId, ref 'SampleManagement', required    // 所属样品记录
  productId:           ObjectId, ref 'Product'                      // 关联商品（冗余，方便直接查）
  influencerId:        ObjectId, ref 'Influencer'                   // 关联达人（冗余，方便直接查）
  videoLink:           String                                       // 达人视频链接
  videoStreamCode:     String                                       // 视频推流码
  isAdPromotion:       Boolean, default false                       // 是否投流
  adPromotionTime:     Date                                         // 投流时间
  // 维护信息
  createdBy:           ObjectId, ref 'User'                         // 创建人（登记人）
  createdAt:           Date                                         // 登记时间
  updatedBy:           ObjectId, ref 'User'                         // 最后修改人
  updatedAt:           Date                                         // 最后修改时间
}
```

**索引**:
- `{ sampleId: 1 }` — 查询某个样品的所有视频
- `{ companyId: 1, sampleId: 1 }` — 带公司隔离

### 3.2 重构后的 SampleManagement 模型

#### 删除的字段 (9个) → 改为关联或移到Video表

| 原字段 | 类型 | 去向 |
|--------|------|------|
| `productName` | String | **删除** → `populate('productId')` 取 `product.name` |
| `productId`(String/TikTok ID) | String | **改为** `productId: ObjectId, ref 'Product'` |
| `influencerAccount` | String | **改为** `influencerId: ObjectId, ref 'Influencer'` |
| `followerCount` | Number | **删除** → `populate('influencerId')` 取 `influencer.latestFollowers` |
| `monthlySalesCount` | Number | **删除** → `populate('influencerId')` 取 `influencer.monthlySalesCount` |
| `avgVideoViews` | Number | **删除** → `populate('influencerId')` 取 `influencer.avgVideoViews` |
| `salesman`(String/ObjectId混合) | String | **改为** `salesmanId: ObjectId, ref 'User'` |
| `sampleImage` | String | **删除** → `populate('productId')` 取 `product.images[0]` |
| `videoLink` | String | **移到** Video 表 |
| `videoStreamCode` | String | **移到** Video 表 |

#### 保留的核心字段

```
SampleManagement (重构后) {
  companyId:              ObjectId, ref 'Company', required
  date:                   Date, required                           // 申请日期
  productId:              ObjectId, ref 'Product', required         // ★ 改为ObjectId引用
  influencerId:           ObjectId, ref 'Influencer', required      // ★ 新增，替换influencerAccount
  salesmanId:             ObjectId, ref 'User'                     // ★ 替换salesman
  shippingInfo:           String                                   // 收货信息
  sampleStatus:           String enum: pending/shipping/sent/refused
  refusalReason:          String
  sampleStatusUpdatedBy:  ObjectId ref User
  sampleStatusUpdatedAt:  Date
  trackingNumber:         String
  shippingDate:           Date
  logisticsCompany:       String
  receivedDate:           Date
  fulfillmentTime:        String
  isAdPromotion:          Boolean (保留作为快捷标记)
  adPromotionTime:        Date
  isOrderGenerated:       Boolean
  fulfillmentUpdatedBy:   ObjectId ref User
  fulfillmentUpdatedAt:   Date
  adPromotionUpdatedBy:   ObjectId ref User
  adPromotionUpdatedAt:   Date
  duplicateCount:         Number
  previousSubmissions:    Array
  creatorId:              ObjectId ref User
  timestamps:             auto
}
```

#### 索引变更
- **旧**: `{ companyId: 1, date: 1, influencerAccount: 1, productId: 1 }` (unique)
- **新**: `{ companyId: 1, date: 1, influencerId: 1, productId: 1 }` (unique)

---

## 四、新增"视频登记"管理页面

### 4.0 需求概述

在 **BD工作台** 下新增二级菜单 **"视频登记"**，作为 Video 表的独立管理界面。

### 4.0.1 页面定位与菜单结构

```
BD工作台 (el-sub-menu: bd-workspace)
  ├── 达人列表        → /influencer-managements
  ├── ★ 视频登记(新)   → /videos            ← 新增
  └── 样品申请(BD)    → /samples-bd
```

在 `MainLayout.vue` 的 BD工作台子菜单中，**在"达人列表"和"样品申请(BD)"之间**插入新菜单项：
```html
<el-menu-item v-if="menuPermissions.videoRegister()" index="/videos">
  <span>{{ $t('menu.videoRegister') }}</span>
</el-menu-item>
```

### 4.0.2 页面功能设计

#### 列表展示

表格列定义（从左到右）：

| 列名 | 字段来源 | 说明 |
|------|---------|------|
| 登记人 | `video.createdBy.realName` | 哪个BD登记的 |
| 达人账号 | `video.influencerId.tiktokId` | 哪个达人 |
| 达人昵称 | `video.influencerId.tiktokName` | 辅助显示 |
| 商品名称 | `video.productId.name` | 展示了哪个商品 |
| 商品ID | `video.productId.tiktokProductId` | TikTok商品ID |
| 视频链接 | `video.videoLink` | 可点击跳转 |
| 推流码 | `video.videoStreamCode` | 投流推流码 |
| 投流状态 | `video.isAdPromotion` | tag展示 |
| 申样日期 | `video.sampleId.date` | 哪个申样记录产生的 |
| 登记时间 | `video.createdAt` | 什么时候登记的 |
| 操作 | - | 编辑/删除 |

#### 筛选条件（顶部搜索栏）

- **时间范围**: 登记时间区间筛选
- **登记人**: 下拉选择（按当前公司用户列表）
- **达人账号**: 模糊搜索
- **商品**: 搜索选择器（模糊搜商品名/TikTok ID）
- **投流状态**: 全部/已投流/未投流
- **是否出单**: 关联 sample 的 isOrderGenerated

#### 操作功能

| 功能 | 说明 |
|------|------|
| 新增视频登记 | 弹窗表单：选择申样记录 → 填写视频链接/推流码/投流状态 |
| 编辑 | 修改 videoLink/videoStreamCode/isAdPromotion/adPromotionTime |
| 删除 | 确认后删除该条视频记录（仅删video，不影响sample） |
| 批量操作 | （可选）批量标记投流状态 |

#### 新增视频弹窗表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 申样记录 | el-select(远程搜索) | 是 | 搜索样品记录(显示：日期+达人+商品) |
| 视频链接 | el-input | 否 | TikTok视频URL |
| 视频推流码 | el-input | 否 | 广告推流码 |
| 是否投流 | el-switch | 否 | 默认false |
| 投流时间 | el-date-picker | 条件必填 | 投流时必填 |

### 4.0.3 涉及文件变更

| 文件 | 变更内容 |
|------|---------|
| `frontend/src/router/index.js` | 新增路由 `{ path: 'videos', name: 'Videos', component: VideoManagement }` |
| `frontend/src/layouts/MainLayout.vue` | BD工作台下插入"视频登记"菜单项 + `menuPermissions.videoRegister()` |
| `frontend/src/constants/permissions.js` | 新增 `VIDEOS: { code: 'videos', name: '视频登记', parent: 'bdWorkspace' }` |
| `frontend/src/views/samples/VideoManagement.vue` | **新建** — 视频登记页面组件 |
| `frontend/src/i18n/zh.js` | 新增 `menu.videoRegister: '视频登记'` + 页面相关翻译 |
| `frontend/src/i18n/en.js` | 新增英文翻译 |
| `server/routes/videos.js` | **新建** — Video CRUD API 路由 |

### 4.0.4 后端 API 设计 (`server/routes/videos.js`)

```
GET    /api/videos              列表查询（支持分页+筛选+populate关联）
POST   /api/videos              新建视频登记
GET    /api/videos/:id          单条详情
PUT    /api/videos/:id          更新视频信息
DELETE /api/videos/:id          删除视频记录
```

**GET /api/videos 详细参数**:

```javascript
query: {
  page, limit,                          // 分页
  dateStart, dateEnd,                   // 登记时间区间
  createdBy,                            // 登记人ID筛选
  influencerAccount,                    // 达人账号模糊搜索（需查Influencer→_id→influencerId）
  productName / productId,              // 商品名/ID模糊搜索（需查Product→_id→productId）
  isAdPromotion,                        // 投流状态筛选
  isOrderGenerated,                     // 是否出单（需通过sampleId关联查）
}
```

返回数据 populate:
```
.populate('sampleId', 'date isOrderGenerated')
.populate('productId', 'name tiktokProductId images')
.populate('influencerId', 'tiktokId tiktokName latestFollowers')
.populate('createdBy', 'realName username')
.populate('updatedBy', 'realName username')
```

### 4.0.5 权限配置

```javascript
// constants/permissions.js 新增
VIDEOS: { code: 'videos', name: '视频登记', parent: 'bdWorkspace' },

// PERMISSION_MAP 新增
'/videos': [makePermission('videos', 'read'), makePermission('videos', 'create'), makePermission('videos', 'update'), makePermission('videos', 'delete')],

// MODULE_DATA_SCOPE 新增
videos: { ownerField: 'createdBy', label: '视频登记' },

// MainLayout.vue menuPermissions 新增
videoRegister: () => hasAnyPermission(['videos:read', 'videos:create', 'videos:update', 'videos:delete']),
bdWorkspace: () => hasAnyPermission([...原有权限, 'videos:read', 'videos:create']), // 追加videos权限
```

---

## 五、API 路由改动详细方案

### 4.1 GET /api/samples (列表查询)

**当前问题**: 大量手动关联查询（查Product补shopName、查Influencer检查黑名单、查User转salesman名字）

**重构后**:
```javascript
// populate所有关联
const samples = await SampleManagement.find(query)
  .populate('productId', 'name tiktokProductId images productImages shopId')
  .populate('influencerId', 'tiktokId tiktokName latestFollowers monthlySalesCount avgVideoViews latestGmv isBlacklisted blacklistedAt blacklistReason poolType status')
  .populate('salesmanId', 'realName username')
  .populate('creatorId', 'realName')
  .populate('fulfillmentUpdatedBy', 'realName')
  .populate('adPromotionUpdatedBy', 'realName')
  .populate('sampleStatusUpdatedBy', 'realName')
  .limit(parseInt(limit))
  .skip(...)
  .sort({ date: -1 });

// 二次查询：每个sample的videos + shopName
const sampleIds = samples.map(s => s._id);
const videos = await Video.find({ sampleId: { $in: sampleIds } }).sort({ createdAt: -1 });
// 按sampleId分组
const videoMap = _.groupBy(videos, v => v.sampleId.toString());

// 查shopName
const shopIds = [...new Set(samples.map(s => s.productId?.shopId).filter(Boolean))];
const shops = await Shop.find({ _id: { $in: shopIds } }).select('_id shopName');
const shopMap = keyBy(shops, '_id');

// 组装返回数据
const samplesData = samples.map(sample => {
  const obj = sample.toObject();
  return {
    ...obj,
    // 兼容前端字段名（逐步过渡可后续清理）
    productName: obj.productId?.name,
    productId_display: obj.productId?.tiktokProductId,  // TikTok商品ID用于展示
    influencerAccount: obj.influencerId?.tiktokId,
    followerCount: obj.influencerId?.latestFollowers,
    monthlySalesCount: obj.influencerId?.monthlySalesCount,
    avgVideoViews: obj.influencerId?.avgVideoViews,
    sampleImage: obj.productId?.images?.[0] || obj.productId?.productImages?.[0],
    salesman: obj.salesmanId?.realName || obj.salesmanId?.username,
    shopName: shopMap[obj.productId?.shopId]?.shopName,
    // Video信息（数组）
    videos: videoMap[obj._id.toString()] || [],
    // 取最新一条video的信息做快捷展示
    videoLink: videoMap[obj._id.toString()]?.[0]?.videoLink || '',
    videoStreamCode: videoMap[obj._id.toString()]?.[0]?.videoStreamCode || '',
    isAdPromotion: videoMap[obj._id.toString()]?.some(v => v.isAdPromotion) || obj.isAdPromotion,
    // 黑名单信息从influencer直接获取
    isBlacklistedInfluencer: obj.influencerId?.isBlacklisted || false,
  };
});
```

**搜索参数适配**:
| 原参数 | 重构后处理 |
|--------|-----------|
| `productName` | 先查Product `{ name: regex }` → 取 `_id` → `{ productId: { $in: ids } }` |
| `influencerAccount` | 先查Influencer `{ tiktokId: regex }` → 取 `_id` → `{ influencerId: { $in: ids } }` |
| `productId`(TikTok ID模糊) | 先查Product `{ tiktokProductId: regex }` → `{ productId: { $in: ids } }` |
| `salesman` / `salesmanId` | 改为 `{ salesmanId: ... }` 直接匹配ObjectId或查User |
| `shopId` | `{ productId: { $in: 该shop下products的_ids } }` |

### 4.2 POST /api/samples (创建)

**前端传入变化**:
```javascript
// 旧传参
{ date, productId, productName, influencerAccount, followerCount, ... }

// 新传参
{
  date,                    // 申请日期
  productId,               // Product的MongoDB ObjectId
  influencerId,            // Influencer的MongoDB ObjectId（★新增）
  salesmanId,              // User的MongoDB ObjectId（★改）
  shippingInfo,
  sampleStatus,
  isOrderGenerated,
  // 不再传: productName, followerCount, monthlySalesCount, avgVideoViews, videoLink, videoStreamCode, sampleImage, influencerAccount
}
```

**后端处理**:
1. 验证 `productId` 存在且属于该公司
2. 验证 `influencerId` 存在且属于该公司
3. 验证 `salesmanId` 存在（如果传了的话）
4. 去重检查：`{ companyId, date, influencerId, productId }`
5. 创建 SampleManagement 记录（不含冗余字段）
6. 如果前端同时传了 video 信息，创建 Video 记录

### 4.3 PUT /api/samples/:id (更新)

**拆分为两类操作**:

| 操作类型 | 目标表 | 路由 |
|---------|--------|------|
| 寄样状态更新 | SampleManagement | `PUT /api/samples/:id` (不变) |
| 履约/投流信息更新 | **Video表** | `POST /api/samples/:id/videos` (新建) 或 `PUT /api/videos/:videoId` |
| 基础信息修改 | SampleManagement | `PUT /api/samples/:id` (date/salesmanId/shippingInfo等) |

**新增路由**:
```
POST   /api/samples/:id/videos     — 为样品添加视频记录
GET    /api/samples/:id/videos     — 获取样品的所有视频
PUT    /api/videos/:videoId        — 更新视频信息(link/streamCode/adPromotion)
DELETE /api/videos/:videoId        — 删除视频记录
```

### 4.4 DELETE /api/samples/:id (删除)

增加级联删除：同时删除 Video 表中 `sampleId` 对应的所有记录。

### 4.5 POST /api/samples/import (Excel导入)

**导入逻辑调整**:
1. 解析Excel行：日期、商品名称/ID、达人账号、归属业务员、收货信息等
2. **商品匹配**（保留现有逻辑）：按 _id/tiktokProductId/sku/name 查 Product → 得到 `product._id`
3. **达人匹配**（新增）：按达人账号查 Influencer 表 → 得到 `influencer._id`；若未找到则跳过或报错
4. **业务员匹配**（优化）：按用户名/姓名查 User → 得到 `user._id`
5. 构建 sampleData：`{ companyId, date, productId: product._id, influencerId: influencer._id, salesmanId: user._id, ... }`
6. **视频信息处理**：如果Excel中有视频链接/推流码列，创建对应的 Video 记录

**注意**: 导入时需要决定达人匹配不到时的策略：
- **选项A**: 严格模式 — 达人必须存在于Influencer表，否则该行导入失败
- **选项B**: 宽松模式 — 达人不存在时允许导入但标记警告（此时influencerId为空？不行，是required）→ 所以只能选A

### 4.6 public-samples.js (公开接口)

同样需要适配新的数据模型：
- `productId` 从 TikTok ID字符串变为 ObjectId
- 返回数据中补充 populate 后的 `productName`、`influencerAccount`、`followerCount` 等兼容字段
- Video 信息从 Video 表查询

---

## 五、前端页面改动方案

### 5.1 核心原则：渐进式字段映射

为了减少前端改动量，后端返回数据时会带上**兼容字段**（如 `productName`, `influencerAccount`, `followerCount` 等），这些字段是从 populate 结果中提取的。前端可以分阶段迁移：

**第一阶段（本次）**：后端返回兼容字段，前端基本不用大改，只需：
1. 创建表单：将 `influencerAccount` 输入框改为 Influencer 选择器（或保持输入但传tiktokId让后端匹配）
2. 创建表单：移除 `followerCount/monthlySalesCount/avgVideoViews` 的输入（因为现在从Influencer获取）
3. 履约/投流弹窗：改为操作 Video 记录（可能需要新的交互方式）
4. 表格中的视频列：支持显示多条视频

**第二阶段（未来）**：前端直接使用 `product.name`、`influencer.tiktokId` 等嵌套字段，移除对兼容字段的依赖

### 5.2 Management.vue 改动清单

**表格列适配**（字段名大部分不变，因为后端会返回兼容字段）：
| 列 | 当前字段 | 改动 |
|----|---------|------|
| 达人账号 | `row.influencerAccount` | 无改（后端兼容） |
| 商品信息 | `row.productId` / `row.productName` | 无改（后端兼容） |
| 达人数据 | `row.followerCount` / `row.monthlySalesCount` / `row.avgVideoViews` | 无改（后端兼容） |
| BD | `row.salesman` | 无改（后端兼容） |
| 履约情况 | `row.videoLink` / `row.isOrderGenerated` | **需改**: videoLink可能有多条 |
| 投流信息 | `row.videoStreamCode` / `row.isAdPromotion` | **需改**: 可能有多条video |

**创建表单改动**：
- ~~productName输入~~ → 移除（选择Product后自动获取）
- ~~followerCount / monthlySalesCount / avgVideoViews输入~~ → 移除（从Influencer获取）
- ~~sampleImage输入~~ → 移除（从Product获取）
- **influencerAccount** → 保持输入框（或改为搜索选择器），后端根据tiktokId匹配Influencer得到ObjectId
- **salesman** → 保持用户选择器（已经传的是username/realName，需改为传userId）

**编辑弹窗改动**：
- 履约信息弹窗：从"填写videoLink"变为"添加/管理视频"
- 投流信息弹窗：同上，针对具体video操作

### 5.3 ManagementBDSelf.vue 改动

与 Management.vue 类似，但更简化（BD视角）。同样的字段适配。

### 5.4 PublicCollection.vue 改动

公开收集页面的表格列也需要适配后端返回的新结构。

### 5.5 mobile/Samples.vue 改动

移动端页面的字段引用同步更新。

---

## 六、数据迁移脚本

### 6.1 迁移内容

需要一个一次性迁移脚本 `server/migrate_sample_refactor.js`：

```
步骤1: 迁移 productId（String→ObjectId）
  └─ 对每条sample: 用 sample.productId(TikTok ID字符串) 查 Product 表
      → 找到 product._id → 更新 sample.productId = product._id
      → 如果找不到，尝试 fuzzy match（按name/sku）

步骤2: 迁移 influencerAccount → influencerId
  └─ 对每条sample: 用 sample.influencerAccount 查 Influencer 表(tiktokId)
      → 找到 influencer._id → 设置 sample.influencerId = influencer._id
      → 找不到的记录日志报警，人工处理

步骤3: 迁移 salesman → salesmanId
  └─ 对每条sample: 
      → 如果 salesmen 是24位hex字符串(ObjectId格式): 查 User 表验证
      → 如果是字符串(用户名): 查 User 表 { username: salesman } → 取 _id
      → 设置 sample.salesmanId = user._id

步骤4: 迁移 videoLink/videoStreamCode → Video 表
  └─ 对每条有 videoLink 或 videoStreamCode 的sample:
      → 创建 Video 记录 { sampleId, videoLink, videoStreamCode, isAdPromotion, adPromotionTime, ... }

步骤5: 移除废弃字段
  └─ $unset: productName, influencerAccount, followerCount, monthlySalesCount, avgVideoViews, salesman, sampleImage, videoLink, videoStreamCode

步骤6: 重建唯一索引
  └─ drop old index → create new index on {companyId, date, influencerId, productId}
```

### 6.2 回滚方案

迁移前自动备份 `sample_managements` collection（mongodump），出问题时可以恢复。

---

## 七、影响范围分析

### 7.1 orders 相关路由

| 文件 | 影响点 | 改动方式 |
|------|--------|---------|
| `server/routes/report-orders.js` | 按 `influenceAccount + productId` 筛选订单的BD匹配统计 | 改为用 `populate` 后的值或在aggregate中 `$lookup` |
| `server/routes/bd-daily.js` | BD日报中可能的sample相关统计 | 同上，适配新字段 |

### 7.2 其他潜在影响点

- `server/routes/initialization.js`: 导入样品时 productId 处理逻辑
- `server/models/index.js`: 如果有 model 注册表需要加入 Video
- 前端 i18n 文件: 可能需要新增Video相关的翻译key
- 前端路由配置: 可能需要新增 Video 管理相关路由

---

## 八、实施步骤顺序

```
Step 1: 新建 Video 模型
  ├── 创建 server/models/Video.js（含字段定义+索引）
  └── 在 server/models/index.js 中注册

Step 2: 重构 SampleManagement 模型
  ├── 修改字段定义（删9个冗余字段，改3个字段为ref，加influencerId）
  ├── 更新唯一索引 {companyId, date, influencerId, productId}
  └── 确保 mongoose 注册正确

Step 3: 新增 Video CRUD API 路由
  ├── 创建 server/routes/videos.js（GET/POST/PUT/DELETE）
  └── 在 server/app.js 中挂载 /api/videos 路由

Step 4: 更新 SampleManagement API 路由
  ├── samples.js: GET列表(populate+兼容字段)、POST创建(改传参)、PUT更新、
  │             DELETE级联删除Video、IMPORT导入(匹配Influencer)
  ├── public-samples.js: 适配新数据模型和populate
  └── 新增子路由: POST/GET /api/samples/:id/videos (样品下视频管理)

Step 5: 编写数据迁移脚本
  └── server/migrate_sample_refactor.js (6步迁移)

Step 6: 新建"视频登记"前端页面
  ├── 创建 frontend/src/views/samples/VideoManagement.vue
  │   ├── 列表：登记人+达人+商品+视频链接+推流码+投流状态+申样日期+操作
  │   ├── 筛选：时间区间/登记人/达人账号/商品/投流状态
  │   └── 新增/编辑弹窗：选择申样记录→填写视频信息
  ├── router/index.js: 注册 /videos 路由
  ├── MainLayout.vue: BD工作台插入菜单项 + menuPermissions.videoRegister()
  ├── constants/permissions.js: VIDEOS模块 + PERMISSION_MAP + MODULE_DATA_SCOPE
  └── i18n/zh.js + en.js: menu.videoRegister 等翻译key

Step 7: 更新现有前端页面
  ├── Management.vue: 表格列适配兼容字段 + 履约/投流弹窗改为Video操作
  ├── ManagementBDSelf.vue: 同上
  ├── PublicCollection.vue: 同上
  └── mobile/Samples.vue: 同步更新

Step 8: 测试 & 部署
  ├── 本地测试所有功能（含视频登记CRUD）
  ├── 运行数据迁移脚本
  └── 部署到服务器
```

---

## 九、关键文件清单

### 新建文件 (4个)
1. `server/models/Video.js` — Video数据模型
2. `server/routes/videos.js` — 视频登记CRUD API路由
3. `server/migrate_sample_refactor.js` — 数据迁移脚本
4. `frontend/src/views/samples/VideoManagement.vue` — **视频登记管理页面（新建）**

### 修改文件 (13个)
1. `server/models/SampleManagement.js` — 字段重构
2. `server/models/index.js` — 注册Video模型
3. `server/app.js`(或入口文件) — 挂载videos路由
4. `server/routes/samples.js` — 主API重构 + 级联删除Video
5. `server/routes/public-samples.js` — 公开API适配
6. `frontend/src/router/index.js` — 新增 /videos 路由
7. `frontend/src/layouts/MainLayout.vue` — BD工作台插入"视频登记"菜单
8. `frontend/src/constants/permissions.js` — 新增 VIDEOS 模块+权限映射
9. `frontend/src/views/samples/Management.vue` — 管理员页面适配
10. `frontend/src/views/samples/ManagementBDSelf.vue` — BD页面适配
11. `frontend/src/views/samples/PublicCollection.vue` — 公开收集页适配
12. `frontend/src/views/mobile/Samples.vue` — 移动端页面适配
13. `frontend/src/i18n/zh.js` — 中文翻译（menu.videoRegister + Video相关key）
14. `frontend/src/i18n/en.js` — 英文翻译

### 可能影响的文件 (2个)
15. `server/routes/report-orders.js` — BD匹配统计适配
16. `server/routes/bd-daily.js` — 日报统计适配
