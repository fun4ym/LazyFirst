# Chrome 插件开发计划 - Part 3：集成测试与优化

## 概述

本文档详细描述集成测试、性能优化和用户体验优化的步骤。

---

## 一、集成测试

### 1.1 测试环境搭建

**步骤**：

1. **启动 LazyFirst 后端**（本地开发环境）
   ```bash
   cd /Users/mor/CodeBuddy/LazyFirst/server
   npm run dev
   ```
   - 后端地址：http://localhost:3001
   - 确保 CORS 中间件已启用

2. **配置插件 API 地址**
   - 右键点击插件图标 → "选项"
   - API 地址填写：http://localhost:3001/api
   - 保存设置

3. **加载插件到 Chrome**
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `tiktok-extension/` 目录

4. **登录插件**
   - 点击插件图标
   - 输入用户名/密码（使用 LazyFirst 测试账号）
   - 点击"登录"

### 1.2 测试用例

#### 测试用例 1：登录功能

| 测试项 | 操作步骤 | 预期结果 |
|--------|---------|---------|
| 登录成功 | 输入正确的用户名/密码 | 显示主界面，显示用户名和公司名 |
| 登录失败（用户名错误） | 输入错误的用户名 | 显示错误提示："用户名或密码错误" |
| 登录失败（密码错误） | 输入错误的密码 | 显示错误提示："用户名或密码错误" |
| 登录失败（API 地址错误） | 输入错误的 API 地址 | 显示错误提示："网络错误，请检查 API 地址" |
| 退出登录 | 点击"退出登录"按钮 | 返回登录界面 |

#### 测试用例 2：搜索页数据采集

| 测试项 | 操作步骤 | 预期结果 |
|--------|---------|---------|
| 显示"导入"按钮 | 访问 https://www.tiktok.com/search?q=test | 每个视频卡片上显示"导入到 LazyFirst"按钮 |
| 导入成功（新达人） | 点击"导入"按钮 | 显示"已创建达人并添加维护记录" |
| 导入成功（已有达人） | 再次点击"导入"按钮 | 显示"已更新维护记录" |
| 导入失败（未登录） | 退出登录后点击"导入" | 显示"导入失败：未登录" |

#### 测试用例 3：达人主页数据采集

| 测试项 | 操作步骤 | 预期结果 |
|--------|---------|---------|
| 显示历史数据 | 访问达人主页（已导入的达人） | 页面上显示 LazyFirst 历史数据 |
| 显示"导入"按钮 | 访问达人主页（未导入的达人） | 页面上显示"导入到 LazyFirst"按钮 |
| 导入成功 | 点击"导入"按钮 | 显示"导入成功"，刷新页面后显示历史数据 |

#### 测试用例 4：数据准确性

| 测试项 | 操作步骤 | 预期结果 |
|--------|---------|---------|
| 粉丝数准确 | 导入达人后查看 LazyFirst 后端 | `latestFollowers` 字段与 TikTok 页面一致 |
| 达人名称准确 | 导入达人后查看 LazyFirst 后端 | `tiktokName` 字段与 TikTok 页面一致 |
| TikTok ID 准确 | 导入达人后查看 LazyFirst 后端 | `tiktokId` 字段为 `@username` 格式 |

---

## 二、性能优化

### 2.1 减少 API 调用次数

**问题**：每次浏览都调用 API 会导致频率过高

**解决方案**：使用本地缓存

#### 实现步骤

**1. 修改 Background Service Worker**

**文件**：`tiktok-extension/background/background.js`

**修改内容**：在 `importInfluencer` 函数中添加缓存逻辑

