# CodeBuddy Memory - LazyFirst/TAP项目

> **必读**：每次对话开始前必读！
> Memory ID: 25807293

---

## 一、铁律（绝对禁止）

| 规则 | 原因 |
|------|------|
| 🚫 **禁止执行 `docker compose down`** | 会删除容器、丢失SSL证书volume挂载、重置网络 |
| 🚫 **禁止执行 `docker stop + docker rm`** | 同上，会重建容器 |
| 🚫 **rsync 禁止 exclude `dist`** | 前端构建文件会丢失，网站UI不更新 |

---

## 二、服务器信息

| 项目 | 值 |
|------|-----|
| IP | `150.109.183.29` |
| 用户 | `ubuntu` |
| 密码 | `tokzit-hejwig-6vapwA` |
| 域名 | `tap.lazyfirst.com` |
| MongoDB数据库 | `tap_system` |

### SSH命令模板
```bash
sshpass -p 'tokzit-hejwig-6vapwA' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 "命令"
```

### MongoDB认证
- 用户名: `tapsystem`
- 密码: `tap_system_pass_2024`
- 连接: `mongodb://tapsystem:tap_system_pass_2024@150.109.183.29:27017/tap_system?authSource=tap_system`

---

## 三、部署流程

### 完整部署命令
```bash
# 1. GitHub拉取
git pull origin main

# 2. 本地构建
cd frontend && npm run build && cd ..

# 3. 同步代码（dist不要exclude！）
sshpass -p 'tokzit-hejwig-6vapwA' rsync -avz \
  --exclude 'node_modules' --exclude '.git' \
  /Users/mor/CodeBuddy/LazyFirst/ \
  ubuntu@150.109.183.29:/home/ubuntu/tap-system/

# 4. 重建并重启（必须加--no-cache）
sshpass -p 'tokzit-hejwig-6vapwA' ssh ubuntu@150.109.183.29 \
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

## 四、部署前自检清单

每次部署前必须确认：

- [ ] 读memory了吗？
- [ ] rsync有没有exclude错东西？（dist不能exclude）
- [ ] docker build有没有加--no-cache？
- [ ] 改的是前端还是后端？还是两个都要重建？

---

## 五、MongoDB 数据规范

### ObjectId 类型问题
- **导出问题**: mongosh导出后`_id`等字段变成字符串
- **后果**: 导入后`.populate()`失败 → **空白页**
- **解决**: 导入后必须执行ObjectId转换脚本

### productId 字段规范
| 字段 | 类型 | 用途 |
|------|------|------|
| `samplemanagements.productId` | String | 存TikTok商品ID，用于展示 |
| `Product.tiktokProductId` | String | 用于关联查询 |
| 新增样品时 | 前端传Product._id | 后端查tiktokProductId → 存productId |

### 查询兼容写法
```javascript
const query = {
  $or: [
    { productId: { $in: objectIdList } },
    { productId: { $in: stringList } }
  ]
};
```

### 数据迁移原则
- 修改数据模型时，**优先写迁移脚本**直接修改数据库
- **不要**在前端/后端做"兼容旧数据"的逻辑
- 迁移脚本放在 `server/migrate_xxx.js`
- 迁移后**删除所有兼容代码**

---

## 六、SSL证书位置

| 位置 | 路径 |
|------|------|
| 服务器 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内 | `/etc/nginx/ssl/` |

---

## 七、故障排查

### 空白页
```bash
# 检查_id类型
node -e "db.collection('users').findOne()"
# 如果是string而非[object Object]，需要修复ObjectId
```

### 网络不通
容器可能需要手动连接到正确网络：
```bash
docker network connect tap-system_default <container-name>
```

---

## 八、本地开发端口

- 后端: `http://localhost:3000`
- 前端: `http://localhost:5173`

---

## 九、项目配色

- 主色: `#775999`（紫色）

---

## 十、2026-04-09 事故记录

### 事故一：数据库导入覆盖
**原因**：导入旧备份数据覆盖了线上数据库
**后果**：
- samplemanagements 丢失 19010 条数据
- products 丢失 1006 条数据
- influencers 丢失 2255 条数据

### 事故二：部署时未备份代码
**原因**：同步代码前未备份线上代码，导致线上有但本地没有的改动丢失
**教训**：
- ✅ 每次部署前必须 `docker cp` 备份线上代码
- ✅ 同步方向必须确认：本地→GitHub→线上

### 通用教训
1. **任何操作线上环境前，必须先备份**
2. 备份位置：`~/backup_YYYYMMDD_HHMMSS/`
3. 命令：`sudo docker cp tap-backend:/app/server/. ~/backup_$(date +%Y%m%d_%H%M%S)/`
4. **严禁边想边做，必须先确认再执行**
