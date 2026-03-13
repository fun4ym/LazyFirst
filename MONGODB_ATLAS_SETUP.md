# MongoDB Atlas 配置详细步骤

## 第一步：注册账号

1. **访问 MongoDB Atlas**
   - 打开浏览器访问：https://www.mongodb.com/cloud/atlas
   - 点击右上角 "Try Free" 按钮

2. **创建账号**
   - 填写邮箱、密码（请记住密码）
   - 选择 "Personal" 个人账号
   - 完成邮箱验证

---

## 第二步：创建免费集群

1. **选择计划**
   - 选择 "Free" 免费计划（M0 Sandbox）
   - 点击 "Create"

2. **配置集群**
   - **Cloud Provider**: 选择 "AWS"（推荐）或 "Google Cloud"
   - **Region**: 选择离你最近的区域
     - 亚洲推荐：Singapore, Tokyo, Mumbai
     - 速度会更快
   - **Cluster Name**: 可以使用默认名称或改为 "TAP-Cluster"
   - 点击 "Create Cluster"

3. **等待创建**
   - 集群创建需要 3-5 分钟
   - 页面会显示 "Creating..." 状态
   - 创建完成后会变为绿色的 "Available"

---

## 第三步：配置数据库访问权限

### 3.1 创建数据库用户

1. 在集群页面左侧菜单，点击 **"Database Access"**
2. 点击 **"Add New Database User"** 按钮
3. 填写用户信息：
   - **Authentication Method**: 选择 "Password"
   - **Username**: 输入用户名，例如：`tapuser`
   - **Password**: 设置一个强密码（**请记住这个密码！**）
   - **Database User Privileges**: 选择 "Read and write to any database"
4. 点击 **"Add User"**

### 3.2 配置网络访问（白名单）

1. 在左侧菜单，点击 **"Network Access"**
2. 点击 **"Add IP Address"** 按钮
3. 选择 **"Allow Access from Anywhere"**（允许任何IP访问）
   - 这会添加 `0.0.0.0/0` 到白名单
   - 开发阶段这样配置最方便
4. 点击 **"Confirm"**

---

## 第四步：获取连接字符串

1. **回到集群页面**
   - 点击左侧菜单 **"Clusters"**
   - 点击您创建的集群名称

2. **点击 "Connect" 按钮**
   - 在集群卡片上点击 "Connect" 按钮

3. **选择连接方式**
   - 选择 **"Connect your application"**

4. **复制连接字符串**
   - 选择 Node.js 版本（默认选择最新版本）
   - 复制连接字符串，格式如下：
     ```
     mongodb+srv://tapuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

5. **修改连接字符串**
   - 将 `<password>` 替换为您之前设置的密码
   - 在连接字符串最后添加数据库名称 `/tap-system`
   
   **最终格式：**
   ```
   mongodb+srv://tapuser:your-actual-password@cluster0.xxxxx.mongodb.net/tap-system?retryWrites=true&w=majority
   ```

---

## 第五步：配置项目

1. **创建 .env 文件**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   cp .env.example .env
   ```

2. **编辑 .env 文件**
   打开 `.env` 文件，修改以下内容：
   
   ```env
   # 环境变量配置
   NODE_ENV=development
   PORT=3000

   # MongoDB连接（使用Atlas）
   MONGODB_URI=mongodb+srv://tapuser:your-actual-password@cluster0.xxxxx.mongodb.net/tap-system?retryWrites=true&w=majority

   # JWT密钥（请修改为一个随机字符串）
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-123456
   JWT_EXPIRE=7d

   # CORS配置
   CORS_ORIGIN=http://localhost:5173

   # 日志级别
   LOG_LEVEL=debug
   ```

3. **保存文件**

---

## 第六步：测试连接

1. **安装后端依赖**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   npm install
   ```

2. **启动后端服务**
   ```bash
   npm run dev
   ```

3. **验证连接**
   - 如果看到类似以下输出，说明连接成功：
     ```
     MongoDB Connected Successfully!
     Server is running on port 3000
     ```

---

## 常见问题

### Q1: 连接超时 "Connection timeout"
**解决方案：**
- 检查 Network Access 白名单是否配置正确
- 确认没有 VPN 或防火墙阻止连接
- 尝试使用其他区域的集群

### Q2: 认证失败 "Authentication failed"
**解决方案：**
- 检查用户名和密码是否正确
- 确认用户权限为 "Read and write to any database"

### Q3: 集群未就绪
**解决方案：**
- 等待集群状态变为绿色 "Available"
- 创建过程通常需要 3-5 分钟

### Q4: 免费额度不足
**解决方案：**
- 512MB 对个人项目足够
- 可以删除旧数据或清理集合
- 后期可以升级到付费计划

---

## 下一步

配置完成后，继续：
1. ✅ 启动后端服务
2. ✅ 启动前端服务
3. ✅ 访问系统并注册账号

---

**配置完成后，请告诉我"已完成"，我会帮您启动服务！**
