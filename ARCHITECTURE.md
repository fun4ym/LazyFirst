# LazyFirst 系统架构说明

> 文档生成：2026-07-14，依据 `server/server.js`、`frontend/src/router/index.js`、`server/models/` 实际勘察。
> 配套文档：`README.md`（上手）、`database-schema.md`（34 个模型）。

## 1. 总体分层

```
┌─────────────────────────────────────────────────────────────┐
│ 浏览器 / Chrome 插件 (tiktok-extension, MV3)                  │
└───────────────┬───────────────────────────┬──────────────────┘
                │  HTTPS /api                │  采集数据 POST
                ▼                             ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ frontend (Vue3+Vite)     │      │ server (Express)          │
│  views/components/stores │      │  routes → (service层待补) │
│  router / i18n / pinia   │      │  models (Mongoose 34)     │
└───────────┬──────────────┘      └────────────┬─────────────┘
            │  axios /api (proxy)               │  Mongoose ODM
            ▼                                    ▼
      Nginx (反向代理)                  MongoDB (多租户 companyId)
```

## 2. 多租户隔离

- **隔离维度**：所有业务集合均以 `companyId` (ObjectId → Company) 为租户键。
- **强制过滤**：`middleware/auth.js` 的 `filterByDataScope` 在查询时注入 `companyId`；路由不应绕过该过滤直接查全表。
- **索引约定**：每个集合均建立 `{ companyId: 1, ... }` 复合索引（详见 `database-schema.md` 附录 D）。
- **跨租户风险点**：`TempIdMapping`、`tiktok_extension_data` 同样带 `companyId`，迁移/同步脚本须显式携带。

## 3. 后端结构

### 3.1 入口与挂载
- 入口 `server/server.js`：加载 34 条 `/api/*` 路由；健康检查 `/health`；统一 `notFound` + `errorHandler`。
- 端口：`process.env.PORT || 3000`（实际以 `.env` 为准）。

### 3.2 分层现状
| 层 | 现状 | 优化方向（见优化方案阶段二） |
|---|---|---|
| 路由 `routes/` | 34 文件，部分超大（`report-orders.js` ~1700 行、`samples.js` ~1200 行） | 拆分 + 集中引入模型 |
| 服务 `services/` | 仅 `volcano-api.js`（第三方封装） | BD 匹配 / Excel 导入 / 聚合计算下沉 |
| 模型 `models/` | 34 文件，`index.js` 仅导出 17 个 | 统一导出全部 34 |
| 中间件 `middleware/` | auth / errorHandler / notFound / 数据权限 | 复用 `filterByDataScope` |

### 3.3 错误处理
当前路由内 `try/catch` 泛滥（report-orders 17 处、samples 16 处、init-import 14 处）。规划改为 Express 异步错误传播（`async handler` + `next(err)`），由 `errorHandler` 统一兜底。

## 4. 前端结构

### 4.1 路由分区
- **公开页**（无登录）：`/login`、`/terms`、`/privacy`、`/samples/public`、`/recruitments/public`、`/products/public`。
- **主布局**（登录后）：`/dashboard` 概览、达人(`influencer-managements`)、商品/店铺(`products`/`shops` 共用 `products/Index.vue`)、活动、样品/视频/BD样品、订单(`report-orders`)、供应链、分润、业绩、BD 仪表盘/日报、招募、AI 工具箱、设置。
- **移动端**：`/mobile`（influencers/samples/profile）。
- **权限**：`meta.permission`（如 `recruitments:read`）由前端守卫 + 后端双重校验。

### 4.2 命名混淆点（待优化方案阶段四厘清）
- `influencer-managements/`（达人 CRM 主模块）vs `influencer/`（仅 `AiMaker`、`PointsBalance` 子页）——命名空间易混。
- `bd/`（数字人/提示词/插件页）vs `bd-daily/`（BD 日报）——前者=BD 工具箱，后者=日报统计。
- `products/Index.vue` 同时承载 `products` 与 `shops` 路由（靠 `activeTab` 分流）。

#### 4.2.1 目录职责对照与厘清结论（2026-07-14 执行）
经实际勘察（`router/index.js` 与各目录文件），命名混淆**多为"表象混淆、实质分组合理"**。本次阶段四采用**文档化厘清**（非重命名，避免 import 级联回归）：

| 目录 | 实际文件 | 职责 | 易混对象 | 厘清结论 |
|---|---|---|---|---|
| `views/influencer-managements/` | `Index.vue` | 达人 CRM 主模块（达人池列表/详情/维护） | `influencer/` | 保留。建议未来更名 `influencer-pool/`（需同步改 router，专项） |
| `views/influencer/` | `AiMaker.vue`、`PointsBalance.vue` | 达人侧 AI 工具（AI 视频生成、点数余额） | `influencer-managements/` | 保留。属"达人工具箱"，与 CRM 主模块职责不同 |
| `views/bd/` | `DigitalHumanManagement.vue`、`PromptTemplateManagement.vue`、`ChromeExtension.vue` | BD 工具箱（数字人/提示词模板/插件页） | `bd-daily/` | 保留。建议未来更名 `bd-toolbox/` 以表意 |
| `views/bd-daily/` | `Index.vue` | BD 每日统计报表 | `bd/` | 保留。与 BD 工具箱职责不同 |
| `views/BDDashboard.vue`（根） | — | BD 仪表盘 | `bd-daily/` | 保留。路径分散但语义清晰 |
| `views/mobile/` | `Index/Influencers/Samples/Profile.vue` | 移动端 H5（路由 `/mobile`） | — | **保留且不应删**（移动端入口在用） |

