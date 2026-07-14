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

## 六、SSL证书管理（重要！！！）

### 证书位置
| 位置 | 路径 |
|------|------|
| Let's Encrypt证书 | `/etc/letsencrypt/live/tap.lazyfirst.com/` |
| Nginx使用的证书 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内挂载路径 | `/etc/nginx/ssl/` |

### 铁律（绝对遵守）
1. **🚫 禁止把SSL证书打包进镜像**：`Dockerfile.frontend`不能COPY ssl目录
2. **🚫 禁止git提交SSL证书**：`ssl/*`必须加入`.gitignore`
3. **🚫 禁止rsync同步ssl目录**：rsync必须--exclude='ssl'
4. **✅ SSL证书必须通过volume挂载**：`docker-compose.yml`里frontend服务必须挂载`/etc/nginx/ssl/tap.lazyfirst.com/:/etc/nginx/ssl/`

### 证书续期
- **有效期**: 90天（Let's Encrypt）
- **自动续期**: Certbot已设置自动续期任务
- **手动续期命令**:
  ```bash
  sudo certbot renew
  sudo cp /etc/letsencrypt/live/tap.lazyfirst.com/fullchain.pem /etc/nginx/ssl/tap.lazyfirst.com/fullchain1.pem
  sudo cp /etc/letsencrypt/live/tap.lazyfirst.com/privkey.pem /etc/nginx/ssl/tap.lazyfirst.com/privkey1.pem
  sudo docker restart tap-frontend
  ```
- **检查证书有效期**:
  ```bash
  sudo openssl x509 -in /etc/nginx/ssl/tap.lazyfirst.com/fullchain1.pem -noout -dates
  ```

### 故障排查
1. **HTTPS报错**: 先检查证书是否过期
2. **证书文件名**: 服务器上是`fullchain1.pem`，软链接为`fullchain.pem`
3. **volume挂载**: 检查`docker inspect tap-frontend`的Mounts部分

---

## 七、故障排查（重要！！！必读）

### ⚠️ 2026-06-22 线上502故障（Docker volume挂载覆盖node_modules）

**故障日期**: 2026-06-22  
**故障现象**: https://tap.lazyfirst.com/product-stats 所有API返回 **502 Bad Gateway**  
**影响范围**: 所有 `/api/*` 端点

#### 根因分析
```
docker-compose.yml 配置缺陷
         ↓
volumes: - ./server:/app/server   ← 致命错误配置
         ↓
宿主机 ./server 目录（无 node_modules）
         ↓
覆盖容器内 /app/server 目录（含 node_modules）
         ↓
容器启动时找不到 express 模块
         ↓
Error: Cannot find module 'express'
         ↓
backend 容器崩溃循环 (Restarting)
         ↓
Nginx 反向代理无法连接后端 → 502 Bad Gateway
```

#### 问题配置（已修复前）
```yaml
# docker-compose.yml - backend服务（错误配置❌）
backend:
  build:
    context: .
    dockerfile: Dockerfile
  volumes:
    - ./server:/app/server   # ← 这行导致node_modules被覆盖！
  ports:
    - "3000:3000"
```

#### 修复方案
```bash
# 1. 备份原配置
cp docker-compose.yml docker-compose.yml.bak

# 2. 移除 backend 的 volumes 挂载配置
# 删除这两行:
#   volumes:
#     - ./server:/app/server

# 3. 强制删除旧容器，用新配置重启
sudo docker rm -f tap-backend
sudo docker compose up -d backend
```

#### 正确的docker-compose.yml配置（生产环境✅）
```yaml
backend:
  build:
    context: .
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://mongodb:27017/tap_system
    # ... 其他环境变量
  depends_on:
    - mongodb
  # ❌ 绝对不能加 volumes: - ./server:/app/server
```

#### 经验教训（铁律）
| 规则 | 原因 |
|------|------|
| 🚫 **生产环境禁止挂载代码目录** | `./server:/app/server` 会覆盖容器内node_modules |
| ✅ **开发环境可以挂载** | 用于热重载，但必须确保宿主机有node_modules |
| ✅ **正确做法**: Dockerfile COPY + npm install | 代码和依赖都打包进镜像 |
| ✅ **只挂载必需的静态资源** | 如SSL证书、上传文件目录等 |

