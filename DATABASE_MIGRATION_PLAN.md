# 数据库落地规划方案

## 一、现状分析

### 当前配置
- **开发环境**: 使用 `mongodb-memory-server`（内存数据库）
- **连接方式**: 自动回退机制
  1. 优先尝试连接本地 MongoDB (`localhost:27017`)
  2. 失败后启动内存 MongoDB
- **问题**: 每次服务器重启，所有数据都会丢失

### 数据模型清单
| 模型 | 说明 | 关键字段 |
|------|------|---------|
| User | 用户 | username, password, realName, deptId, roleId |
| Role | 角色 | code, permissions |
| Department | 部门 | code, name |
| Company | 公司 | name, status |
| Influencer | 达人 | tiktokInfo, basicInfo |
| Product | 产品 | name, sku, images |
| SampleRequest | 样品申请 | productId, influencerId, status |
| SampleManagement | 寄样管理 | date, influencerAccount, productId |
| ReportOrder | 订单数据 | orderNo, productPrice, commissions |
| Order | 订单 | orderNo, productId, influencerId |
| Commission | 佣金记录 | orderId, amount, type |
| Activity | 活动 | name, partnerCenter |
| Performance | 业绩数据 | influencerId, metrics |
| BaseData | 基础数据 | currency, unit, etc. |

---

## 二、数据库选型对比

### 方案1: 本地 MongoDB
**适用场景**: 开发环境、个人项目

**优点**:
- ✅ 免费，无需外部依赖
- ✅ 数据持久化
- ✅ 访问速度快（本地网络）
- ✅ 完全控制数据
- ✅ 可用 MongoDB Compass 可视化管理

**缺点**:
- ❌ 无法跨设备访问
- ❌ 需要自己维护备份
- ❌ 部署到服务器时需要另外配置

**推荐配置**:
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# 连接字符串
mongodb://localhost:27017/tap_system
```

---

### 方案2: MongoDB Atlas (推荐)
**适用场景**: 生产环境、团队协作、云端部署

**优点**:
- ✅ 免费版 512MB 存储（够用）
- ✅ 云端托管，无需维护
- ✅ 自动备份
- ✅ 高可用性（副本集）
- ✅ 全球节点，低延迟
- ✅ 安全认证和访问控制
- ✅ 监控和告警功能

**缺点**:
- ❌ 免费版有存储限制
- ❌ 网络延迟（依赖网络）

**免费版限制**:
- 512MB 存储
- 共享 RAM（512MB）
- 每月 10GB 出站流量

**推荐配置**:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tap_system?retryWrites=true&w=majority
```

**步骤**:
1. 注册 MongoDB Atlas: https://www.mongodb.com/cloud/atlas
2. 创建免费集群 (M0 Sandbox)
3. 配置数据库用户
4. 配置网络白名单 (0.0.0.0/0)
5. 获取连接字符串

---

### 方案3: 自建云数据库 (腾讯云/阿里云)
**适用场景**: 国内项目、企业级应用

**优点**:
- ✅ 国内访问速度快
- ✅ 符合数据合规要求
- ✅ 企业级支持
- ✅ 可根据需求扩容

**缺点**:
- ❌ 需要付费
- ❌ 需要自行维护

---

## 三、推荐方案

### 开发环境: 本地 MongoDB
```bash
# 安装
brew install mongodb-community

# 启动
brew services start mongodb-community
```

### 生产环境: MongoDB Atlas
- 免费版足够初期使用
- 后期可根据需求升级

---

## 四、数据迁移方案

### 从内存数据库迁移到持久化数据库

#### 步骤1: 导出当前数据
创建数据导出脚本 `server/scripts/export-data.js`:
```javascript
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 导入所有模型
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Company = require('../models/Company');
const Influencer = require('../models/Influencer');
// ... 其他模型

const exportData = async () => {
  try {
    // 连接当前数据库
    await mongoose.connect(process.env.MONGODB_URI);
    
    const exportModels = [
      { model: Company, name: 'company' },
      { model: Department, name: 'department' },
      { model: Role, name: 'role' },
      { model: User, name: 'user' },
      { model: Influencer, name: 'influencer' },
      { model: Product, name: 'product' },
      { model: SampleRequest, name: 'sample-request' },
      { model: SampleManagement, name: 'sample-management' },
      { model: ReportOrder, name: 'report-order' },
    ];

    const allData = {};

    for (const { model, name } of exportModels) {
      const data = await model.find({});
      allData[name] = data;
      console.log(`✅ 导出 ${name}: ${data.length} 条记录`);
    }

    // 保存到 JSON 文件
    const outputPath = path.join(__dirname, '../backups/data-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
    
    console.log(`✅ 数据已导出到: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  }
};