**重命名风险评估**：目录重命名会触发所有 `@/views/xxx` import 与 `router/index.js` 同步修改，回归面大；当前分组语义可接受，故本次仅文档化厘清，重命名留作后续专项（需配构建验证）。

**公共组件抽取（2026-07-14 已落地）**：
- 新增 `utils/sampleStatus.js`：集中样品寄样状态枚举 `['pending','shipping','sent','refused']` 与颜色映射 `getSampleStatusType`，与后端 `SampleManagement.sampleStatus` enum 一致。
- 替换 `samples/Management.vue`、`ManagementBDSelf.vue`、`PublicCollection.vue` 三处本地重复定义，顺带修复 `Management.vue`/`PublicCollection.vue` 缺 `shipping` 状态导致颜色回退 `info` 的 bug。
- `shipping` 文本补全、状态文本统一映射属 i18n 治理（阶段五）。

**样品详情弹层未合并说明**：三处样品详情 `el-dialog`（`Management`/`ManagementBDSelf`/`PublicCollection`）结构相似但**不可简单抽取为单一组件**——i18n 命名空间分裂（`samples.*`/`sampleBD.*`/`samplePublic.*`）、BD 字段来源不同（`salesman` vs `bd`）、`PublicCollection` 还内嵌物流状态编辑表单。强行合并收益低、回归高，留专项。

### 4.3 国际化
- `i18n/zh.js`、`i18n/en.js` 双文件；存在 key 不对齐（en 多出 `influencer.category/avgViews/monthlySales/gmv/...`，zh 缺）。
- 提供校验脚本（见第 6 章 / `scripts/check-i18n-keys.mjs`）。

## 5. Chrome 插件对接

- 插件（`tiktok-extension/`，MV3）在 TikTok 页面抓取达人/视频指标，调用后端 `/api/tiktok-extension-data`。
- **契约修复（2026-07-14 已落地）**：
  - `POST /api/tiktok-extension-data/batch-videos` 已在后端 `routes/tiktok-extension-data.js` 补实现，视频数组暂存对应 `TiktokExtensionData.rawData.videos`（零模型变更），与插件 `SAVE_COLLECTED_VIDEOS` 契约一致。
  - 插件 base URL 统一：`utils/constants.js` 集中 `DEFAULT_API_URL`（修正端口 3001→3000，与 `.env.development`/vite 一致）、`FRONTEND_BASE_URL_DEV`、`PROD_API_FALLBACK`；`popup.html` 注入 `constants.js`，`popup.js` 引用统一常量。background service worker（MV3 单文件）无法注入常量，其生产回退域名维持原状（与 `PROD_API_FALLBACK` 可能存在不一致，生产域名变更需主人确认后统一）。
  - `apiClient` 抽离未做（背景已有 `apiRequest` 封装，属后续专项）。

- **阶段五自动化（2026-07-14 已落地）**：
  - 新增无依赖静态检查脚本 `scripts/check-model-refs.mjs`：检测 schema 悬空 `ref`、路由/服务直接 `require` 模型文件（未走 `models/index`）、函数体内重复 `require`。运行 `node scripts/check-model-refs.mjs`。
  - 复用阶段一已建 `scripts/check-i18n-keys.mjs`：i18n `zh/en` key 结构 diff。运行 `node scripts/check-i18n-keys.mjs`。
  - 后端/前端分别加 `.eslintrc.cjs`（eslint:recommended / vue3-recommended 基线，不强制存量代码清零），`package.json` 加 `lint` 脚本（需先 `npm install -D eslint` 等，未自动安装以免改动 lockfile）。
  - **变更流程约定（防技术债复发）**：模型字段/`ref` 改动、i18n key 增删后，提交前应运行 `check-model-refs.mjs` 与 `check-i18n-keys.mjs`；模型新增/删除需同步更新 `database-schema.md` 与 `models/index.js`。将"模型→schema→引用"一致性检查纳入变更流程。

## 6. 数据流：样品 → 订单 → 分润闭环

```
样品申请(SampleManagement)
   → 寄样(sampleStatus: pending→shipping→sent/refused)
   → 关联订单(ReportOrder / Order, 经 init-import 导入 Excel)
   → BD 匹配(report-orders.js 算法: 视频匹配 / 样品匹配)
   → 分润计算(Commission, 关联 CommissionRule)
   → 账单(Bill) → 结算(settlementStatus)
```

## 6.5 LINE 官方账号集成（供应端 + 达人端双边闭环）

