# 重要隐私信息

> ⚠️ 涉及隐私信息时从此文件读取
> 🚫 禁止在对话中暴露完整密码

---

## 一、服务器信息

| 项目 | 值 | 用途 |
|------|-----|------|
| IP | `150.109.183.29` | SSH连接 |
| 用户 | `ubuntu` | SSH登录 |
| 密码 | `IT8vuP53MB6LbjP2Htvp` | SSH登录 |
| 域名 | `tap.lazyfirst.com` | 网站访问 |

### SSH命令模板
```bash
sshpass -p 'IT8vuP53MB6LbjP2Htvp' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 "命令"
```

---

## 二、MongoDB信息

| 项目 | 值 | 用途 |
|------|-----|------|
| 用户 | `tapsystem` | 数据库认证 |
| 密码 | `5Qb0Q9WqztimCNuzfVoX` | 数据库认证 |
| 数据库 | `tap_system` | 数据存储 |

### MongoDB连接字符串
```
mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system
```

---

## 三、本地登录信息

| 项目 | 值 | 备注 |
|------|-----|------|
| admin密码 | `ad8889` | bcrypt加密存储 |

### 重置admin密码
```bash
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('ad8889', 10))"
mongosh tap_system --quiet --eval "db.users.updateOne({username:'admin'}, {\$set: {password: '新hash'}})"
```

---

## 四、存储位置

### SSL证书
| 位置 | 路径 |
|------|------|
| 服务器 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内 | `/etc/nginx/ssl/` |

### 数据库备份
| 项目 | 路径 |
|------|------|
| 备份脚本 | `/home/ubuntu/backups/backup-db.sh` |
| 备份文件 | `/home/ubuntu/backups/tapdb_*.archive` |

---

## 五、环境变量模板

### 本地开发 (.env)
```env
MONGODB_URI=mongodb://127.0.0.1:27017/tap_system
JWT_SECRET=your_jwt_secret_key_change_this_in_production
PORT=3000
NODE_ENV=development
```

### 线上部署 (.env)
```env
MONGODB_URI=mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system
JWT_SECRET=your_jwt_secret_key_change_this_in_production
PORT=3000
NODE_ENV=production
```

---

## 六、安全原则

| 原则 | 说明 |
|------|------|
| 🚫 禁止暴露完整密码 | 对话中只显示部分信息 |
| 🚫 禁止越权猜测 | IP地址只在本地memory.md中 |
| ✅ 分类存储 | 隐私信息集中在m-intimacy.md |
| ✅ 按需读取 | 需要时从文件读取，不记忆完整内容 |