```javascript
// 缓存已查询的达人（避免重复 API 调用）
const influencerCache = new Map();

async function importInfluencer(authorData) {
  try {
    // 1. 检查缓存
    if (influencerCache.has(authorData.tiktokId)) {
      console.log('[Background] 使用缓存：', authorData.tiktokId);
      const cached = influencerCache.get(authorData.tiktokId);
      
      // 添加维护记录
      await addMaintenanceRecord(cached._id, authorData);
      
      return {
        success: true,
        message: '已更新维护记录（缓存）',
        influencerId: cached._id,
        isNew: false
      };
    }
    
    // 2. 查询 API
    const checkResult = await callAPI(`/influencers?tiktokId=${encodeURIComponent(authorData.tiktokId)}`);
    
    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      const existingInfluencer = checkResult.data[0];
      
      // 存入缓存
      influencerCache.set(authorData.tiktokId, existingInfluencer);
      
      // 添加维护记录
      await addMaintenanceRecord(existingInfluencer._id, authorData);
      
      return {
        success: true,
        message: '已更新维护记录',
        influencerId: existingInfluencer._id,
        isNew: false
      };
    } else {
      // 创建新达人
      // ...（原有逻辑）
      
      // 存入缓存
      influencerCache.set(authorData.tiktokId, createResult.data);
      
      return {
        success: true,
        message: '已创建达人并添加维护记录',
        influencerId: createResult.data._id,
        isNew: true
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
```

**2. 定期清理缓存**

```javascript
// 每小时清理一次缓存（避免内存泄漏）
setInterval(() => {
  influencerCache.clear();
  console.log('[Background] 缓存已清理');
}, 60 * 60 * 1000);
```

### 2.2 批量导入优化

**问题**：搜索页有多个视频，逐个导入效率低

**解决方案**：实现批量导入功能

#### 实现步骤

**1. 修改 Content Script（搜索页）**

**文件**：`tiktok-extension/content/content.js`

**修改内容**：添加"批量导入"按钮

```javascript
// 在 SearchPage 类中添加
showBatchImportButton() {
  // 创建批量导入按钮
  const batchBtn = document.createElement('button');
  batchBtn.id = 'lf-batch-import-btn';
  batchBtn.textContent = '批量导入到 LazyFirst';
  batchBtn.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 99999;
    background: #775999;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  document.body.appendChild(batchBtn);
  
  // 绑定点击事件
  batchBtn.addEventListener('click', async () => {
    batchBtn.textContent = '导入中...';
    batchBtn.disabled = true;
    
    // 收集所有达人数据
    const videoCards = document.querySelectorAll('[data-e2e="video-card"]');
    const authors = new Set();
    
    videoCards.forEach(card => {
      const username = card.querySelector('[data-e2e="video-author-uniqueid"]')?.textContent?.replace('@', '');
      const nickname = card.querySelector('[data-e2e="video-author-nickname"]')?.textContent;
      
      if (username) {
        authors.add(JSON.stringify({
          tiktokId: '@' + username,
          tiktokName: nickname
        }));
      }
    });
    
    // 批量导入
    const authorList = Array.from(authors).map(a => JSON.parse(a));
    let successCount = 0;
    
    for (const author of authorList) {
      const result = await sendToBackground('IMPORT_INFLUENCER', author);
      if (result.success) successCount++;
    }
    
    alert(`批量导入完成！成功导入 ${successCount} 个达人`);
    
    batchBtn.textContent = '批量导入到 LazyFirst';
    batchBtn.disabled = false;
  });
}
```

**2. 在 `init()` 方法中调用**

```javascript
init() {
  console.log('[SearchPage] 初始化搜索页');
  
  // 显示批量导入按钮
  this.showBatchImportButton();
  
  // 监听页面变化
  this.observePageChanges();
  
  // 解析当前页面
  this.parseSearchResults();
}
```

---

## 三、用户体验优化

### 3.1 添加通知功能

**功能**：导入成功后显示桌面通知

#### 实现步骤

**1. 修改 manifest.json**

**文件**：`tiktok-extension/manifest.json`

**修改内容**：添加 `notifications` 权限

```json
{
  "permissions": [
    "storage",
    "alarms",
    "notifications"  // 新增
  ]
}
```

**2. 修改 Background Service Worker**

**文件**：`tiktok-extension/background/background.js`

**修改内容**：在 `importInfluencer` 函数中添加通知

```javascript
async function importInfluencer(authorData) {
  try {
    // ...（原有逻辑）
    
    // 显示通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon-48.png',
      title: 'LazyFirst',
      message: result.message
    });
    
    return result;
  } catch (error) {
    // 显示错误通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icons/icon-48.png',
      title: 'LazyFirst - 错误',
      message: error.message
    });
    
    return {
      success: false,
      message: error.message
    };
  }
}
```