#### 排查命令速查
```bash
# 1. 检查容器状态
docker ps -a | grep tap-backend

# 2. 查看容器日志（关键！）
docker logs tap-backend --tail 50

# 3. 检查是否有Restarting循环
docker ps -a --filter "status=restarting"

# 4. 进入容器检查文件
docker exec -it tap-backend ls -la /app/server/node_modules

# 5. 检查volume挂载情况
docker inspect tap-backend | grep -A 10 Mounts
```

---

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

---
## 九、历史更新记录

### 2026-04-19 服务器三地同步更新
**更新日期**: 2026年4月19日
**执行人**: 小垃圾
**授权人**: 主人

#### 更新背景
1. 样品管理页面商品信息列显示"--"（productId、productName、productImage、shop字段缺失）
2. 本地、GitHub、服务器三地代码存在差异，需要同步
3. 上次更新后问题未解决，需要彻底修复

#### 修复的核心问题
1. **数据模型不一致**: `SampleManagement.productId`在服务器上可能仍为ObjectId类型，而前端需要TikTok商品ID（String）
2. **API字段缺失**: 后端API未返回`productImage`、`shopName`等兼容字段
3. **数据未迁移**: 历史数据中的productId仍为ObjectId，未转换为TikTok商品ID

#### 已实施的修复
- ✅ `SampleManagement.js`: 将`productId`类型从ObjectId改为String，添加shopId字段
- ✅ `samples.js`: 添加`productImage`、`productId`（TikTok ID）、`shopName`字段映射
- ✅ `public-samples.js`: 添加`shopName`字段，优化查询逻辑
- ✅ `m-server.md`: 更新数据库备份命令（使用正确的root密码）
- ✅ 数据迁移: 执行`migrate_sample_productId_fixed.js`，跳过重复键错误

#### 部署验证结果
- ✅ 网站可访问性: HTTP 200 正常
- ✅ 前端构建: 成功
- ✅ 后端API: 可访问（需要认证的API返回401/403，正常）
- ✅ 数据迁移: 393条成功迁移，2708条仍需匹配或商品信息缺失

#### 经验教训
1. **唯一索引冲突**: 索引`companyId_1_date_1_influencerId_1_productId_1`导致重复键错误，迁移脚本需添加错误处理
2. **向后兼容**: API需同时支持ObjectId和TikTok ID两种格式，确保平滑过渡
3. **数据匹配**: 商品名称不精确匹配导致迁移失败，需要更灵活的匹配策略
4. **部署铁律**: 必须严格遵守：不执行`docker compose down`，不exclude `dist`目录，docker build加`--no-cache`

#### 后续建议
1. 优化商品名称匹配算法（去除特殊字符、忽略大小写、近似匹配）
2. 定期清理无效的商品关联（迁移失败的记录）
3. 加强数据导入验证，确保productId直接存储为TikTok ID
4. 考虑将唯一索引改为普通索引，避免数据重复冲突

---

### 2026-04-22 服务器三地同步更新
**更新日期**: 2026年4月22日
**执行人**: 小垃圾
**授权人**: 主人

#### 更新背景
1. 本地、GitHub、服务器三地代码存在差异，pending-sync目录中有5个待同步记录
2. 需要同步influencer详情按钮、样品管理弹层优化、ObjectId修复、视频管理优化等多项修改
3. 确保三地代码完全一致，修复历史遗留的数据模型和API字段问题

#### 修复的核心问题
1. **代码不一致**: 本地有未提交修改，GitHub与服务器代码不同步
2. **ObjectId兼容性**: Mongoose 8必须使用`new mongoose.Types.ObjectId()`语法
3. **API字段缺失**: 样品管理页面缺少productImage、shopName等字段
4. **权限配置**: 视频登记权限配置修复

