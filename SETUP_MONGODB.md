# MongoDB 安装指南

## macOS 安装 MongoDB

### 方法1：使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community

# 启动 MongoDB 服务
brew services start mongodb-community

# 验证安装
mongosh
```

### 方法2：手动下载安装

1. 访问 https://www.mongodb.com/try/download/community
2. 选择 macOS 版本下载
3. 安装后启动服务：
   ```bash
   sudo mongod --config /usr/local/etc/mongod.conf
   ```

## 使用本地 MongoDB 后

### 1. 停止当前服务
```bash
pkill -f "node server.js"
```

### 2. 重启服务（会自动连接本地MongoDB）
```bash
cd /Users/mor/CodeBuddy/LazyFirst/server
node server.js
```

### 3. 验证连接
看到日志显示 `✅ MongoDB Connected: localhost:27017` 而不是 `✅ Memory MongoDB Connected` 即为成功。

## 常用命令

```bash
# 启动 MongoDB
brew services start mongodb-community

# 停止 MongoDB
brew services stop mongodb-community

# 重启 MongoDB
brew services restart mongodb-community

# 连接 MongoDB
mongosh

# 查看数据库
mongosh --eval "db.adminCommand('listDatabases')"
```

## 数据备份

```bash
# 导出所有数据
mongodump --out ~/mongo_backup

# 恢复数据
mongorestore ~/mongo_backup
```

## 优势

✅ 数据持久化，重启不丢失
✅ 更好的性能
✅ 支持数据备份和恢复
✅ 可以使用 MongoDB Compass 等工具可视化管理
