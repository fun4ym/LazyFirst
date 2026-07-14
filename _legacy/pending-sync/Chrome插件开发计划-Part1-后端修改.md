# Chrome 插件开发计划 - Part 1：后端修改

## 概述

本文档详细描述 LazyFirst 后端需要进行的修改，以支持 Chrome 插件的数据同步功能。

---

## 一、CORS 配置（必须）

### 1.1 问题描述

Chrome Extension 需要从 `chrome-extension://xxxxx` 源访问 LazyFirst API，但默认情况下浏览器会阻止跨域请求。

### 1.2 解决方案

创建 CORS 中间件，允许 Chrome Extension 访问。

### 1.3 实现步骤

#### 步骤 1：创建 CORS 中间件

**文件**：`server/middleware/cors.js`（新建）

```javascript
/**
 * CORS 中间件 - 支持 Chrome Extension
 * 
 * 允许以下源访问：
 * 1. Chrome Extension（动态匹配 chrome-extension://*）
 * 2. 本地开发环境（http://localhost:5175）
 * 3. 生产环境（从环境变量读取）
 */

const cors = (req, res, next) => {
  const origin = req.headers.origin;
  
  // 允许 Chrome Extension 访问（任何 chrome-extension:// 源）
  if (origin && origin.startsWith('chrome-extension://')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24小时
  }
  // 允许本地开发环境
  else if (origin && origin.includes('localhost')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  // 允许生产环境（从环境变量读取）
  else if (origin && process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // 处理预检请求（OPTIONS）
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

module.exports = cors;
```

#### 步骤 2：在 server.js 中应用 CORS 中间件

**文件**：`server/server.js`（修改）

**修改位置**：在 `app.use(express.json())` 之前添加

```javascript
// 引入 CORS 中间件
const cors = require('./middleware/cors');

// 应用 CORS 中间件（必须在 express.json() 之前）
app.use(cors);

// 原有的中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

#### 步骤 3：添加环境变量配置

**文件**：`.env`（修改）

```bash
# CORS 允许的源（逗号分隔）
ALLOWED_ORIGINS=https://lazyfirst.com,https://www.lazyfirst.com
```

#### 步骤 4：测试 CORS 配置

**测试方法**：

1. 启动后端服务：`cd server && npm run dev`
2. 使用 curl 测试预检请求：

```bash
curl -X OPTIONS \
  -H "Origin: chrome-extension://test-extension-id" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v http://localhost:3001/api/auth/login
```

**预期结果**：

- 返回 `HTTP/1.1 200 OK`
- 响应头包含 `Access-Control-Allow-Origin: chrome-extension://test-extension-id`

---

## 二、JWT Token 有效期优化（可选）

### 2.1 问题描述

当前 JWT Token 有效期为 7 天（`JWT_EXPIRE=7d`），用户需要频繁重新登录。

### 2.2 解决方案（方案 A：延长 Token 有效期）

修改 JWT 有效期为 30 天，减少用户重新登录的频率。

#### 步骤 1：修改 JWT 配置

**文件**：`server/utils/jwt.js`（修改）

```javascript
const jwt = require('jsonwebtoken');
const config = require('./config');

// 生成 Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE || '30d' } // 改为 30 天
  );
};

// 验证 Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    throw new Error('Token 无效或已过期');
  }
};

module.exports = { generateToken, verifyToken };
```

#### 步骤 2：修改环境变量

**文件**：`.env`（修改）

```bash
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=30d  # 改为 30 天
```

### 2.3 解决方案（方案 B：实现 Refresh Token 机制）

如果需要更安全的方案，可以实现 Refresh Token 机制。

#### 步骤 1：创建 RefreshToken 模型

**文件**：`server/models/RefreshToken.js`（新建）

```javascript
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 天后过期
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 自动删除过期的 Refresh Token
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
```

#### 步骤 2：修改登录接口返回 Refresh Token

**文件**：`server/routes/auth.js`（修改）

**修改位置**：`/login` 路由

```javascript
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

// 在登录成功后的 Token 生成部分
router.post('/login', async (req, res) => {
  // ... 原有的用户名密码验证逻辑 ...
  
  // 生成 Access Token
  const accessToken = generateToken(user._id);
  
  // 生成 Refresh Token
  const refreshTokenValue = crypto.randomBytes(40).toString('hex');
  
  // 存储 Refresh Token 到数据库
  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 天
  });
  
  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: { /* ... */ },
      accessToken,
      refreshToken: refreshTokenValue  // 新增
    }
  });
});
```

#### 步骤 3：新增 Refresh Token 接口

**文件**：`server/routes/auth.js`（修改）

**新增路由**：

```javascript
/**
 * @route   POST /api/auth/refresh
 * @desc    刷新 Access Token
 * @access  Public（需要 Refresh Token）
 */
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh Token 不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }
    
    const { refreshToken } = req.body;
    
    // 查找 Refresh Token
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      expiresAt: { $gt: new Date() }  // 未过期
    });
    
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh Token 无效或已过期'
      });
    }
    
    // 生成新的 Access Token
    const newAccessToken = generateToken(storedToken.userId);
    
    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        accessToken: newAccessToken
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token 刷新失败'
    });
  }
});
```

---

## 三、新增 API 端点（可选）

### 3.1 批量查询达人接口

**用途**：Chrome 插件批量检查多个达人是否存在于 LazyFirst

**文件**：`server/routes/influencer-managements.js`（修改）

**新增路由**：