将 LINE OA（LazyFirst @380xfno，泰国未认证账号）与现有系统打通：加好友 → 身份绑定 → 按标签精准推送 → 转化（报名 / 带货）。**核心原则：复用现有库表，零新表；前端能力嵌入现有后台页面，不新建独立 LINE 模块页。**

### 6.5.1 后端模块（`server/line/`）

| 文件 | 职责 |
|---|---|
| `config/line.js` | 读取 LINE 环境变量（Channel Secret/Access Token/Channel ID/LIFF ID/Webhook Base URL/默认公司），导出 `@line/bot-sdk` 客户端单例 |
| `line/client.js` | 封装签名校验、reply/push/multicast/narrowcast、audienceGroup 上传、progress 查询、Rich Menu 增删改查 |
| `line/flex.js` | Flex 构造器：政策卡、产品卡（图+标题+价格+「去带货」URI 按钮）、供应端 Rich Menu（政策/报名/客服） |
| `line/templateService.js` | OA 级模板读写（存 `Company.settings.lineTemplates`），双语默认（th 主 + en 兜底）、`{昵称}` 占位符渲染 |
| `line/webhookHandler.js` | 事件分发：follow 发欢迎语；message/postback 识别绑定码→绑定，或关键词自动回复 |
| `line/bindingService.js` | 方案A 绑定码生成/解析/确认（写 `Influencer/ShopContact.lineUserId`），预留方案B 官方 Account Link |
| `line/audienceService.js` | 按 `companyId + categoryTags/suitableCategories + latestFollowers 区间 + lineUserId 存在 + status` 分群，返回 userId 列表；≥50 时按需建受众组 |
| `line/pushService.js` | `sendCampaign`：取受众→multicast(≤500 分批) 主路径 / narrowcast 兜底；写 `ActivityHistory(line_push)`；回写 `Activity.linePush` |
| `line/quotaService.js` | 基于 `ActivityHistory` 当月 `line_push` 计数估算额度（Free≈300/月），提供绑定数概览与额度告警 |
| `routes/line.js` | `POST /webhook`（免 JWT，签名校验）；其余业务路由（模板/绑定码/受众预览/推送/回查/额度/概览）复用 `authenticate` |

### 6.5.2 关键设计

- **Webhook 免 JWT**：`app.use('/api/line', lineRoutes)` 置于 `authenticate` 中间件之外，路由内用 `validateSignature` 校验 `X-Line-Signature`，拒绝伪造请求。
- **零新表落点**：绑定→`Influencer/ShopContact.lineUserId`；Campaign→`Activity.linePush` 子文档；推送日志→`ActivityHistory(action='line_push')`；模板→`Company.settings.lineTemplates`；报名→复用 `Recruitment` 公开页 `/recruitments/public`；带货→`Product.tiktokProductUrl` 或 `/products/public`。
- **multicast 主 / narrowcast 兜底**：早期受众普遍 < 50 人，直接按标签查 userId 走 multicast（≤500/次分批），规避 narrowcast 50 人门槛与受众组复杂度。
- **多租户贯穿**：所有 LINE 查询强制注入 `companyId`，新增 `{companyId:1, lineUserId:1}` 复合索引。
- **异常不吞**：Webhook/推送/轮询全程 try/catch + 结构化日志，失败记 `ActivityHistory.newData.status='failed'` 并触发额度/失败告警。

### 6.5.3 前端嵌入点（复用现有页面）

| 页面 | 嵌入能力 |
|---|---|
| `influencer-managements/Index.vue` | LINE 状态列 + 「生成绑定码」（`LineBindingDialog`, role=influencer） |
| `products/ShopTab.vue` | 联系人 LINE 状态列 + 绑定码（`LineBindingDialog`, role=shopContact） |
| `activities/Index.vue` | 「LINE 推送」按钮 → `LinePushDialog`（受众条件 + Flex 卡预览 + 人数预估 + 发起） |
| `settings/MessageTemplate.vue` | 新增「LINE 欢迎语/自动回复」tab（双语模板 + 自动回复开关） |
| `Dashboard.vue` | LINE 运营概览卡片（绑定数 / 本月推送 / 额度进度条） |

## 7. 部署

- Docker：`docker-compose.yml` 编排 backend + frontend + Nginx；`Dockerfile` / `Dockerfile.frontend` 构建。
- ⚠️ 生产**禁止** `volumes: - ./server:/app/server`（曾导致 502）。代码经 Dockerfile `COPY` 打包。
- 本地开发：`server` 用 `npm run dev`（nodemon），`frontend` 用 `npm run dev`（vite）。

## 8. 文档地图

| 文档 | 内容 |
|---|---|
| `README.md` | 上手、技术栈、启动、API 模块索引 |
| `database-schema.md` | 34 模型（24 详述 + 10 附录 + 冗余点） |
| `ARCHITECTURE.md` | 本文件：架构、分层、数据流、部署 |
| `RULES.md` | 第一顺位操作规则 |
| `_legacy/` | 历史遗留产物归档 |
| `项目优化方案-20260714.md` | 优化方案与 5 阶段路线图 |
