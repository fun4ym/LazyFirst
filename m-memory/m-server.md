# 服务器操作注意事项

> 线上部署时必读此文件
> 凭据信息统一从 `m-intimacy.md` 读取，此处不重复

---

## 一、铁律（绝对禁止）

| 规则 | 原因 |
|------|------|
| 🚫 **禁止执行 `docker compose down`** | 会删除容器、丢失 SSL 证书 volume 挂载、重置网络 |
| 🚫 **禁止执行 `docker stop + docker rm`** | 同上，会重建容器 |
| 🚫 **rsync 禁止 exclude `dist`** | 前端构建文件会丢失，网站 UI 不更新 |

---

## 二、部署前自检清单

- [ ] **线上数据库备份了吗？**
- [ ] rsync 有没有 exclude 错东西？（dist 不能 exclude）
- [ ] docker build 有没有加 `--no-cache`？
- [ ] 改的是前端还是后端？还是两个都要重建？

---

## 三、部署流程

### 完整部署命令

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. 本地构建前端
cd frontend && npm run build && cd ..

# 3. 同步代码到服务器（dist 不能 exclude！）
sshpass -p '<密码见 m-intimacy.md>' rsync -avz \
  --exclude 'node_modules' --exclude '.git' \
  --exclude '.env' --exclude 'ssl' \
  /Users/mor/CodeBuddy/LazyFirst/ \
  ubuntu@<IP见 m-intimacy.md>:/home/ubuntu/tap-system/

# 4. 重建并重启（必须加 --no-cache）
sshpass -p '<密码>' ssh ubuntu@<IP> \
  "cd /home/ubuntu/tap-system && sudo docker compose build --no-cache && sudo docker compose up -d"

# 5. 验证
curl -s -o /dev/null -w "%{http_code}" https://tap.lazyfirst.com
```

### 判断改了什么 → 决定做什么

| 修改范围 | 必须操作 |
|----------|----------|
| 前端改了 | 同步 dist + docker build --no-cache |
| 后端改了 | docker build --no-cache |
| 前后端都改 | 两个都做 |

### Docker 操作原则
- **重启单个服务**: `docker compose restart <service>`
- **重建容器**: `docker compose build --no-cache && docker compose up -d`
- **不需要重建时**: 直接 `docker compose restart <service>`

---

## 四、数据库备份

### 备份命令
```bash
# 使用 root 用户备份（密码来自 docker-compose.yml）
sshpass -p '<密码>' ssh -o StrictHostKeyChecking=no ubuntu@<IP> \
  "sudo docker exec tap-mongodb mongodump --archive --gzip --db=tap_system --authenticationDatabase=admin -u tapadmin -p s0MxUUtrWwdjfX70W2gf > /home/ubuntu/backups/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive"

# 或使用 tapsystem 用户备份
sshpass -p '<密码>' ssh -o StrictHostKeyChecking=no ubuntu@<IP> \
  "sudo docker exec tap-mongodb mongodump --archive --gzip --db=tap_system --username tapsystem --password <MongoDB密码> --authenticationDatabase tap_system > /home/ubuntu/backups/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive"
```

### 定时备份
- 脚本位置: `/home/ubuntu/backups/backup-db.sh`
- 备份位置: `/home/ubuntu/backups/tapdb_*.archive`
- 执行时间: **每天东八区 00:00（UTC 16:00）**
- 保留期限: 30 天

### 手动备份命令
```bash
# 方法1: 执行备份脚本
/home/ubuntu/backups/backup-db.sh