```javascript
/**
 * @route   POST /api/influencers/batch-check
 * @desc    批量检查达人是否存在（根据 tiktokId）
 * @access  Private
 */
router.post('/batch-check', authenticate, async (req, res) => {
  try {
    const { tiktokIds } = req.body;
    
    if (!Array.isArray(tiktokIds) || tiktokIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'tiktokIds 必须是非空数组'
      });
    }
    
    // 查询存在的达人
    const existingInfluencers = await Influencer.find({
      companyId: req.companyId,
      tiktokId: { $in: tiktokIds }
    }).select('_id tiktokId tiktokName latestFollowers latestGmv');
    
    // 构建映射
    const existingMap = {};
    existingInfluencers.forEach(influencer => {
      existingMap[influencer.tiktokId] = influencer;
    });
    
    res.json({
      success: true,
      data: {
        existing: existingMap,
        notExisting: tiktokIds.filter(id => !existingMap[id])
      }
    });
    
  } catch (error) {
    console.error('Batch check error:', error);
    res.status(500).json({
      success: false,
      message: '批量检查失败'
    });
  }
});
```

### 3.2 快速更新达人指标接口

**用途**：Chrome 插件快速更新达人的最新指标（不需要创建维护记录）

**文件**：`server/routes/influencer-managements.js`（修改）

**新增路由**：

```javascript
/**
 * @route   PUT /api/influencers/:id/quick-update
 * @desc    快速更新达人指标（Chrome 插件专用）
 * @access  Private
 */
router.put('/:id/quick-update', authenticate, async (req, res) => {
  try {
    const { followers, gmv, monthlySalesCount, avgVideoViews } = req.body;
    
    const influencer = await Influencer.findById(req.params.id);
    
    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }
    
    // 检查权限（只能更新自己公司的达人）
    if (influencer.companyId.toString() !== req.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    // 更新指标
    if (followers !== undefined) influencer.latestFollowers = followers;
    if (gmv !== undefined) influencer.latestGmv = gmv;
    if (monthlySalesCount !== undefined) influencer.monthlySalesCount = monthlySalesCount;
    if (avgVideoViews !== undefined) influencer.avgVideoViews = avgVideoViews;
    
    influencer.latestMaintenanceTime = new Date();
    influencer.latestMaintainerId = req.user._id;
    influencer.latestMaintainerName = req.user.realName;
    
    await influencer.save();
    
    res.json({
      success: true,
      message: '更新成功',
      data: influencer
    });
    
  } catch (error) {
    console.error('Quick update error:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});
```

---

## 四、修改现有 API 响应格式

### 4.1 登录接口响应格式

**当前格式**：

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_id",
      "username": "bd_user",
      "realName": "BD用户",
      "phone": "13800138000",
      "email": "user@example.com",
      "company": {
        "_id": "company_id",
        "name": "LazyFirst Inc."
      },
      "role": {
        "_id": "role_id",
        "name": "bd"
      },
      "lastLoginAt": "2026-06-30T08:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Chrome 插件需要使用的字段**：

- `data.user.id` - 用户 ID（用于创建维护记录时的 `maintainerId`）
- `data.user.realName` - 用户真实姓名（用于 `maintainerName`）
- `data.user.company._id` - 公司 ID（用于 `companyId`）
- `data.token` - JWT Token（用于后续 API 调用）

**无需修改**：当前格式已满足需求。

---

## 五、测试计划

### 5.1 CORS 测试

**测试用例**：

| 测试用例 | 请求源 | 预期结果 |
|---------|---------|---------|
| 允许 Chrome Extension | `chrome-extension://xxxxx` | 200 OK + CORS 头 |
| 允许本地开发 | `http://localhost:5175` | 200 OK + CORS 头 |
| 允许生产环境 | `https://lazyfirst.com` | 200 OK + CORS 头 |
| 拒绝非法源 | `https://evil.com` | 200 OK + 无 CORS 头 |

### 5.2 API 测试

**测试用例**：

| 接口 | 方法 | 测试数据 | 预期结果 |
|------|------|---------|---------|
| `/api/auth/login` | POST | `{ username: "bd", password: "password123" }` | 返回 Token 和用户信息 |
| `/api/influencers` | GET | `?tiktokId=@testuser` | 返回达人列表 |
| `/api/influencers` | POST | `{ tiktokName: "Test", tiktokId: "@testuser" }` | 创建达人成功 |
| `/api/influencer-maintenances` | POST | `{ influencerId: "...", followers: 1000 }` | 创建维护记录成功 |

---

## 六、部署步骤

### 6.1 本地开发环境

1. 修改 `server/middleware/cors.js`（新建）
2. 修改 `server/server.js`（应用 CORS 中间件）
3. 修改 `.env`（添加 `ALLOWED_ORIGINS`，可选）
4. 重启后端服务：`cd server && npm run dev`

### 6.2 生产环境

1. 提交代码到 Git：`git add . && git commit -m "feat: 添加 CORS 支持 Chrome Extension"`
2. 部署到服务器（参考 `DEPLOYMENT.md`）
3. 重启后端服务：`docker compose restart backend`
4. 测试 API 访问

---

## 七、风险评估

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| CORS 配置错误导致所有跨域请求失败 | 高 | 低 | 在应用 CORS 中间件前先测试；保留回滚方案 |
| Refresh Token 机制引入新 Bug | 中 | 中 | 先在本地环境充分测试；可选功能，不强制实现 |
| JWT Token 有效期延长导致安全风险 | 低 | 低 | 使用 HTTPS；定期强制重新登录 |

---

**Part 1（后端修改）完成！**

**下一步**：Part 2（Chrome 插件开发）