#### 已实施的修复
- ✅ `influencer-managements/Index.vue`: 添加达人列表"详情"按钮功能
- ✅ `samples/ManagementBDSelf.vue`: /samples-bd页面弹层优化
- ✅ `samples/Management.vue`: 样品管理页面弹层优化
- ✅ `samples/VideoManagement.vue`: 视频管理UI优化
- ✅ `samples.js`: ObjectId修复+字段优化，支持TikTok ID和ObjectId两种格式
- ✅ `videos.js`: ObjectId修复+populate优化
- ✅ `public-samples.js`: 商品信息字段返回优化
- ✅ `public-products.js`: 新增商品统计接口
- ✅ `public-videos.js`: 公开视频列表接口
- ✅ `report-orders.js`: BD匹配逻辑重构
- ✅ `influencer-managements.js`: 权限控制优化
- ✅ `recruitments.js`: 权限调整
- ✅ `i18n/th.js`: 泰语国际化翻译更新
- ✅ `settings/Roles.vue`: 视频登记权限配置修复

#### 部署验证结果
- ✅ **数据库备份**: 使用root密码成功备份线上MongoDB
- ✅ **代码同步**: rsync同步完成，dist目录未被排除
- ✅ **容器重建**: `docker compose build --no-cache && docker compose up -d` 成功
- ✅ **网站可访问性**: HTTP 200 正常
- ✅ **后端API**: MongoDB连接正常，服务运行在端口3000
- ✅ **前端Nginx**: 正常启动，SSL证书加载正常
- ✅ **pending-sync记录**: 3个待同步文件已标记为"已同步"

#### 经验教训
1. **部署铁律**: 严格遵守：不执行`docker compose down`，不exclude `dist`目录，docker build加`--no-cache`
2. **数据安全**: 部署前必须备份数据库，使用正确的认证凭据
3. **代码同步**: rsync时注意文件权限，ssl证书文件权限问题可忽略
4. **验证流程**: 每个阶段完成后进行验证，确保无错误累积

#### 后续建议
1. 定期清理pending-sync目录，确保同步记录及时归档
2. 加强本地开发与GitHub的同步频率，减少三地差异
3. 考虑自动化部署流水线，减少人工操作风险

---
### 2026-07-14 阶段三数据库字段收敛 + 优化修复
**更新日期**: 2026年7月14日
**执行人**: 小垃圾
**授权人**: 主人

#### 数据库字段收敛（phase3）
1. **Order→ReportOrder 单表合并**: 扩展 ReportOrder 字段，orders/commissions/performance 路由改为 ReportOrder，删除 Order 模型
2. **枚举统一**: Activity/Product.sampleMethod 中文→online/offline（activities 11+products 351 条已迁移）
3. **兼容字段回填**: SampleManagement.influencerId 回填 301 条（354条保留兼容字段）
4. **冗余清理**: 删除 SampleManagement.isSampleSent、Shop.products 等无消费方字段

#### 优化修复
1. **Dockerfile**: 修复 npm ci 因 lock 陈旧失败，最终方案=重新生成干净 lock + 恢复 npm ci
2. **Bill.js**: 移除 billNo 字段 redundant unique:true，消除 Mongoose 重复索引警告

#### 迁移脚本（4个，均支持 --mode/--uri/--apply）
- `server/migrate_activity_samplemethod.js`：中文枚举→online/offline
- `server/migrate_sample_compat.js`：兼容字段回填
- `server/migrate_order_to_reportorder.js`：Order→ReportOrder 合并
- `server/migrate_clean_fields.js`：清理冗余字段

#### 关键经验
1. **npm ci 失败排查**: lock 文件陈旧缺传递依赖 → `npm install --package-lock-only` 无效 → 需删除 lock 重装生成干净文件
2. **迁移脚本在容器内执行**: 服务器宿主机无 node_modules，须 `docker exec tap-backend node /app/server/migrate_xxx.js` 在容器内跑
3. **容器内连 MongoDB**: 用 `--uri=mongodb://...@mongodb:27017/...`（docker 内网服务名），公网 IP 在容器内不通
4. **E11000 冲突容错**: 迁移脚本每条记录包 try/catch，唯一索引冲突 skip 不中断
5. **冒烟测试**: server/smoke-test.cjs 可验证后端各接口完整性

---
*文档更新日期: 2026-07-14*
*更新人: 小垃圾*
