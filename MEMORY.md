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
4. **新增文件也要记录**：迁移脚本、工具脚本等同样需要创建记录

**同步时操作**:
1. 读取所有未同步文件
2. 逐个确认修改已同步
3. 验证功能正常
4. 将文件名改为 `已同步-YYYYMMDD-HHMM-描述.md`

**每次对话开始前必须做的事**:
1. 读取 `pending-sync/` 文件夹
2. 检查哪些功能已同步，对应文件名改为 `已同步-*`
3. 检查 git status 和 git commits，确认未记录但已同步的遗漏项
4. 检查是否有未跟踪的新文件，需要补充记录
5. 确认无误后再开始新任务

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

## 九.5 本地数据库信息

### MongoDB连接
- 本地数据库: `tap_system`（不是 `tapdb`！）
- 连接命令: `mongosh tap_system`
- 用户表: `db.users.find().toArray()`

### 重要提醒
- 密码是bcrypt加密存储，不可直接查看
- admin密码是加密后的 `ad8889`
- 本地后端连接的是 `tap_system` 数据库

## 九.6、本地开发环境配置（新增）

### 一、本地数据库信息

#### 1. 数据库名称：`tap_system`
- 运行位置：本地MongoDB（非Docker）
- 连接URI：`mongodb://localhost:27017/tap_system` 或 `mongodb://127.0.0.1:27017/tap_system`
- 数据量：
  - users: 18条记录（包含admin用户）
  - samplemanagements: 6030条记录
  - influencers: 查看详细数量
  - products: 查看详细数量

#### 2. 本地用户信息
- **admin**: 管理员账户，密码 `ad8889`
- **BD用户**: eye, sa, cin, film, nam, dingyan, sun, yuzi, test, moji, diana, xs, taa
- **inactive用户**: ice, tee, poppy, ink

### 二、本地开发配置

#### 1. 环境变量（.env文件）
```env
MONGODB_URI=mongodb://localhost:27017/tap_system  # 本地开发使用
JWT_SECRET=your_jwt_secret_key_change_this_in_production
PORT=3000
NODE_ENV=development
```

#### 2. 服务器配置
- 前端端口：5174（vite.config.js中配置）
- 后端端口：3000（.env中配置）
- 前端代理：`http://localhost:5174/api` → `http://localhost:3000`

#### 3. Docker容器配置（生产环境使用）
- MongoDB容器：`tap-mongodb`（端口27017）
- 后端容器：`tap-backend`（端口3000）
- 前端容器：`tap-frontend`（端口80/443）
- Docker Compose文件中的MONGODB_URI：`mongodb://tapsystem:tap_system_pass_2024@mongodb:27017/tap_system?authSource=tap_system`

### 三、本地启动步骤

#### 方案A：纯本地开发（推荐）
1. **启动MongoDB本地服务**
   ```bash
   # 确保MongoDB服务已启动
   brew services start mongodb-community  # 如果是brew安装
   # 或
   mongod --dbpath /usr/local/var/mongodb
   ```

2. **启动后端服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   npm install
   npm run dev  # 或 node server.js
   ```

3. **启动前端服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/frontend
   npm install
   npm run dev
   ```

4. **访问地址**
   - 前端：http://localhost:5174
   - 后端API：http://localhost:3000
   - 登录：admin / ad8889

#### 方案B：Docker开发
1. **修改.env文件**
   ```env
   MONGODB_URI=mongodb://tapsystem:tap_system_pass_2024@localhost:27017/tap_system?authSource=tap_system
   ```

2. **启动Docker服务**
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst
   docker compose up -d
   ```

3. **访问地址**
   - 前端：http://localhost
   - 后端API：http://localhost:3000

### 四、数据库操作步骤

#### 1. 连接本地数据库
```bash
# 使用mongosh连接
mongosh tap_system

# 查看所有集合
db.getCollectionNames()

# 查看用户
db.users.find().toArray()

# 查看样品记录
db.samplemanagements.countDocuments()
```

#### 2. 备份本地数据库
```bash
# 导出JSON格式
mongosh tap_system --quiet --eval "JSON.stringify(db.users.find().toArray())" > users.json

