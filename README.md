# TAP系统 - TikTok达人管理与分润平台

一个多租户SaaS系统，用于管理TikTok达人、样品申请、订单和分润计算。

## 技术栈

- **后端**: Node.js + Express
- **数据库**: MongoDB (Mongoose)
- **认证**: JWT (jsonwebtoken)
- **验证**: express-validator
- **前端**: Vue 3 + Element Plus

## 项目结构

```
.
├── server/                          # 后端服务
│   ├── config/
│   │   └── database.js              # 数据库配置
│   ├── middleware/
│   │   ├── auth.js                  # 认证中间件
│   │   ├── errorHandler.js          # 错误处理
│   │   └── notFound.js              # 404处理
│   ├── models/                      # 数据模型
│   │   ├── User.js                  # 用户
│   │   ├── Company.js               # 公司
│   │   ├── Influencer.js            # 达人
│   │   ├── Product.js               # 商品
│   │   ├── Order.js                 # 订单
│   │   ├── SampleRequest.js         # 样品申请
│   │   ├── SampleManagement.js      # 寄样管理
│   │   └── ReportOrder.js           # 报告订单
│   ├── routes/                      # 路由
│   ├── scripts/                     # 工具脚本
│   │   ├── export-data.js           # 数据导出
│   │   ├── import-data.js           # 数据导入
│   │   ├── backup.sh                # 数据库备份
│   │   └── restore.sh               # 数据库恢复
│   └── server.js                    # 服务器入口
├── frontend/                        # 前端应用
│   └── src/
│       ├── views/                   # 页面
│       ├── components/              # 组件
│       └── utils/                   # 工具函数
├── DATABASE_MIGRATION_PLAN.md       # 数据库迁移规划
├── MONGODB_ATLAS_SETUP.md           # Atlas配置指南
├── SETUP_MONGODB.md                 # MongoDB安装指南
└── README.md                        # 本文件
```

## 数据库配置

### 当前状态
项目默认使用 `mongodb-memory-server`（内存数据库），每次重启数据会丢失。

### 推荐方案
- **开发环境**: 本地 MongoDB
- **生产环境**: MongoDB Atlas（免费版 512MB）

详见 [DATABASE_MIGRATION_PLAN.md](DATABASE_MIGRATION_PLAN.md)

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd frontend
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
NODE_ENV=development
PORT=3000

# MongoDB连接字符串
# 本地开发
MONGODB_URI=mongodb://localhost:27017/tap_system

# 生产环境 (Atlas)
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tap-system?retryWrites=true&w=majority

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
```

### 3. 安装并启动 MongoDB（本地开发）

```bash
# macOS (使用Homebrew)
brew install mongodb-community
brew services start mongodb-community

# 验证安装
mongosh
```

### 4. 启动服务

```bash
# 后端
cd server
npm run dev

# 前端（新终端）
cd frontend
npm run dev
```

访问 http://localhost:5173

## 数据备份与恢复

### 备份数据库
```bash
cd server/scripts
./backup.sh
```

### 恢复数据库
```bash
cd server/scripts
./restore.sh backups/backup_20240104_120000.tar.gz
```

### 导出数据（JSON格式）
```bash
cd server/scripts
node export-data.js
```

### 导入数据
```bash
cd server/scripts
node import-data.js ../backups/data-export-xxx.json
```

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 超级管理员 |

## 生产部署

1. 配置 MongoDB Atlas（详见 [MONGODB_ATLAS_SETUP.md](MONGODB_ATLAS_SETUP.md)）
2. 更新 `.env` 文件中的 `MONGODB_URI`
3. 设置强密码的 `JWT_SECRET`
4. 执行数据迁移（如果需要）
5. 设置定时备份
6. 配置监控告警
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "realName": "张三",
  "phone": "13800138000",
  "companyId": "company_id",
  "roleId": "role_id"
}
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### 获取当前用户
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 达人管理接口

#### 获取达人列表
```http
GET /api/influencers?page=1&limit=10&poolType=private
Authorization: Bearer <token>
```

#### 创建达人
```http
POST /api/influencers
Authorization: Bearer <token>
Content-Type: application/json

{
  "tiktokInfo": {
    "displayName": "达人名称",
    "tiktokId": "tiktok_id"
  },
  "basicInfo": {
    "phone": "13800138000"
  }
}
```

#### 分配达人给BD
```http
POST /api/influencers/:id/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignedTo": "bd_user_id"
}
```

#### 回收达人到公海
```http
POST /api/influencers/:id/reclaim
Authorization: Bearer <token>
```

### 订单管理接口

#### 获取订单列表
```http
GET /api/orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

#### 创建订单
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "influencerId": "influencer_id",
  "productId": "product_id",
  "orderNo": "ORDER001",
  "totalAmount": 1990.00,
  "commissionRate": 0.15
}
```

### 分润管理接口

#### 获取分润记录
```http
GET /api/commissions?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

#### 计算分润
```http
POST /api/commissions/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id"
}
```

## 核心功能

### 1. 多租户隔离
- 所有数据按 `companyId` 隔离
- 用户只能访问自己公司的数据
- API自动添加租户过滤

### 2. 达人CRM管理
- **公海/私海池**: 自动管理达人归属
- **流动规则**: 支持自动回收和手动分配
- **维护记录**: 跟踪数据变动、配合度、询价
- **视频打分**: 综合TikTok数据和销售数据
- **达人画像**: 基于历史和近期数据计算评分

### 3. 分润计算
- 订单完成后自动查找关联样品申请
- 根据达人和订单信息计算分润
- 支持自定义分润比例
- 记录详细的分润历史

### 4. 权限控制
- 基于角色的权限管理
- 支持细粒度权限控制
- JWT认证保证安全

## 开发规范

### 代码风格
- 使用ES6+语法
- async/await处理异步
- 统一的错误处理
- RESTful API设计

### Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试
chore: 构建/工具
```

## 部署

### CloudBase部署

1. 登录CloudBase控制台
2. 创建云开发环境
3. 配置环境变量
4. 部署云函数

### Docker部署

```bash
docker build -t tap-system .
docker run -p 3000:3000 tap-system
```

## 测试

```bash
npm test
```

## 常见问题

### MongoDB连接失败
- 检查MongoDB是否启动
- 检查连接字符串是否正确
- 检查防火墙设置

### JWT验证失败
- 检查JWT_SECRET是否配置
- 检查token是否过期
- 检查token格式是否正确

### 跨域问题
- 在.env中配置CORS_ORIGIN
- 确保前端URL正确配置

## 联系方式

如有问题，请联系开发团队。
