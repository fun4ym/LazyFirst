# TAP系统部署指南

## 部署方式

### 方式一：使用CloudBase云开发（推荐）

#### 1. 准备工作

1. 注册腾讯云账号并开通CloudBase服务
2. 创建CloudBase环境
3. 安装Cloudbase CLI工具

```bash
npm install -g @cloudbase/cli
```

#### 2. 登录CloudBase

```bash
cloudbase login
```

#### 3. 初始化项目

```bash
cloudbase init
```

选择或创建CloudBase环境。

#### 4. 部署后端

后端需要改造为云函数部署。

**创建云函数：**

在 `server/functions/` 目录下创建云函数：

```
server/functions/
├── auth/              # 认证相关
│   └── index.js
├── influencers/       # 达人管理
│   └── index.js
├── samples/           # 样品管理
│   └── index.js
├── orders/            # 订单管理
│   └── index.js
└── commissions/       # 分润管理
    └── index.js
```

**部署云函数：**

```bash
cloudbase functions:deploy
```

#### 5. 部署前端

```bash
cd frontend
npm run build
cd ..
cloudbase hosting:deploy ./frontend/dist
```

#### 6. 配置数据库

在CloudBase控制台创建数据库集合，参考 `database-schema-complete.md`

---

### 方式二：使用Docker部署

#### 1. 构建镜像

```bash
docker-compose build
```

#### 2. 启动服务

```bash
docker-compose up -d
```

#### 3. 查看日志

```bash
docker-compose logs -f
```

#### 4. 停止服务

```bash
docker-compose down
```

---

### 方式三：使用轻量应用服务器（Lighthouse）

#### 1. 准备服务器

- 购买腾讯云轻量应用服务器
- 安装Docker环境

#### 2. 上传代码

```bash
# 使用git
git clone <your-repo-url>

# 或使用scp
scp -r . root@your-server-ip:/root/tap-system
```

#### 3. 启动服务

```bash
cd /root/tap-system
docker-compose up -d
```

#### 4. 配置Nginx（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 环境变量配置

创建 `.env` 文件：

```env
# 服务器配置
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/tap_system

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# CloudBase（如果使用）
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key
```

---

## 数据库初始化

### 创建管理员用户

```bash
# 在后端目录执行
node scripts/createAdmin.js
```

或通过API创建：

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123",
  "realName": "系统管理员",
  "phone": "13800138000",
  "companyId": "company_id",
  "roleId": "role_id"
}
```

---

## 常见问题

### 1. MongoDB连接失败

检查MongoDB是否启动：

```bash
docker ps | grep mongo
```

或查看日志：

```bash
docker-compose logs mongodb
```

### 2. 前端无法连接后端

检查：
- 后端是否正常运行
- 端口是否正确
- CORS配置是否正确
- 防火墙是否开放端口

### 3. Chrome插件无法使用

- 确保插件已正确加载
- 检查API地址配置
- 确认Token是否有效

---

## 监控和日志

### 查看日志

```bash
# 后端日志
docker-compose logs -f backend

# 前端日志
docker-compose logs -f frontend

# MongoDB日志
docker-compose logs -f mongodb
```

### 性能监控

推荐使用：
- 腾讯云监控
- Prometheus + Grafana
- 云函数监控（CloudBase）

---

## 备份和恢复

### 数据库备份

```bash
docker exec tap-mongodb mongodump --out /backup
```

### 数据库恢复

```bash
docker exec tap-mongodb mongorestore /backup
```

---

## SSL证书配置

### 使用Let's Encrypt

```bash
# 安装certbot
apt install certbot

# 获取证书
certbot certonly --standalone -d your-domain.com

# 配置Nginx使用证书
```

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose build

# 重启服务
docker-compose up -d

# 清理旧镜像
docker image prune -a
```

---

## 联系方式

如有问题，请联系开发团队。
