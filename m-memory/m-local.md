# 本地开发注意事项

> 本地开发时必读此文件

---

## 一、数据库配置

### 数据库名称
- `tap_system`（不是 `tapdb`！）

### MongoDB连接
- 本地连接: `mongodb://127.0.0.1:27017/tap_system`
- 连接命令: `mongosh tap_system`

### .env环境切换
| 环境 | MONGODB_URI |
|------|-------------|
| 本地开发 | `mongodb://127.0.0.1:27017/tap_system` |
| 线上部署 | `mongodb://tapsystem:tap_system_pass_2024@150.109.183.29:27017/tap_system?authSource=tap_system` |

**⚠️ 部署前必须改回线上地址！**

---

## 二、端口配置

| 服务 | 端口 |
|------|------|
| 前端 | 5174 |
| 后端 | 3000 |

**⚠️ 不允许随便修改端口！**

---

## 三、本地启动步骤

### 方案A：纯本地开发（推荐）

1. **启动MongoDB本地服务**
   ```bash
   brew services start mongodb-community
   ```

2. **启动后端服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   npm run dev
   ```

3. **启动前端服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/frontend
   npm run dev
   ```

4. **访问地址**
   - 前端：http://localhost:5174
   - 后端API：http://localhost:3000
   - 登录：admin / ad8889

---

## 四、铁律

| 规则 | 说明 |
|------|------|
| 🚫 本地做事只连本地 | 禁止本地开发时连线上数据库 |
| 🚫 部署前改回线上地址 | .env中MONGODB_URI必须改回远程地址 |

---

## 五、待同步记录

**文件夹**: `pending-sync/`

### 记录规则
1. 每次修改代码后，在 `pending-sync/` 创建记录文件
2. 文件命名格式: `YYYYMMDD-HHMM-描述.md`
3. 内容包含: 修改文件、修改内容、同步状态
4. **新增文件也要记录**：迁移脚本、工具脚本等同样需要创建记录

### 同步后操作
1. 读取所有未同步文件
2. 逐个确认修改已同步
3. 验证功能正常
4. 将文件名改为 `已同步-YYYYMMDD-HHMM-描述.md`

---

## 六、常用命令

### 查看集合
```bash
mongosh tap_system
db.getCollectionNames()
```

### 查看admin用户
```bash
db.users.findOne({username: 'admin'})
```

### 统计样品
```bash
db.samplemanagements.countDocuments()
```

### 重置admin密码
```bash
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('ad8889', 10))"
mongosh tap_system --quiet --eval "db.users.updateOne({username:'admin'}, {\$set: {password: '新hash'}})"
```