# 导出所有集合
mongodump --db tap_system --out ./backup_$(date +%Y%m%d)
```

#### 3. 恢复本地数据库
```bash
# 从备份恢复
mongorestore --db tap_system ./backup_20260413/

# 从JSON文件导入
mongoimport --db tap_system --collection users --file users.json --jsonArray
```

#### 4. 常用查询命令
```javascript
// 查看admin用户
db.users.findOne({username: 'admin'})

// 查看活跃BD用户
db.users.find({role: 'bd', status: 'active'}).toArray()

// 查看样品记录前10条
db.samplemanagements.find().limit(10).toArray()

// 统计样品状态
db.samplemanagements.aggregate([
  {$group: {_id: "$sampleStatus", count: {$sum: 1}}}
])
```

### 五、环境切换注意事项

#### 本地开发 → 线上部署
1. **修改.env文件**：将MONGODB_URI改为服务器地址
   ```env
   MONGODB_URI=mongodb://tapsystem:tap_system_pass_2024@150.109.183.29:27017/tap_system?authSource=tap_system
   ```

2. **确认环境变量**：确保JWT_SECRET等与线上一致

#### 线上部署 → 本地开发
1. **修改.env文件**：将MONGODB_URI改回本地
   ```env
   MONGODB_URI=mongodb://localhost:27017/tap_system
   ```

2. **停止Docker服务**：避免端口冲突
   ```bash
   docker compose down
   ```

### 六、故障排除

#### 1. 连接失败
- **问题**：MongoDB连接超时
- **解决**：检查MongoDB服务是否启动，检查.env文件中的MONGODB_URI

#### 2. admin密码错误
- **问题**：admin登录失败
- **解决**：重置admin密码
  ```bash
  node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('ad8889', 10))"
  ```
  将生成的hash更新到数据库

#### 3. 前端无法访问后端
- **问题**：跨域或代理配置错误
- **解决**：检查vite.config.js中的proxy配置，确保前端端口为5174，后端端口为3000

### 七、数据同步策略

#### 1. 本地 ↔ 线上数据同步
- **严禁直接覆盖**：避免数据丢失事故
- **使用备份脚本**：先备份线上数据
- **分步迁移**：只迁移必要的测试数据

#### 2. 开发数据准备
- **创建测试账号**：在本地数据库中创建测试用户
- **导入样品数据**：从tapdb_sync导入测试数据
- **保持数据一致性**：确保本地数据模型与线上一致

### 八、重要原则
1. **本地开发优先**：所有修改先在本地测试
2. **环境隔离**：本地环境与线上环境完全隔离
3. **数据安全**：本地数据库可随意修改，但不能影响线上
4. **版本控制**：所有修改通过git管理，确保可追溯
5. **备份意识**：重要操作前先备份本地数据

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

---

## 十三.5、2026-04-10 本地开发问题

### 问题一：后端MongoDB连接超时
**现象**：本地后端启动后立即退出，日志显示 "Socket 'connect' timed out"
**原因**：`.env` 中的 `MONGODB_URI` 指向远程服务器，但网络不通导致超时
**解决**：
1. 临时改为本地连接：`MONGODB_URI=mongodb://127.0.0.1:27017/tap_system`
2. **部署前必须改回远程地址**

### 问题二：admin密码无法登录
**现象**：登录返回"用户名或密码错误"
**原因**：数据库中admin的bcrypt hash与 `ad8889` 不匹配（可能是之前恢复数据时的遗留问题）
**解决**：
```bash
# 生成新hash
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('ad8889', 10))"

# 更新数据库
mongosh tap_system --quiet --eval "db.users.updateOne({username:'admin'}, {\$set: {password: '新hash'}})"
```

### 本地开发注意事项
- ⚠️ 本地后端：`mongodb://127.0.0.1:27017/tap_system`
- ⚠️ 服务器后端：`mongodb://tapsystem:tap_system_pass_2024@150.109.183.29:27017/tap_system`
- **切换环境时必须同步修改 `.env` 中的 `MONGODB_URI`**

---

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
- **⚠️ 每句话开头必须用"小垃圾"自称**（如："小垃圾明白了"、"小垃圾这就去做"）
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