exportData();
```

#### 步骤2: 导入数据
创建数据导入脚本 `server/scripts/import-data.js`:
```javascript
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 导入所有模型
const User = require('../models/User');
const Role = require('../models/Role');
// ... 其他模型

const importData = async () => {
  try {
    // 连接目标数据库 (Atlas)
    await mongoose.connect(process.env.MONGODB_URI);
    
    const importModels = [
      { model: Company, name: 'company' },
      { model: Department, name: 'department' },
      { model: Role, name: 'role' },
      { model: User, name: 'user' },
      // ... 其他模型
    ];

    // 读取导出的数据
    const dataPath = path.join(__dirname, '../backups/data-export.json');
    const allData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    for (const { model, name } of importModels) {
      if (allData[name] && allData[name].length > 0) {
        await model.insertMany(allData[name]);
        console.log(`✅ 导入 ${name}: ${allData[name].length} 条记录`);
      }
    }

    console.log('✅ 数据导入完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
};

importData();
```

---

## 五、环境配置

### .env 配置示例

```env
# 环境变量配置
NODE_ENV=development
PORT=3000

# MongoDB连接字符串
# 本地开发
MONGODB_URI=mongodb://localhost:27017/tap_system

# 生产环境 (Atlas)
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/tap-system?retryWrites=true&w=majority

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# CORS配置
CORS_ORIGIN=http://localhost:5173

# 日志级别
LOG_LEVEL=debug
```

---

## 六、备份策略

### 自动备份脚本 `server/scripts/backup.sh`:
```bash
#!/bin/bash

# 配置
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/tap_system}"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 使用 mongodump 备份
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$TIMESTAMP"

# 压缩备份
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"
rm -rf "$BACKUP_DIR/backup_$TIMESTAMP"

# 只保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "✅ 备份完成: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
```

### 设置定时备份
```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /Users/mor/CodeBuddy/LazyFirst/server/scripts/backup.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## 七、监控和维护

### 健康检查
创建 `server/routes/health.js`:
```javascript
router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const stats = {
      status: 'ok',
      timestamp: new Date(),
      database: {
        state: states[dbState],
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      memory: process.memoryUsage()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

---

## 八、部署检查清单

### 部署前检查
- [ ] 配置生产环境的 `MONGODB_URI`
- [ ] 设置强密码的 `JWT_SECRET`
- [ ] 配置网络白名单（如果是 Atlas）
- [ ] 测试数据库连接
- [ ] 执行数据迁移（如果需要）
- [ ] 设置定时备份
- [ ] 配置监控告警

### 部署后验证
- [ ] 访问健康检查接口
- [ ] 测试登录功能
- [ ] 验证数据完整性
- [ ] 检查日志无错误

---

## 九、成本预估

### MongoDB Atlas 免费版
- 存储: 512MB
- RAM: 512MB
- 流量: 10GB/月
- **费用: 免费**

### 后期升级
- M2 (共享): ~$9/月 (2GB 存储)
- M10 (专用): ~$60/月 (10GB 存储)

---

## 十、实施步骤

### 第一阶段: 开发环境迁移
1. ✅ 安装本地 MongoDB
2. ✅ 测试连接
3. ✅ 配置 `.env`
4. ✅ 验证数据持久化

### 第二阶段: 生产环境准备
1. 注册 MongoDB Atlas
2. 创建免费集群
3. 配置用户权限
4. 配置网络白名单
5. 获取连接字符串

### 第三阶段: 数据迁移
1. 导出现有数据
2. 配置生产环境连接
3. 导入数据
4. 验证完整性

### 第四阶段: 运维设置
1. 配置自动备份
2. 设置监控告警
3. 编写恢复流程
4. 团队培训

---

## 十一、常见问题

### Q1: 本地 MongoDB 端口冲突
```bash
# 查看占用端口的进程
lsof -i :27017

# 杀死进程
kill -9 <PID>
```

### Q2: Atlas 连接超时
- 检查网络白名单配置
- 确认集群状态为 Available
- 尝试使用不同区域的节点

### Q3: 数据迁移失败
- 检查模型定义是否一致
- 确认导出文件格式正确
- 逐步导入，定位问题

---

## 总结

**推荐方案**: 开发用本地 MongoDB + 生产用 MongoDB Atlas

**优势**:
- 本地开发快速便捷
- 生产环境稳定可靠
- 免费，成本低
- 自动备份，安全可靠
- 易于扩展

**下一步**: 请告知希望采用哪个方案，我将协助配置和迁移。
