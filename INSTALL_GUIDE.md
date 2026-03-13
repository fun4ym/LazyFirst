# TAP 系统安装指南

## 前提条件

在运行完整的 TAP 系统之前，您需要安装以下软件：

### 1. 安装 Node.js

**方法 A：使用官方安装包（推荐）**

1. 访问 https://nodejs.org/
2. 下载 macOS 的 LTS 版本（.pkg 文件）
3. 双击安装包，按提示完成安装

**方法 B：使用 Homebrew**

```bash
# 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node
```

**验证安装：**
```bash
node --version
npm --version
```

### 2. 安装 MongoDB（推荐使用 Docker）

**安装 Docker Desktop：**

1. 访问 https://www.docker.com/products/docker-desktop
2. 下载并安装 Docker Desktop for Mac
3. 启动 Docker Desktop

**或者使用本地 MongoDB：**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

## 启动步骤

### 方式 1：使用 Docker Compose（最简单）

```bash
cd /Users/mor/CodeBuddy/LazyFirst
docker-compose up -d
```

服务将在以下地址运行：
- 前端: http://localhost:5173
- 后端: http://localhost:3000
- MongoDB: localhost:27017

### 方式 2：手动启动各个服务

#### 步骤 1：启动 MongoDB
```bash
# 如果使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 如果使用本地 MongoDB
brew services start mongodb-community
```

#### 步骤 2：启动后端
```bash
cd /Users/mor/CodeBuddy/LazyFirst/server
npm install
cp .env.example .env
# 编辑 .env 文件配置数据库连接
npm run dev
```

#### 步骤 3：启动前端
```bash
# 新开一个终端窗口
cd /Users/mor/CodeBuddy/LazyFirst/frontend
npm install
npm run dev
```

## 访问系统

打开浏览器访问：http://localhost:5173

## 默认账号

首次使用需要注册账号：
- 用户名: admin
- 密码: 自行设置
- 角色: 自动分配为 admin

## 常见问题

### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :5173

# 杀掉进程
kill -9 <PID>
```

### 2. MongoDB 连接失败
检查 MongoDB 是否正在运行：
```bash
# Docker
docker ps | grep mongo

# 本地 MongoDB
brew services list | grep mongodb
```

### 3. npm install 失败
```bash
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
```

## 下一步

安装完成后，参考以下文档：
- [数据库设计](database-schema-complete.md)
- [后端 API 文档](server/README.md)
- [前端使用文档](frontend/README.md)
- [Chrome 插件使用](chrome-extension/README.md)
- [部署指南](DEPLOYMENT.md)
