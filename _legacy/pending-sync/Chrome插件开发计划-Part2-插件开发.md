# Chrome 插件开发计划 - Part 2：插件开发

## 概述

本文档详细描述 Chrome Extension 的开发步骤，包含具体代码实现。

---

## 一、项目初始化

### 1.1 创建项目目录

**步骤**：

```bash
# 进入 LazyFirst 项目根目录
cd /Users/mor/CodeBuddy/LazyFirst

# 创建插件目录
mkdir -p tiktok-extension/{popup,options,content,pages,background,utils,assets/icons}

# 创建基础文件
touch tiktok-extension/manifest.json
touch tiktok-extension/popup/popup.html
touch tiktok-extension/popup/popup.js
touch tiktok-extension/popup/popup.css
touch tiktok-extension/options/options.html
touch tiktok-extension/options/options.js
touch tiktok-extension/options/options.css
touch tiktok-extension/background/background.js
touch tiktok-extension/content/content.js
```

### 1.2 创建 manifest.json

**文件**：`tiktok-extension/manifest.json`

**内容**：

```json
{
  "manifest_version": 3,
  "name": "LazyFirst TikTok Collector",
  "version": "1.0.0",
  "description": "自动采集 TikTok 达人数据并同步到 LazyFirst 系统",
  
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],
  
  "host_permissions": [
    "https://www.tiktok.com/*",
    "http://localhost:3001/*"
  ],
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.tiktok.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

### 1.3 创建图标资源

**步骤**：

1. 使用在线工具（如 https://favicon.io/）生成图标
2. 将图标保存到 `tiktok-extension/assets/icons/` 目录
3. 确保图标尺寸：16x16, 48x48, 128x128

---

## 二、Popup 页面开发

### 2.1 创建 popup.html

**文件**：`tiktok-extension/popup/popup.html`

**内容**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LazyFirst TikTok Collector</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <!-- 未登录状态 -->
    <div id="login-view" style="display: none;">
      <h2>登录 LazyFirst</h2>
      <form id="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input type="text" id="username" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" required>
        </div>
        <div class="form-group">
          <label for="api-url">API 地址</label>
          <input type="url" id="api-url" placeholder="https://lazyfirst.com/api" required>
        </div>
        <button type="submit" id="login-btn">登录</button>
      </form>
      <div id="login-error" class="error" style="display: none;"></div>
    </div>
    
    <!-- 已登录状态 -->
    <div id="main-view" style="display: none;">
      <h2>LazyFirst</h2>
      <div class="user-info">
        <p><strong>用户：</strong><span id="user-name"></span></p>
        <p><strong>公司：</strong><span id="company-name"></span></p>
      </div>
      
      <div class="stats">
        <p><strong>今日同步：</strong><span id="today-sync-count">0</span> 个达人</p>
      </div>
      
      <div class="actions">
        <button id="sync-now-btn">立即同步</button>
        <button id="view-history-btn">查看历史</button>
        <button id="settings-btn">设置</button>
        <button id="logout-btn">退出登录</button>
      </div>
      
      <div class="status">
        <p id="status-message">就绪</p>
      </div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### 2.2 创建 popup.css

**文件**：`tiktok-extension/popup/popup.css`

**内容**：

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 350px;
  min-height: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

#app {
  padding: 16px;
}

h2 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #333;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #666;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  width: 100%;
  padding: 10px;
  margin-bottom: 8px;
  background: #775999;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

button:hover {
  background: #8a6bb0;
}

button:last-child {
  margin-bottom: 0;
}

.user-info,
.stats {
  background: white;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.user-info p,
.stats p {
  font-size: 14px;
  margin-bottom: 4px;
}

.user-info p:last-child,
.stats p:last-child {
  margin-bottom: 0;
}

.actions {
  margin-bottom: 12px;
}

.status {
  background: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 14px;
}
```

### 2.3 创建 popup.js

**文件**：`tiktok-extension/popup/popup.js`

