# TAP 系统快速启动指南

## 当前状态
✅ Node.js 已安装 (v24.13.1)
❌ MongoDB 未安装
❌ Docker 未安装

## 启动方案选择

### 方案 A：使用 MongoDB Atlas（云数据库，推荐）

这是最简单的方案，无需本地安装 MongoDB。

1. **注册 MongoDB Atlas**
   - 访问 https://www.mongodb.com/cloud/atlas
   - 免费注册账号
   - 创建一个免费集群（512MB 永久免费）

2. **获取连接字符串**
   - 在 Atlas 控制台点击 "Connect"
   - 选择 "Connect your application"
   - 复制连接字符串，例如：
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tap-system
     ```

3. **配置环境变量**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，将连接字符串填入：
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/tap-system
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

4. **启动服务**
   ```bash
   # 启动后端
   cd /Users/mor/CodeBuddy/LazyFirst/server
   npm install
   npm run dev
   
   # 新开终端，启动前端
   cd /Users/mor/CodeBuddy/LazyFirst/frontend
   npm install
   npm run dev
   ```

---

### 方案 B：本地安装 MongoDB

如果不想使用云服务，可以本地安装 MongoDB。

#### 安装 MongoDB Community Server

```bash
# 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 添加 MongoDB Tap
brew tap mongodb/brew

# 安装 MongoDB Community
brew install mongodb-community

# 启动 MongoDB
brew services start mongodb-community
```

#### 启动服务

```bash
# 启动后端
cd /Users/mor/CodeBuddy/LazyFirst/server
npm install
cp .env.example .env
npm run dev

# 新开终端，启动前端
cd /Users/mor/CodeBuddy/LazyFirst/frontend
npm install
npm run dev
```

---

### 方案 C：安装 Docker（推荐用于生产环境）

1. **安装 Docker Desktop**
   - 访问 https://www.docker.com/products/docker-desktop
   - 下载并安装 Docker Desktop for Mac

2. **启动所有服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst
   docker-compose up -d
   ```

---

## 验证服务运行

### 后端验证
访问：http://localhost:3000/api/health

### 前端验证
访问：http://localhost:5173

---

## 首次使用

1. 打开 http://localhost:5173
2. 点击"注册"按钮
3. 填写用户信息（注册第一个用户会自动成为管理员）
4. 登录系统

---

## 下一步

- [ ] 选择启动方案
- [ ] 安装必要的依赖
- [ ] 启动服务
- [ ] 访问系统

---

**推荐使用方案 A（MongoDB Atlas），最快最简单！**

请告诉我您选择哪个方案，我会帮您完成配置。