### 3.2 添加同步统计

**功能**：记录每日同步数量，在 Popup 中显示

#### 实现步骤

**1. 修改 Background Service Worker**

**文件**：`tiktok-extension/background/background.js`

**修改内容**：在 `importInfluencer` 函数中更新统计

```javascript
async function importInfluencer(authorData) {
  try {
    // ...（原有逻辑）
    
    // 更新同步统计
    await updateSyncStats();
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

async function updateSyncStats() {
  const { todaySyncCount, todaySyncDate } = await getStorage(['todaySyncCount', 'todaySyncDate']);
  const today = new Date().toDateString();
  
  if (todaySyncDate !== today) {
    // 新的一天，重置计数
    await setStorage({
      todaySyncCount: 1,
      todaySyncDate: today
    });
  } else {
    // 同一天，增加计数
    await setStorage({
      todaySyncCount: (todaySyncCount || 0) + 1,
      todaySyncDate: today
    });
  }
}
```

**2. 修改 Popup**

**文件**：`tiktok-extension/popup/popup.js`

**修改内容**：显示同步统计

```javascript
async function showMainView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
  
  // 填充用户信息
  const { user, todaySyncCount, todaySyncDate } = await getStorage(['user', 'todaySyncCount', 'todaySyncDate']);
  
  if (user) {
    document.getElementById('user-name').textContent = user.realName || user.username;
    document.getElementById('company-name').textContent = user.company?.name || '-';
  }
  
  // 显示今日同步数量
  const today = new Date().toDateString();
  if (todaySyncDate === today) {
    document.getElementById('today-sync-count').textContent = todaySyncCount || 0;
  } else {
    document.getElementById('today-sync-count').textContent = 0;
  }
}
```

---

## 四、错误处理与重试机制

### 4.1 API 调用失败处理

**问题**：网络不稳定或 API 服务不可用

**解决方案**：添加重试机制

#### 实现步骤

**1. 修改 API 调用函数**

**文件**：`tiktok-extension/background/background.js`

**修改内容**：在 `callAPI` 函数中添加重试逻辑

```javascript
async function callAPI(endpoint, options = {}, retryCount = 0) {
  const maxRetries = 3;
  
  try {
    const { apiUrl, accessToken } = await getStorage(['apiUrl', 'accessToken']);
    
    if (!apiUrl || !accessToken) {
      throw new Error('未登录');
    }
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // 如果是 401 错误，可能是 Token 过期
      if (response.status === 401 && retryCount < maxRetries) {
        console.log('[Background] Token 可能已过期，尝试重新登录...');
        // 这里可以实现自动重新登录的逻辑
        throw new Error('Token 已过期，请重新登录');
      }
      
      throw new Error(data.message || 'API 调用失败');
    }
    
    return data;
  } catch (error) {
    // 网络错误，重试
    if (retryCount < maxRetries && error.message.includes('fetch')) {
      console.log(`[Background] API 调用失败，重试 ${retryCount + 1}/${maxRetries}...`);
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 指数退避
      
      return callAPI(endpoint, options, retryCount + 1);
    }
    
    throw error;
  }
}
```

### 4.2 DOM 解析失败处理

**问题**：TikTok 页面改版导致选择器失效

**解决方案**：添加多个备用选择器

#### 实现步骤

**1. 修改 Content Script**

**文件**：`tiktok-extension/content/content.js`

**修改内容**：使用多个选择器

```javascript
parseVideoCard(card) {
  // 多个备用选择器
  const usernameSelectors = [
    '[data-e2e="video-author-uniqueid"]',
    '.video-author-uniqueid',
    '[class*="author"]',
    '[class*="uniqueid"]'
  ];
  
  let username = null;
  for (const selector of usernameSelectors) {
    const elem = card.querySelector(selector);
    if (elem && elem.textContent) {
      username = elem.textContent.replace('@', '');
      break;
    }
  }
  
  const nicknameSelectors = [
    '[data-e2e="video-author-nickname"]',
    '.video-author-nickname',
    '[class*="nickname"]'
  ];
  
  let nickname = null;
  for (const selector of nicknameSelectors) {
    const elem = card.querySelector(selector);
    if (elem && elem.textContent) {
      nickname = elem.textContent;
      break;
    }
  }
  
  return {
    videoId: card.querySelector('a')?.href?.split('/')?.pop(),
    author: {
      username: username,
      nickname: nickname
    }
  };
}
```