# 方法2: 直接执行
sudo docker exec tap-mongodb mongodump --archive=/tmp/tapdb_backup_$(date +%Y%m%d_%H%M%S).archive --gzip --db=tap_system --authenticationDatabase=admin -u tapadmin -p s0MxUUtrWwdjfX70W2gf
sudo docker cp tap-mongodb:/tmp/tapdb_backup_*.archive /home/ubuntu/backups/
sudo docker exec tap-mongodb rm -f /tmp/tapdb_backup_*.archive
```

---

## 五、SSL 证书管理

### 证书位置
| 位置 | 路径 |
|------|------|
| Let's Encrypt 证书 | `/etc/letsencrypt/live/tap.lazyfirst.com/` |
| Nginx 使用的证书 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内挂载路径 | `/etc/nginx/ssl/` |

### 铁律
1. **🚫 禁止把 SSL 证书打包进镜像**：`Dockerfile.frontend` 不能 COPY ssl 目录
2. **🚫 禁止 git 提交 SSL 证书**：`ssl/*` 必须加入 `.gitignore`
3. **🚫 rsync 必须 exclude ssl**：`--exclude 'ssl'`
4. **✅ SSL 证书必须通过 volume 挂载**：`docker-compose.yml` 里 frontend 服务必须挂载

### 证书续期
```bash
# 自动续期已设置，手动续期:
sudo certbot renew
sudo cp /etc/letsencrypt/live/tap.lazyfirst.com/fullchain.pem /etc/nginx/ssl/tap.lazyfirst.com/fullchain1.pem
sudo cp /etc/letsencrypt/live/tap.lazyfirst.com/privkey.pem /etc/nginx/ssl/tap.lazyfirst.com/privkey1.pem
sudo docker restart tap-frontend

# 检查有效期:
sudo openssl x509 -in /etc/nginx/ssl/tap.lazyfirst.com/fullchain1.pem -noout -dates
```

---

## 六、故障排查

### 2026-06-22 线上 502 故障（Docker volume 挂载覆盖 node_modules）

**根因**: `docker-compose.yml` 中 `volumes: - ./server:/app/server` 覆盖容器内 node_modules → express 找不到 → 崩溃循环 → 502。

**铁律**: 🚫 **生产环境禁止挂载代码目录**。正确做法：Dockerfile COPY + npm install 打包进镜像，只挂载 SSL 证书等静态资源。

**排查命令**:
```bash
docker logs tap-backend --tail 50          # 看崩溃原因
docker ps -a --filter "status=restarting"  # 检查重启循环
docker inspect tap-backend | grep -A 10 Mounts  # 检查 volume 挂载
```

### 空白页
- **原因**: `_id` 类型变成字符串，populate 失败
- **排查**: `mongosh tap_system --eval "db.users.findOne()"` 检查类型

### 网络不通
```bash
docker network connect tap-system_default <container-name>
```

---

## 七、操作原则

1. **先本地后服务器**：所有修改在本地测试，确认后再同步
2. **服务器操作需授权**：除非紧急情况，否则先询问主人
3. **重启服务后告知主人**：有权限自主重启前后端
4. **严禁边想边做**：必须先确认再执行

---

## 八、最近部署记录

### 2026-07-14 阶段三数据库字段收敛 + 优化修复

#### 数据库字段收敛（phase3）
1. **Order→ReportOrder 单表合并**: 扩展 ReportOrder 字段，orders/commissions/performance 路由改为 ReportOrder，删除 Order 模型
2. **枚举统一**: Activity/Product.sampleMethod 中文→online/offline
3. **兼容字段回填**: SampleManagement.influencerId 回填
4. **冗余清理**: 删除 SampleManagement.isSampleSent、Shop.products 等无消费方字段

#### 优化修复
1. **Dockerfile**: 修复 npm ci 因 lock 陈旧失败，重新生成干净 lock + 恢复 npm ci
2. **Bill.js**: 移除 billNo 字段 redundant unique:true，消除 Mongoose 重复索引警告

#### 迁移脚本（4 个，均支持 --mode/--uri/--apply）
- `server/migrate_activity_samplemethod.js` / `migrate_sample_compat.js` / `migrate_order_to_reportorder.js` / `migrate_clean_fields.js`

#### 关键经验
1. **npm ci 失败**: lock 陈旧缺传递依赖 → 删除 lock 重装
2. **容器内跑迁移**: `docker exec tap-backend node /app/server/migrate_xxx.js`
3. **容器内连 MongoDB**: 用 `--uri=mongodb://...@mongodb:27017/...`（内网服务名）
4. **E11000 容错**: 迁移脚本每条记录 try/catch
5. **冒烟测试**: `server/smoke-test.cjs` 验证接口完整性

---
*文档更新日期: 2026-07-14*
*更新人: 小垃圾*