**内容**：

```javascript
// ========== 工具函数 ==========

// 获取存储数据
async function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// 设置存储数据
async function setStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 调用 API
async function callAPI(endpoint, options = {}) {
  const { apiUrl, accessToken } = await getStorage(['apiUrl', 'accessToken']);
  
  if (!apiUrl) {
    throw new Error('API 地址未配置');
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
    throw new Error(data.message || 'API 调用失败');
  }
  
  return data;
}

// ========== 登录功能 ==========

async function login(username, password, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 存储 Token 和用户信息
      await setStorage({
        accessToken: data.data.token,
        user: data.data.user,
        apiUrl: apiUrl,
        loginTime: Date.now(),
        todaySyncCount: 0
      });
      
      return { success: true, user: data.data.user };
    } else {
      throw new Error(data.message || '登录失败');
    }
  } catch (error) {
    throw new Error(error.message || '网络错误，请检查 API 地址');
  }
}

// ========== UI 控制 ==========

async function showLoginView() {
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('main-view').style.display = 'none';
}

async function showMainView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
  
  // 填充用户信息
  const { user, todaySyncCount } = await getStorage(['user', 'todaySyncCount']);
  
  if (user) {
    document.getElementById('user-name').textContent = user.realName || user.username;
    document.getElementById('company-name').textContent = user.company?.name || '-';
  }
  
  document.getElementById('today-sync-count').textContent = todaySyncCount || 0;
}

function showError(message) {
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function setStatus(message) {
  document.getElementById('status-message').textContent = message;
}

// ========== 事件绑定 ==========

document.addEventListener('DOMContentLoaded', async () => {
  // 检查登录状态
  const { accessToken } = await getStorage(['accessToken']);
  
  if (accessToken) {
    // 已登录，显示主界面
    await showMainView();
  } else {
    // 未登录，显示登录界面
    await showLoginView();
  }
});

// 登录表单提交
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const apiUrl = document.getElementById('api-url').value;
  
  // 禁用按钮
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  
  try {
    await login(username, password, apiUrl);
    
    // 登录成功，显示主界面
    await showMainView();
  } catch (error) {
    showError(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});

// 立即同步按钮
document.getElementById('sync-now-btn').addEventListener('click', async () => {
  setStatus('正在同步...');
  
  // 发送消息到 Background
  chrome.runtime.sendMessage(
    { type: 'SYNC_NOW' },
    (response) => {
      if (response && response.success) {
        setStatus(`同步成功！已同步 ${response.count} 个达人`);
      } else {
        setStatus(`同步失败：${response?.message || '未知错误'}`);
      }
    }
  );
});

// 退出登录按钮
document.getElementById('logout-btn').addEventListener('click', async () => {
  await setStorage({
    accessToken: null,
    user: null,
    loginTime: null
  });
  
  await showLoginView();
});

// 设置按钮
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// 查看历史按钮
document.getElementById('view-history-btn').addEventListener('click', () => {
  // 打开历史页面（可选功能）
  alert('功能开发中...');
});
```

---

## 三、Options 页面开发

### 3.1 创建 options.html

**文件**：`tiktok-extension/options/options.html`

**内容**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF--8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>设置 - LazyFirst TikTok Collector</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div id="app">
    <h1>设置</h1>
    
    <div class="section">
      <h2>API 配置</h2>
      <div class="form-group">
        <label for="api-url">API 地址</label>
        <input type="url" id="api-url" placeholder="https://lazyfirst.com/api">
        <small>示例：https://lazyfirst.com/api</small>
      </div>
    </div>
    
    <div class="section">
      <h2>同步设置</h2>
      <div class="form-group">
        <label>
          <input type="checkbox" id="auto-sync">
          自动同步（浏览时自动保存达人数据）
        </label>
      </div>
      <div class="form-group">
        <label for="sync-interval">同步间隔（秒）</label>
        <input type="number" id="sync-interval" min="10" max="3600" value="60">
        <small>仅当启用自动同步时有效</small>
      </div>
    </div>
    
    <div class="section">
      <h2>数据显示</h2>
      <div class="form-group">
        <label>
          <input type="checkbox" id="show-overlay">
          在 TikTok 页面上显示覆盖层（历史数据）
        </label>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="show-tags">
          显示 GMV/FV 标签
        </label>
      </div>
    </div>
    
    <div class="actions">
      <button id="save-btn">保存设置</button>
      <button id="reset-btn">恢复默认</button>
    </div>
    
    <div id="save-message" style="display: none;"></div>
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

