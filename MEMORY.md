# CodeBuddy Memory - LazyFirst/TAP项目关键经验

> **重要**：每次对话开始前必读！本文件包含项目核心知识和经验教训。
> Memory ID: 25807293

---

## 1. 项目基础配置

### 服务器信息
- IP: `150.109.183.29`
- 用户: `ubuntu`
- 密码: `tokzit-hejwig-6vapwA`
- 域名: `tap.lazyfirst.com`
- MongoDB数据库名: `tap_system`（注意不是tap！）

### SSH密钥认证
```bash
sshpass -p 'tokzit-hejwig-6vapwA' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 "命令"
```

### 部署流程（GitHub拉取→同步→重启）
```bash
# 1. 本地GitHub拉取最新代码
git pull origin main

# 2. 本地构建前端
cd frontend && npm run build

# 3. 同步到服务器（使用sshpass）
sshpass -p 'tokzit-hejwig-6vapwA' rsync -avz \
  --exclude 'node_modules' --exclude '.git' \
  /Users/mor/CodeBuddy/LazyFirst/ \
  ubuntu@150.109.183.29:/home/ubuntu/tap-system/

# 4. 服务器重启Docker
sshpass -p 'tokzit-hejwig-6vapwA' ssh -o StrictHostKeyChecking=no ubuntu@150.109.183.29 \
  "sudo docker stop tap-mongodb tap-backend tap-frontend 2>/dev/null; \
   sudo docker rm tap-mongodb tap-backend tap-frontend 2>/dev/null; \
   cd /home/ubuntu/tap-system && sudo docker compose up -d"

# 5. 验证服务状态
sshpass -p 'tokzit-hejwig-6vapwA' ssh ubuntu@150.109.183.29 "sudo docker ps --format 'table {{.Names}}\t{{.Status}}'"

# 6. 验证网站可访问
curl -s -o /dev/null -w "%{http_code}" https://tap.lazyfirst.com
```

### 数据库同步流程
mongosh导出 → docker cp复制 → mongorestore导入

### 本地服务端口
- 后端: `http://localhost:3000`
- 前端: `http://localhost:5173`

---

## 2. MongoDB备份与导入规范（必读！）

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
- 字符串用单引号 `'value'`（含单引号时用双引号）
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

### ObjectId类型不匹配问题
**问题**：不同表的同一字段类型可能不同
- `products._id` = ObjectId
- `samplemanagements.productId` = String

**解决**：查询时用`$or`同时匹配
```javascript
const query = {
  $or: [
    { productId: { $in: objectIdList } },
    { productId: { $in: stringList } }
  ]
};
```

### 空白页排查
```bash
node -e "db.collection('users').findOne()"
# 检查_id type: 如果是string而非[object Object]，需要修复
```

---

## 3. 重要操作原则

1. **先本地后服务器**：所有修改在本地测试，确认后再同步
2. **服务器操作需授权**：除非紧急情况，否则先询问主人
3. **重启服务后告知主人**：有权限自主重启前后端
4. **先读memory再行动**：每次对话开始先看本文件

---

## 4. 代码修改记录

### 商品图片功能
- 头图: `images` (String，单个链接)
- 图片集: `productImages` (Array，多个链接)
- 列表显示images，详情显示productImages

### public-samples API
- 路径: `/api/public/samples?s=识别码`
- productId字段类型兼容问题：需同时匹配ObjectId和String

---

## 5. 项目主色
- 主色: `#775999`（紫色）
- Element Plus默认蓝: `#409EFF`

---

## 6. 今日教训（2026-04-08）

### 今天犯的错误
1. **没先读memory就开始操作** → 被骂后才读
2. **rsync用了 `--exclude 'dist'`** → 前端构建文件没同步，网站UI没更新
3. **没加 `--no-cache`** → Docker用旧镜像，后端代码没更新
4. **混淆数据和UI** → 问"没数据是不是没这一列"，傻逼问题

### 正确部署流程（修正版）
```bash
# 1. GitHub拉取
git pull origin main

# 2. 本地构建
cd frontend && npm run build

# 3. 同步代码（dist不需要exclude，因为frontend/dist是空的源文件）
sshpass -p 'tokzit-hejwig-6vapwA' rsync -avz \
  --exclude 'node_modules' --exclude '.git' \
  /Users/mor/CodeBuddy/LazyFirst/ \
  ubuntu@150.109.183.29:/home/ubuntu/tap-system/

# 4. 单独同步dist（确保最新前端构建）
sshpass -p 'tokzit-hejwig-6vapwA' rsync -avz \
  /Users/mor/CodeBuddy/LazyFirst/frontend/dist/ \
  ubuntu@150.109.183.29:/home/ubuntu/tap-system/frontend/dist/

# 5. 重建并重启（必须加--no-cache）
sshpass -p 'tokzit-hejwig-6vapwA' ssh ubuntu@150.109.183.29 \
  "cd /home/ubuntu/tap-system && \
   sudo docker compose build --no-cache && \
   sudo docker compose up -d"

# 6. 验证
curl -s -o /dev/null -w "%{http_code}" https://tap.lazyfirst.com
```

### 怎么才能不忘记

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
