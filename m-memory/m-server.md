# 服务器操作注意事项

> 线上部署时必读此文件

---

## 一、服务器信息

| 项目 | 值 |
|------|-----|
| IP | `150.109.183.29` |
| 用户 | `ubuntu` |
| 密码 | `IT8vuP53MB6LbjP2Htvp` |
| 域名 | `tap.lazyfirst.com` |
| MongoDB数据库 | `tap_system` |

### SSH命令模板
```bash
sshpass -p 'IT8vuP53MB6LbjP2Htvp' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 "命令"
```

### MongoDB认证
- 用户名: `tapsystem`
- 密码: `5Qb0Q9WqztimCNuzfVoX`
- 连接: `mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system`

---

## 二、铁律（绝对禁止）

| 规则 | 原因 |
|------|------|
| 🚫 **禁止执行 `docker compose down`** | 会删除容器、丢失SSL证书volume挂载、重置网络 |
| 🚫 **禁止执行 `docker stop + docker rm`** | 同上，会重建容器 |
| 🚫 **rsync 禁止 exclude `dist`** | 前端构建文件会丢失，网站UI不更新 |

---

## 三、部署前自检清单

- [ ] **线上数据库备份了吗？**
- [ ] rsync有没有exclude错东西？（dist不能exclude）
- [ ] docker build有没有加--no-cache？
- [ ] 改的是前端还是后端？还是两个都要重建？

---

## 四、部署流程

### 完整部署命令
```bash
# 1. GitHub拉取
git pull origin main

# 2. 本地构建
cd frontend && npm run build && cd ..

# 3. 同步代码（dist不要exclude！）
sshpass -p 'IT8vuP53MB6LbjP2Htvp' rsync -avz \
  --exclude 'node_modules' --exclude '.git' \
  /Users/mor/CodeBuddy/LazyFirst/ \
  ubuntu@150.109.183.29:/home/ubuntu/tap-system/

# 4. 重建并重启（必须加--no-cache）
sshpass -p 'IT8vuP53MB6LbjP2Htvp' ssh ubuntu@150.109.183.29 \
  "cd /home/ubuntu/tap-system && sudo docker compose build --no-cache && sudo docker compose up -d"

# 5. 验证
curl -s -o /dev/null -w "%{http_code}" https://tap.lazyfirst.com
```

### 判断改了什么 → 决定做什么

| 修改范围 | 必须操作 |
|----------|----------|
| 前端改了 | 同步dist + docker build --no-cache |
| 后端改了 | docker build --no-cache |
| 前后端都改 | 两个都做 |

### Docker操作原则
- **重启单个服务**: `docker compose restart <service>`
- **重建容器**: `docker compose build --no-cache && docker compose up -d`
- **不需要重建时**: 直接 `docker compose restart <service>`

---

## 五、数据库备份

### 备份命令（正确密码）
```bash
# 使用root用户备份（密码来自docker-compose.yml）
sshpass -p 'IT8vuP53MB6LbjP2Htvp' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 \
  "sudo docker exec tap-mongodb mongodump --archive --gzip --db=tap_system --authenticationDatabase=admin -u tapadmin -p s0MxUUtrWwdjfX70W2gf > /home/ubuntu/backups/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive"

# 或者使用tapsystem用户备份（需要认证数据库）
sshpass -p 'IT8vuP53MB6LbjP2Htvp' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 \
  "sudo docker exec tap-mongodb mongodump --archive --gzip --db=tap_system --username tapsystem --password 5Qb0Q9WqztimCNuzfVoX --authenticationDatabase tap_system > /home/ubuntu/backups/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive"
```

### 定时备份
- 脚本位置: `/home/ubuntu/backups/backup-db.sh`
- 备份位置: `/home/ubuntu/backups/tapdb_*.archive`
- 执行时间: 每天东八区 16:00（UTC 08:00）
- 保留期限: 30天
- **注意事项**: 脚本已更新为正确的root密码 `s0MxUUtrWwdjfX70W2gf`

### 手动备份命令
```bash
# 方法1: 执行更新后的备份脚本
/home/ubuntu/backups/backup-db.sh

# 方法2: 直接执行备份命令
sudo docker exec tap-mongodb mongodump --archive=/tmp/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive --gzip --db=tap_system --authenticationDatabase=admin -u tapadmin -p s0MxUUtrWwdjfX70W2gf
sudo docker cp tap-mongodb:/tmp/tapdb_backup_*.archive /home/ubuntu/backups/
sudo docker exec tap-mongodb rm -f /tmp/tapdb_backup_*.archive
```

---

## 六、SSL证书位置

| 位置 | 路径 |
|------|------|
| 服务器 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内 | `/etc/nginx/ssl/` |

---

## 七、故障排查

### 空白页
- **原因**: _id类型变成字符串，populate失败
- **排查**: 检查_id类型是否是ObjectId
```bash
node -e "db.collection('users').findOne()"
```

### 网络不通
```bash
docker network connect tap-system_default <container-name>
```

---

## 八、操作原则

1. **先本地后服务器**：所有修改在本地测试，确认后再同步
2. **服务器操作需授权**：除非紧急情况，否则先询问主人
3. **重启服务后告知主人**：有权限自主重启前后端
4. **严禁边想边做**：必须先确认再执行