### 3.2 创建 options.js

**文件**：`tiktok-extension/options/options.js`

**内容**：

```javascript
// 获取存储数据
async function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// 设置存储数据
async function setStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 加载设置
async function loadSettings() {
  const { apiUrl, autoSync, syncInterval, showOverlay, showTags } = await getStorage([
    'apiUrl',
    'autoSync',
    'syncInterval',
    'showOverlay',
    'showTags'
  ]);
  
  document.getElementById('api-url').value = apiUrl || '';
  document.getElementById('auto-sync').checked = autoSync || false;
  document.getElementById('sync-interval').value = syncInterval || 60;
  document.getElementById('show-overlay').checked = showOverlay !== false; // 默认 true
  document.getElementById('show-tags').checked = showTags !== false; // 默认 true
}

// 保存设置
async function saveSettings() {
  const apiUrl = document.getElementById('api-url').value;
  const autoSync = document.getElementById('auto-sync').checked;
  const syncInterval = parseInt(document.getElementById('sync-interval').value);
  const showOverlay = document.getElementById('show-overlay').checked;
  const showTags = document.getElementById('show-tags').checked;
  
  await setStorage({
    apiUrl,
    autoSync,
    syncInterval,
    showOverlay,
    showTags
  });
  
  // 显示保存成功消息
  const messageDiv = document.getElementById('save-message');
  messageDiv.textContent = '设置已保存！';
  messageDiv.style.display = 'block';
  messageDiv.style.background = '#e8f5e9';
  messageDiv.style.color = '#2e7d32';
  messageDiv.style.padding = '12px';
  messageDiv.style.borderRadius = '4px';
  messageDiv.style.marginTop = '16px';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// 恢复默认设置
async function resetSettings() {
  await setStorage({
    apiUrl: '',
    autoSync: false,
    syncInterval: 60,
    showOverlay: true,
    showTags: true
  });
  
  await loadSettings();
  
  alert('已恢复默认设置');
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
});

// 事件绑定
document.getElementById('save-btn').addEventListener('click', async () => {
  await saveSettings();
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  if (confirm('确定要恢复默认设置吗？')) {
    await resetSettings();
  }
});
```

---

## 四、Background Service Worker 开发

### 4.1 创建 background.js

**文件**：`tiktok-extension/background/background.js`

**内容**：

