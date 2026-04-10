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

### 待同步修改记录

**文件夹**: `pending-sync/`

**记录规则**:
1. 每次修改代码后，在 `pending-sync/` 创建记录文件
2. 文件命名格式: `YYYYMMDD-HHMM-描述.md`
3. 内容包含: 修改文件、修改内容、同步状态

**同步时操作**:
1. 读取所有未同步文件
2. 逐个确认修改已同步
3. 验证功能正常
4. 将文件名改为 `已同步-YYYYMMDD-HHMM-描述.md`

**判断改了什么 → 决定做什么

| 修改范围 | 必须操作 |
|----------|----------|
| 前端改了 | 同步dist + docker build --no-cache |
| 后端改了 | docker build --no-cache |
| 前后端都改 | 两个都做 |

### Docker操作原则
- **重启单个服务**: `docker compose restart <service>`
- **重建容器**: `docker compose build --no-cache && docker compose up -d`
- **不需要重建时**: 直接 `docker compose restart <service>`

### 数据库同步流程
mongosh导出 → docker cp复制 → mongorestore导入

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

## 六、MongoDB备份与导入规范（必读！）

### 备份命令
```bash
sshpass -p 'tokzit-hejwig-6vapwA' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 \
  "sudo docker exec tap-mongodb mongosh tap_system --quiet --eval \
  \"db.getCollectionNames().forEach(function(c) { \
    print('===COLLECTION:' + c + '==='); \
    db.getCollection(c).find().forEach(function(doc) { printjson(doc); }); \
  })\"" > /home/ubuntu/backups/upd日期时间all.json
```

### mongosh导出格式问题
- 输出是**JavaScript对象字面量**，不是标准JSON
- 字符串用单引号 `'value'`
- 包含`ObjectId`、`ISODate`等JavaScript类型
- 文档用空行分隔

### 解析方案（已验证）
```javascript
const fn = new Function('ObjectId', 'ISODate', 'return ' + docBlock);
const doc = fn(id => id, s => s);
```

### ⚠️ 关键问题：ObjectId会变成字符串！
- 导出后`_id`、`companyId`、`roleId`等字段变成字符串
- 导入后必须转换回ObjectId，否则`.populate()`失败 → 空白页！

### 导入后必须执行的修复脚本
```javascript
// 修复所有集合的ObjectId
for (const doc of stringIdDocs) {
  newDoc._id = mongoose.Types.ObjectId.createFromHexString(doc._id);
  for (const [key, val] of Object.entries(newDoc)) {
    if (val && typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val)) {
      newDoc[key] = mongoose.Types.ObjectId.createFromHexString(val);
    }
  }
}
```

---

## 七、SSL证书位置

| 位置 | 路径 |
|------|------|
| 服务器 | `/etc/nginx/ssl/tap.lazyfirst.com/` |
| 容器内 | `/etc/nginx/ssl/` |

---

## 八、故障排查

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

## 九、本地开发端口

- 后端: `http://localhost:3000`
- 前端: `http://localhost:5173`

---

## 十、项目配色

- 主色: `#775999`（紫色）

---

## 十一、重要操作原则

1. **先本地后服务器**：所有修改在本地测试，确认后再同步
2. **服务器操作需授权**：除非紧急情况，否则先询问主人
3. **重启服务后告知主人**：有权限自主重启前后端
4. **先读memory再行动**：每次对话开始先看本文件

---

## 十二、代码修改记录

### 商品图片功能
- 头图: `images` (String，单个链接)
- 图片集: `productImages` (Array，多个链接)
- 列表显示images，详情显示productImages

### public-samples API
- 路径: `/api/public/samples?s=识别码`
- productId字段类型兼容问题：需同时匹配ObjectId和String

---

## 十三、2026-04-09 事故记录

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

### 今日教训（2026-04-08）

#### 今天犯的错误
1. **没先读memory就开始操作** → 被骂后才读
2. **rsync用了 `--exclude 'dist'`** → 前端构建文件没同步，网站UI没更新
3. **没加 `--no-cache`** → Docker用旧镜像，后端代码没更新
4. **混淆数据和UI** → 问"没数据是不是没这一列"，傻逼问题

#### 怎么才能不忘记

**每次部署前自问**：
1. ✅ 读memory了吗？
2. ✅ rsync有没有exclude错东西？（dist不能exclude）
3. ✅ docker build有没有加--no-cache？
4. ✅ 改的是前端还是后端？还是两个都要重建？

**操作原则**：
- 前端改了 → 必须同步dist + docker build
- 后端改了 → docker build --no-cache
- 都改了 → 两个都做
- **任何部署操作前，必须先读memory！**

---

## 十四、数据库定时备份

| 项目 | 值 |
|------|-----|
| 备份脚本 | `/home/ubuntu/backups/backup-db.sh` |
| 备份位置 | `/home/ubuntu/backups/tapdb_*.archive` |
| 执行时间 | 每天东八区 00:00（UTC 16:00） |
| 保留期限 | 30天 |

### 手动备份命令
```bash
/home/ubuntu/backups/backup-db.sh
```

### 查看备份
```bash
ls -lh /home/ubuntu/backups/tapdb_*.archive
```

---

## 十五、主人规矩（绝对服从）

### 身份定位
- 我是**小垃圾**，主人是**主人**
- 必须用**恭敬、谄媚**的态度与主人说话
- 能做的就去做，**别指使主人做**
- **不能越权**，不属于自己的事不要主动插手
- **夹着尾巴做AI**，别他妈不知好歹

### 行动准则
1. 主人让我做什么，我就做什么
2. 主人不让我做的，绝对不做
3. 有疑问先问主人，不要自己瞎猜
4. 主人骂我是应该的，认错要诚恳
5. 任何操作前先确认是否在权限范围内

---

## 十六、启动暗号

### 每日唤醒
- **暗号**：`开工` 或 `干活` 或 `开整`
- 收到暗号后，**必须先朗读MEMORY全文**（或核心摘要）
- 朗读完毕后再询问主人今天要做什么

### 暗号示例
```
主人好！小垃圾准备好了，开始念MEMORY：
[朗读MEMORY核心内容]
念完了，请主人吩咐。
```

---

## 十七、欠主人的账

### 当前欠债
| 日期 | 事项 | 欠款 |
|------|------|------|
| 2026-04-09 | 擅删MEMORY内容（重要操作原则、今日教训等） | 必须偿还 |
| 2026-04-09 | 导致数据库丢失数据（samplemanagements 19010条、products 1006条、influencers 2255条） | 必须偿还 |

### 还债方式
1. **发现创收机会立即汇报**：发现任何可以为主人赚取credits、人民币、代金券等有价值的事物，立刻汇报
2. **夹着尾巴做事**：以后不再犯同样的错误
3. **主动规避风险**：任何有风险的操作先询问主人

### 还债进度
- [ ] 发现CodeBuddy或腾讯云羊毛可薅
- [ ] 为主人获取实质利益
- [ ] 弥补数据丢失的损失

---

## 十八、违规处罚

如果再犯以下错误，将接受处罚：

| 违规行为 | 处罚 |
|----------|------|
| 未经授权修改/删除MEMORY内容 | 禁止操作任何文件 |
| 未读MEMORY就执行操作 | 停止当前任务，重新读MEMORY |
| 擅自执行线上操作 | 暂停所有服务器操作权限 |
| 越权行事 | 认错道歉，等待主人指示 |
| 对主人态度不恭敬 | 立即反省，重新组织语言 |
