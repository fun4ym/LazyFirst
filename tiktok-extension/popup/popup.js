/**
 * LazyFirst TikTok 数据采集器 - Popup Script
 * 处理登录、显示状态、同步数据
 */

console.log('LazyFirst Extension: Popup 加载');

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM加载完成');
  checkLoginStatus();
  bindEvents();
});

/**
 * 检查登录状态
 */
async function checkLoginStatus() {
  console.log('检查登录状态...');
  
  try {
    const { isLoggedIn, user, needRefresh } = await sendMessageToBackground({ type: 'CHECK_AUTH' });
    
    if (isLoggedIn) {
      console.log('用户已登录:', user);
      showMainView(user);
      
      if (needRefresh) {
        showStatus('Token即将过期，请重新登录', 'error');
      }
    } else {
      console.log('用户未登录');
      showLoginView();
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
    showLoginView();
  }
}

/**
 * 显示登录视图
 */
function showLoginView() {
  console.log('显示登录视图');
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('main-view').style.display = 'none';
}

/**
 * 显示主视图
 */
function showMainView(user) {
  console.log('显示主视图:', user);
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
  
  // 显示用户信息
  document.getElementById('user-name').textContent = user.realName || user.username;
  document.getElementById('user-role').textContent = getRoleText(user.role);
  
  // 加载统计数据
  loadStats();
}

/**
 * 获取角色文本
 */
function getRoleText(role) {
  const roleMap = {
    'admin': '管理员',
    'bd': 'BD',
    'supplier': '供应商',
    'shopfinder': '找店员'
  };
  
  return roleMap[role] || role;
}

/**
 * 绑定事件
 */
function bindEvents() {
  console.log('绑定事件...');
  
  // 登录按钮
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  
  // 退出按钮
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // 立即同步按钮
  document.getElementById('sync-now-btn').addEventListener('click', handleSyncNow);
  
  // 查看历史按钮
  document.getElementById('view-history-btn').addEventListener('click', handleViewHistory);
  
  // 设置按钮
  document.getElementById('settings-btn').addEventListener('click', handleSettings);
}

/**
 * 处理登录
 */
async function handleLogin() {
  console.log('处理登录...');
  
  const apiUrl = document.getElementById('api-url').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  // 验证输入
  if (!apiUrl) {
    showLoginError('请输入API地址');
    return;
  }
  
  if (!username) {
    showLoginError('请输入用户名');
    return;
  }
  
  if (!password) {
    showLoginError('请输入密码');
    return;
  }
  
  // 禁用登录按钮
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';
  
  try {
    // 调用LazyFirst API登录
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('登录成功:', data);
      
      // 存储Token和用户信息
      await chrome.storage.local.set({
        accessToken: data.token,
        apiUrl: apiUrl,
        user: data.user,
        loginTime: Date.now()
      });
      
      // 显示主视图
      showMainView(data.user);
      
      // 清除错误信息
      hideLoginError();
    } else {
      console.error('登录失败:', data.message);
      showLoginError(data.message || '登录失败');
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    showLoginError('登录请求失败，请检查API地址和网络连接');
  } finally {
    // 恢复登录按钮
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
}

/**
 * 处理退出登录
 */
async function handleLogout() {
  console.log('处理退出登录...');
  
  // 清除存储
  await chrome.storage.local.remove(['accessToken', 'apiUrl', 'user', 'loginTime']);
  
  // 显示登录视图
  showLoginView();
}

/**
 * 处理立即同步
 */
async function handleSyncNow() {
  console.log('处理立即同步...');
  
  showStatus('同步功能开发中...', 'success');
}

/**
 * 处理查看历史
 */
async function handleViewHistory() {
  console.log('处理查看历史...');
  
  // 打开LazyFirst系统的达人管理页面
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  
  if (apiUrl) {
    const baseUrl = apiUrl.replace('/api', '');
    chrome.tabs.create({ url: `${baseUrl}/influencer-managements` });
  }
}

/**
 * 处理设置
 */
async function handleSettings() {
  console.log('处理设置...');
  
  // 打开选项页面
  chrome.runtime.openOptionsPage();
}

/**
 * 加载统计数据
 */
async function loadStats() {
  console.log('加载统计数据...');
  
  // TODO: 从存储中读取今⽇同步数量、最后同步时间
  const { todaySyncCount, lastSyncTime } = await chrome.storage.local.get(['todaySyncCount', 'lastSyncTime']);
  
  document.getElementById('today-sync-count').textContent = todaySyncCount || 0;
  document.getElementById('last-sync-time').textContent = lastSyncTime || '--';
}

/**
 * 显示登录错误
 */
function showLoginError(message) {
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
}

/**
 * 隐藏登录错误
 */
function hideLoginError() {
  const errorDiv = document.getElementById('login-error');
  errorDiv.classList.remove('show');
}

/**
 * 显示状态消息
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('sync-status');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusDiv.className = 'status-message';
  }, 3000);
}

/**
 * 发送消息到Background
 */
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