```javascript
// ========== 工具函数 ==========

// 获取存储数据
async function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

// 设置存储数据
async function setStorage(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 调用 API
async function callAPI(endpoint, options = {}) {
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
    throw new Error(data.message || 'API 调用失败');
  }
  
  return data;
}

// ========== 核心功能：导入达人 ==========

async function importInfluencer(authorData) {
  try {
    // 1. 检查达人是否存在
    const checkResult = await callAPI(`/influencers?tiktokId=${encodeURIComponent(authorData.tiktokId)}`);
    
    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      // 达人已存在 → 添加维护记录
      const existingInfluencer = checkResult.data[0];
      
      await addMaintenanceRecord(existingInfluencer._id, authorData);
      
      return {
        success: true,
        message: '已更新维护记录',
        influencerId: existingInfluencer._id,
        isNew: false
      };
    } else {
      // 达人不存在 → 创建新达人
      const { user, apiUrl } = await getStorage(['user', 'apiUrl']);
      
      const createResult = await callAPI('/influencers', {
        method: 'POST',
        body: JSON.stringify({
          tiktokName: authorData.tiktokName,
          tiktokId: authorData.tiktokId,
          latestFollowers: authorData.followerCount || 0,
          latestGmv: authorData.estimatedGmv || 0,
          monthlySalesCount: authorData.monthlySalesCount || 0,
          avgVideoViews: authorData.avgVideoViews || 0,
          poolType: 'private',
          assignedTo: user._id
        })
      });
      
      if (createResult.success) {
        // 添加维护记录
        await addMaintenanceRecord(createResult.data._id, authorData);
        
        return {
          success: true,
          message: '已创建达人并添加维护记录',
          influencerId: createResult.data._id,
          isNew: true
        };
      } else {
        throw new Error(createResult.message || '创建达人失败');
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// 添加维护记录
async function addMaintenanceRecord(influencerId, authorData) {
  const { user } = await getStorage(['user']);
  
  await callAPI('/influencer-maintenances', {
    method: 'POST',
    body: JSON.stringify({
      influencerId: influencerId,
      followers: authorData.followerCount || 0,
      gmv: authorData.estimatedGmv || 0,
      monthlySalesCount: authorData.monthlySalesCount || 0,
      avgVideoViews: authorData.avgVideoViews || 0,
      poolType: 'private',
      remark: 'Chrome 插件自动更新',
      maintainerId: user._id,
      maintainerName: user.realName,
      category: 'import'  // 标记为"数据导入"类型
    })
  });
}

// ========== 消息处理 ==========

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'IMPORT_INFLUENCER') {
    // 导入达人
    importInfluencer(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true; // 异步响应
  }
  
  if (request.type === 'FETCH_INFLUENCER') {
    // 查询达人
    callAPI(`/influencers?tiktokId=${encodeURIComponent(request.tiktokId)}`)
      .then(data => sendResponse({ success: true, data: data.data?.[0] || null }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true;
  }
  
  if (request.type === 'SYNC_NOW') {
    // 立即同步（从 Content Script 获取待同步数据）
    syncNow()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true;
  }
});

// ========== 定时同步（可选） ==========

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('LazyFirst TikTok Collector 已安装');
  
  // 创建定时任务（每 1 小时执行一次）
  chrome.alarms.create('syncData', { periodInMinutes: 60 });
});

// 监听定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log('执行定时同步...');
    // 这里可以实现批量同步逻辑
  }
});
```

---

## 五、Content Script 开发

### 5.1 创建 content.js

**文件**：`tiktok-extension/content/content.js`

**内容**：