---

## 五、文档编写

### 5.1 用户手册

**文件**：`tiktok-extension/README.md`

**内容大纲**：

```markdown
# LazyFirst TikTok Collector - 用户手册

## 一、安装指南

### 1.1 从 Chrome Web Store 安装（推荐）
1. 访问 [Chrome Web Store 链接]
2. 点击"添加至 Chrome"
3. 确认安装

### 1.2 手动安装（开发者模式）
1. 下载插件文件
2. 打开 Chrome 浏览器
3. 访问 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择插件目录

## 二、使用指南

### 2.1 首次登录
1. 点击浏览器右上角的插件图标
2. 输入 LazyFirst 用户名和密码
3. 输入 API 地址（如：https://lazyfirst.com/api）
4. 点击"登录"

### 2.2 浏览 TikTok
- 访问 TikTok 搜索页 → 视频卡片上显示"导入"按钮
- 访问达人主页 → 显示 LazyFirst 历史数据

### 2.3 导入达人
- 点击"导入到 LazyFirst"按钮
- 等待导入成功提示
- 查看 LazyFirst 后端确认数据

## 三、设置说明

### 3.1 API 配置
- API 地址：LazyFirst 后端地址

### 3.2 同步设置
- 自动同步：开启后自动保存达人数据
- 同步间隔：设置自动同步的频率

### 3.3 数据显示
- 显示覆盖层：在 TikTok 页面上显示历史数据
- 显示标签：显示 GMV/FV 标签

## 四、常见问题

### 4.1 登录失败
- 检查用户名和密码是否正确
- 检查 API 地址是否正确
- 检查网络连接

### 4.2 导入失败
- 检查是否已登录
- 检查 LazyFirst 后端是否正常运行
- 查看浏览器控制台错误信息

## 五、联系支持

- 邮箱：support@lazyfirst.com
- 电话：+86 400-xxx-xxxx
```

### 5.2 开发者文档

**文件**：`tiktok-extension/DEV.md`

**内容大纲**：

```markdown
# LazyFirst TikTok Collector - 开发者文档

## 一、项目结构

（参考 Part 2）

## 二、开发指南

### 2.1 环境要求
- Chrome 浏览器（最新版）
- Node.js 16+（可选，用于构建）

### 2.2 本地开发
1. 修改代码
2. 访问 `chrome://extensions/`
3. 找到插件，点击"刷新"图标
4. 测试功能

### 2.3 调试
- Content Script：F12 开发者工具
- Background Service Worker：`chrome://extensions/` → "Service Worker"

## 三、API 文档

（参考 Part 1）

## 四、构建与发布

### 4.1 打包插件
1. 访问 `chrome://extensions/`
2. 点击"打包扩展程序"
3. 选择插件目录
4. 生成 `.crx` 文件

### 4.2 发布到 Chrome Web Store
1. 访问 Chrome Web Store Developer Dashboard
2. 创建新项目
3. 上传 `.crx` 文件
4. 填写信息
5. 提交审核

## 五、贡献指南

（如有开源计划）
```

---

## 六、部署清单

### 6.1 后端部署

- [ ] 应用 CORS 中间件
- [ ] 修改 JWT 有效期（可选）
- [ ] 新增批量查询接口（可选）
- [ ] 测试 API 访问
- [ ] 提交代码到 Git
- [ ] 部署到生产环境
- [ ] 重启后端服务

### 6.2 插件部署

- [ ] 完成所有功能开发
- [ ] 通过所有测试用例
- [ ] 打包插件
- [ ] 发布到 Chrome Web Store
- [ ] 通知用户更新

---

**Part 3（集成测试与优化）完成！**

**完整计划已编写完成！**
