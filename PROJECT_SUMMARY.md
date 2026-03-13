# TAP系统 - 项目总结

## 项目概述

TAP系统是一个多租户SaaS平台，用于管理TikTok达人、样品申请、订单和分润计算。

## 技术栈

### 后端
- **Node.js** + **Express** - 服务器框架
- **MongoDB** - 数据库
- **JWT** - 认证
- **CloudBase** - 腾讯云开发（可选）

### 前端
- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Element Plus** - UI组件库
- **Pinia** - 状态管理
- **Axios** - HTTP请求

### 扩展
- **Chrome Extension** - TikTok数据同步插件

## 核心功能

### 1. 用户管理
- 多租户隔离
- 角色权限管理
- JWT认证

### 2. 达人管理（CRM）
- 公海/私海池
- 达人分配/回收
- 粉丝数/GMV统计
- 配合度打分
- 视频质量评分

### 3. 样品管理
- 样品申请（BD填写）
- TikTok同步（管理员插件）
- 状态跟踪（pending/approved/shipped/received）
- 反馈记录

### 4. 订单管理
- 订单录入
- 订单跟踪
- 状态管理

### 5. 分润计算
- 自动计算
- 基于样品申请
- 分润记录
- 状态跟踪（pending/paid/settled）

## 项目结构

```
tap-system/
├── server/                    # 后端
│   ├── config/               # 配置
│   ├── middleware/           # 中间件
│   ├── models/               # 数据模型
│   ├── routes/               # 路由
│   ├── utils/                # 工具
│   ├── server.js             # 入口
│   └── package.json
├── frontend/                  # 前端
│   ├── src/
│   │   ├── views/           # 页面
│   │   ├── layouts/         # 布局
│   │   ├── router/          # 路由
│   │   ├── stores/          # 状态
│   │   └── utils/           # 工具
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── chrome-extension/          # Chrome插件
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   └── content.css
├── database-schema-complete.md
├── README.md
├── DEPLOYMENT.md
└── docker-compose.yml
```

## API接口

### 认证
- POST /api/auth/register - 注册
- POST /api/auth/login - 登录
- GET /api/auth/me - 获取当前用户

### 达人管理
- GET /api/influencers - 获取列表
- POST /api/influencers - 创建达人
- GET /api/influencers/:id - 获取详情
- PUT /api/influencers/:id - 更新
- DELETE /api/influencers/:id - 删除
- POST /api/influencers/:id/assign - 分配
- POST /api/influencers/:id/reclaim - 回收

### 样品管理
- GET /api/samples - 获取列表
- POST /api/samples - 创建申请
- GET /api/samples/:id - 获取详情
- PUT /api/samples/:id - 更新
- DELETE /api/samples/:id - 删除
- PUT /api/samples/:id/feedback - 反馈
- PUT /api/samples/:id/sync-tiktok - 同步TikTok
- GET /api/samples/statistics/summary - 统计

### 订单管理
- GET /api/orders - 获取列表
- POST /api/orders - 创建订单

### 分润管理
- GET /api/commissions - 获取列表
- POST /api/commissions/calculate - 计算分润

## Chrome插件功能

- 扫描TikTok Partner Center页面
- 提取样品数据
- 同步到TAP系统
- 导出CSV文件

## 部署方式

### 1. CloudBase云开发（推荐）
- 使用云函数部署后端
- 使用静态网站托管前端
- 使用CloudBase数据库

### 2. Docker部署
- 使用docker-compose一键部署
- 包含MongoDB、后端、前端

### 3. 轻量应用服务器
- 腾讯云Lighthouse
- 手动配置环境

## 环境要求

- Node.js 18+
- MongoDB 7+
- Chrome浏览器（插件）

## 开发流程

### 1. 后端开发
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 2. 前端开发
```bash
cd frontend
npm install
npm run dev
```

### 3. 插件开发
1. 打开Chrome扩展管理页面
2. 开启开发者模式
3. 加载已解压的扩展程序
4. 选择chrome-extension目录

## 核心业务流程

### 样品申请流程
1. BD在系统中填写样品申请
2. 管理员在TikTok Partner Center创建样品
3. 使用Chrome插件同步数据
4. 系统自动匹配并更新同步状态

### 分润计算流程
1. 订单完成后
2. 点击"计算分润"
3. 系统查找关联的样品申请
4. 确认BD归属
5. 计算分润金额
6. 生成分润记录

### 达人管理流程
1. 达人初始在公海池
2. BD从公海池选择并分配到私海
3. BD维护达人关系
4. 超过30天未跟进自动回收
5. 或手动回收至公海

## 数据库设计

详见 `database-schema-complete.md`

主要表：
- companies（公司）
- users（用户）
- influencers（达人）
- sampleRequests（样品申请）
- orders（订单）
- commissions（分润记录）
- products（产品）

## 安全性

- JWT Token认证
- 多租户数据隔离
- 密码加密存储
- API限流保护
- CORS配置
- Helmet安全中间件

## 性能优化

- 数据库索引优化
- 分页查询
- 缓存策略（待实现）
- CDN加速（待实现）

## 未来规划

### 短期
- [ ] 数据可视化图表
- [ ] 导出Excel功能
- [ ] 消息通知系统
- [ ] 操作日志记录

### 中期
- [ ] 自动化达人评分
- [ ] 智能推荐达人
- [ ] 数据分析报表
- [ ] 移动端适配

### 长期
- [ ] AI辅助决策
- [ ] 微信小程序
- [ ] 多平台支持（小红书、快手）
- [ ] 跨境电商对接

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系开发团队。