```javascript
// ========== 工具函数 ==========

// 发送消息到 Background
function sendToBackground(type, data) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type, data },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

// 解析数字（处理 "1.2M" 格式）
function parseNumber(text) {
  if (!text) return 0;
  
  const match = text.match(/([\d.]+)([KMB])?/i);
  if (!match) return parseInt(text) || 0;
  
  const num = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase();
  
  switch (unit) {
    case 'K': return num * 1000;
    case 'M': return num * 1000000;
    case 'B': return num * 1000000000;
    default: return num;
  }
}

// ========== 搜索页处理逻辑 ==========

class SearchPage {
  constructor() {
    this.observer = null;
  }
  
  init() {
    console.log('[SearchPage] 初始化搜索页');
    
    // 监听页面变化
    this.observePageChanges();
    
    // 解析当前页面
    this.parseSearchResults();
  }
  
  observePageChanges() {
    this.observer = new MutationObserver(() => {
      this.parseSearchResults();
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  parseSearchResults() {
    // 视频卡片选择器（需要根据 TikTok 实际 DOM 调整）
    const videoCards = document.querySelectorAll('[data-e2e="video-card"]');
    
    console.log(`[SearchPage] 找到 ${videoCards.length} 个视频卡片`);
    
    videoCards.forEach(card => {
      // 检查是否已经添加过覆盖层
      if (card.querySelector('.lf-overlay')) return;
      
      const videoData = this.parseVideoCard(card);
      
      // 显示覆盖层
      this.showOverlay(card, videoData);
    });
  }
  
  parseVideoCard(card) {
    return {
      videoId: card.querySelector('a')?.href?.split('/')?.pop(),
      author: {
        username: card.querySelector('[data-e2e="video-author-uniqueid"]')?.textContent?.replace('@', ''),
        nickname: card.querySelector('[data-e2e="video-author-nickname"]')?.textContent
      }
    };
  }
  
  showOverlay(card, videoData) {
    // 创建覆盖层元素
    const overlay = document.createElement('div');
    overlay.className = 'lf-overlay';
    overlay.innerHTML = `
      <div class="lf-metrics">
        <button class="lf-import-btn">导入到 LazyFirst</button>
      </div>
    `;
    
    // 添加样式
    overlay.style.position = 'absolute';
    overlay.style.top = '8px';
    overlay.style.right = '8px';
    overlay.style.zIndex = '9999';
    
    card.style.position = 'relative';
    card.appendChild(overlay);
    
    // 绑定导入按钮事件
    overlay.querySelector('.lf-import-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const authorData = {
        tiktokId: '@' + videoData.author.username,
        tiktokName: videoData.author.nickname,
        followerCount: 0,  // 搜索页无法获取粉丝数
        estimatedGmv: 0
      };
      
      // 发送到 Background 处理
      const result = await sendToBackground('IMPORT_INFLUENCER', authorData);
      
      if (result.success) {
        alert(result.message);
      } else {
        alert('导入失败：' + result.message);
      }
    });
  }
}

// ========== 达人主页处理逻辑 ==========

class ProfilePage {
  constructor() {
    this.username = window.location.pathname.split('/')[1]?.replace('@', '');
  }
  
  init() {
    console.log('[ProfilePage] 初始化达人主页：', this.username);
    
    // 解析达人信息
    const influencerData = this.parseProfile();
    
    // 查询 LazyFirst 中的历史数据
    this.fetchHistoricalData(influencerData);
  }
  
  parseProfile() {
    return {
      tiktokId: '@' + this.username,
      tiktokName: document.querySelector('[data-e2e="user-subtitle"]')?.textContent,
      followerCount: parseNumber(
        document.querySelector('[data-e2e="followers-count"]')?.textContent
      ),
      followingCount: parseNumber(
        document.querySelector('[data-e2e="following-count"]')?.textContent
      ),
      bio: document.querySelector('[data-e2e="user-bio"]')?.textContent
    };
  }
  
  async fetchHistoricalData(influencerData) {
    try {
      const result = await sendToBackground('FETCH_INFLUENCER', {
        tiktokId: influencerData.tiktokId
      });
      
      if (result.success && result.data) {
        // 显示历史数据
        this.showHistoricalData(result.data);
      } else {
        // 达人不存在，显示"导入"按钮
        this.showImportButton(influencerData);
      }
    } catch (error) {
      console.error('[ProfilePage] 查询失败：', error);
    }
  }
  
  showHistoricalData(influencer) {
    const overlay = document.createElement('div');
    overlay.className = 'lf-profile-overlay';
    overlay.innerHTML = `
      <div style="background: white; padding: 16px; border-radius: 8px; margin-top: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom: 8px; font-size: 16px;">LazyFirst 数据</h3>
        <p><strong>最新粉丝数：</strong>${influencer.latestFollowers}</p>
        <p><strong>最新 GMV：</strong>$${influencer.latestGmv}</p>
        <p><strong>月销件数：</strong>${influencer.monthlySalesCount}</p>
        <p><strong>归属 BD：</strong>${influencer.latestMaintainerName || '-'}</p>
        <p><strong>维护状态：</strong>${influencer.maintenanceStatus}</p>
      </div>
    `;
    
    // 插入到页面合适位置
    const userInfoSection = document.querySelector('[data-e2e="user-info"]');
    if (userInfoSection) {
      userInfoSection.appendChild(overlay);
    }
  }
  
  showImportButton(influencerData) {
    const overlay = document.createElement('div');
    overlay.className = 'lf-import-overlay';
    overlay.innerHTML = `
      <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin-top: 16px;">
        <p style="margin-bottom: 8px;">此达人尚未导入 LazyFirst</p>
        <button id="lf-import-btn" style="background: #775999; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          导入到 LazyFirst
        </button>
      </div>
    `;
    
    // 插入到页面合适位置
    const userInfoSection = document.querySelector('[data-e2e="user-info"]');
    if (userInfoSection) {
      userInfoSection.appendChild(overlay);
    }
    
    // 绑定导入按钮事件
    overlay.querySelector('#lf-import-btn').addEventListener('click', async () => {
      const result = await sendToBackground('IMPORT_INFLUENCER', influencerData);
      
      if (result.success) {
        alert(result.message);
        location.reload(); // 刷新页面显示历史数据
      } else {
        alert('导入失败：' + result.message);
      }
    });
  }
}

// ========== 页面路由 ==========

function routePage() {
  const pathname = window.location.pathname;
  
  if (pathname.startsWith('/search')) {
    // 搜索页
    new SearchPage().init();
  } else if (pathname.match(/^\/@[\w\.]+\/?$/)) {
    // 达人主页（/@username）
    new ProfilePage().init();
  } else if (pathname.startsWith('/video/')) {
    // 视频详情页（暂未实现）
    console.log('[Content] 视频详情页，暂未实现');
  }
}

// ========== 初始化 ==========

// 等待页面加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', routePage);
} else {
  routePage();
}

// 监听 SPA 路由变化（TikTok 是单页应用）
let lastPathname = window.location.pathname;
setInterval(() => {
  if (window.location.pathname !== lastPathname) {
    lastPathname = window.location.pathname;
    console.log('[Content] 路由变化：', lastPathname);
    routePage();
  }
}, 1000);
```

