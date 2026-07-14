# LazyFirst - TikTok 达人管理与分润平台

一个多租户 SaaS 系统，用于管理 TikTok 达人（CRM）、样品申请、订单报表、分润计算、BD 日报、AI 工具箱（数字人/提示词/视频生成）以及 Chrome 插件数据采集。

> 项目原名 `tap-system`（package.json 中 `name` 仍为 `tap-system`），对外品牌名为 **LazyFirst**。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js + Express 4 + Mongoose 8 + JWT（`jsonwebtoken`） |
| 安全/校验 | `helmet`、`express-rate-limit`、`express-validator` |
| 数据库 | MongoDB（多租户按 `companyId` 隔离），生产用真实 MongoDB |
| 前端 | Vue 3 + Element Plus + Vue Router 4 + Pinia + vue-i18n |
| 插件 | Chrome 扩展（Manifest V3），见 `tiktok-extension/` |
| 部署 | Docker（`docker-compose.yml` / `Dockerfile` / `Dockerfile.frontend`）+ Nginx（`nginx.conf`） |

> ⚠️ 注意：早期文档曾描述使用 `mongodb-memory-server`（内存库），该包仅作为 `devDependencies` 遗留，**生产/常规开发均使用真实 MongoDB**，不存在"重启丢数据"问题。

## 项目结构

```
.
├── server/                     # 后端服务（Express + Mongoose）
│   ├── config/database.js      # 数据库连接
│   ├── middleware/             # auth / errorHandler / notFound / filterByDataScope
│   ├── models/                 # 34 个 Mongoose 模型（见 database-schema.md）
│   ├── routes/                 # 34 个路由文件
│   ├── services/               # 业务服务层（当前仅 volcano-api.js，待扩充）
│   ├── utils/                  # 工具函数
│   └── server.js               # 服务入口
├── frontend/                   # 前端应用（Vue 3 + Vite）
│   └── src/
│       ├── views/              # 页面（约 46 个 .vue）
│       ├── components/         # 公共组件
│       ├── stores/             # Pinia stores
│       ├── i18n/               # zh.js / en.js 国际化
│       └── router/             # 路由
├── tiktok-extension/           # Chrome 插件子项目（Manifest V3）
├── _legacy/                    # 历史遗留产物归档（不提交 git，仅供追溯）
├── m-memory/                   # 操作记忆（本地规则/服务器/暗号等）
├── database-schema.md          # 数据库模型文档（34 个模型）
├── ARCHITECTURE.md             # 系统架构说明
├── RULES.md                    # 第一顺位操作规则（开工前必读）
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd server && npm install

# 前端
cd frontend && npm install
```

### 2. 配置环境变量

在 `server/` 下创建 `.env`（参考 `m-memory/m-intimacy.md` 与 `m-local.md`）：

```env
NODE_ENV=development
PORT=3000                      # 后端端口（实际以 .env 为准）
MONGODB_URI=mongodb://localhost:27017/lazyfirst
JWT_SECRET=your-secret
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

> 前端开发服务器默认端口为 Vite 的 `5173`（可用 `frontend/vite.config.js` 的 `server.port` 覆盖）。前后端端口以本地 `.env` / 配置文件为准，避免文档与运行环境不符。

### 3. 本地启动

```bash
# 后端（nodemon 热重载）
cd server && npm run dev

# 前端（另开终端）
cd frontend && npm run dev
```

健康检查：`GET /health` → `{ status: 'ok' }`；API 基址：`/api`。

### 4. 生产构建与部署

```bash
# 前端构建
cd frontend && npm run build     # 产物 frontend/dist/

# Docker 部署（见 docker-compose.yml）
docker compose up -d --build
```

> ⚠️ 生产 `docker-compose.yml` **禁止**以 `volumes: - ./server:/app/server` 方式挂载代码目录（会覆盖容器内 node_modules 导致 502）。代码应通过 Dockerfile `COPY` + `npm install` 打包进镜像。

## 主要 API 模块（`/api` 前缀）

| 模块 | 路由前缀 | 说明 |
|---|---|---|
| 认证 | `/api/auth` | 登录/注册/当前用户 |
| 用户/角色/部门 | `/api/users` `/api/roles` `/api/departments` | RBAC |
| 达人管理 | `/api/influencer-managements` | 达人 CRM 主模块 |
| 商品/店铺/活动 | `/api/products` `/api/shops` `/api/activities` | 商品与活动配置 |
| 订单/报表订单 | `/api/orders` `/api/report-orders` | 订单原始表 + 报表去重表 |
| 样品 | `/api/samples` `/api/public/samples` | 寄样管理（含公开页） |
| 分润/分润规则 | `/api/commissions` `/api/commission-rules` | 分润计算 |
| BD 日报 | `/api/bd-daily` | BD 日报统计 |
| 统计看板 | `/api/dashboard` `/api/product-stats` | 概览聚合 |
| 招募 | `/api/recruitments` `/api/public/recruitment` | 达人招募 |
| 视频/插件数据 | `/api/videos` `/api/tiktok-extension-data` | 视频登记 + 插件采集 |
| AI 工具箱 | `/api/ai-models` `/api/digital-humans` `/api/ai-maker` `/api/system-models` | 数字人/提示词/视频生成 |
| 供应商 | `/api/suppliers` | 供应商管理 |
| 初始化/导入 | `/api/initialization` `/api/init-import` | 样品导入与系统初始化 |

完整模型与字段见 [database-schema.md](database-schema.md)；系统架构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 核心功能

- **多租户隔离**：所有数据按 `companyId` 隔离，API 自动注入租户过滤。
- **达人 CRM**：公海/私海池、流动规则、维护记录、视频打分、达人画像。
- **样品与订单**：样品申请→寄样→订单关联→报表去重→分润计算闭环。
- **BD 工具箱**：BD 日报、数字人、提示词模板、AI 生成。
- **Chrome 插件**：TikTok 页面采集达人/视频指标，写入 `tiktok_extension_data`。

## 开发规范

- 风格：ES6+ / async-await / 统一错误处理 / RESTful。
- 模型统一从 `server/models/index.js` 导出，路由集中引入。
- 提交规范：`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`。
- 开工前必读 `RULES.md`；连线上操作需主人授权。

## 文档索引

- `RULES.md`：第一顺位操作规则
- `database-schema.md`：数据库全部 34 个模型
- `ARCHITECTURE.md`：系统架构与数据流
- `DEPLOYMENT.md` / `QUICK_START.md` / `TROUBLESHOOTING.md`：部署与排障
- `_legacy/`：历史遗留产物（已归档，不参与构建）