---

## 六、测试与调试

### 6.1 加载插件到 Chrome

**步骤**：

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `tiktok-extension/` 目录

### 6.2 调试 Content Script

**方法**：

1. 打开 TikTok 网站（https://www.tiktok.com/）
2. 按 F12 打开开发者工具
3. 切换到"Console"标签
4. 查看日志输出（以 `[Content]` 开头）

### 6.3 调试 Background Service Worker

**方法**：

1. 访问 `chrome://extensions/`
2. 找到"LazyFirst TikTok Collector"
3. 点击"Service Worker"链接
4. 打开 Background 的开发者工具
5. 查看日志输出

### 6.4 测试登录流程

**测试用例**：

1. 点击插件图标 → 弹出登录界面
2. 输入错误的用户名/密码 → 显示错误提示
3. 输入正确的用户名/密码 → 登录成功，显示主界面
4. 关闭弹出窗口，重新打开 → 显示主界面（已登录状态）

### 6.5 测试数据同步

**测试用例**：

1. 访问 TikTok 搜索页 → 视频卡片上显示"导入"按钮
2. 点击"导入"按钮 → 显示"导入成功"
3. 访问 LazyFirst 后端 → 确认达人已创建
4. 访问达人主页 → 显示 LazyFirst 历史数据

---

## 七、打包与发布

### 7.1 打包插件

**步骤**：

1. 访问 `chrome://extensions/`
2. 点击"打包扩展程序"
3. 选择 `tiktok-extension/` 目录
4. 点击"打包扩展程序"按钮
5. 生成 `.crx` 文件和私钥

### 7.2 发布到 Chrome Web Store

**步骤**：

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. 创建新的插件项目
3. 上传打包好的 `.crx` 文件
4. 填写插件信息（名称、描述、截图）
5. 提交审核

---

**Part 2（插件开发）完成！**

**下一步**：Part 3（集成测试与优化）
