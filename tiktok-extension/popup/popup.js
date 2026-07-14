/**
 * LazyFirst TikTok 数据采集器 - Popup Script
 * 处理登录、显示状态
 */

console.log('LazyFirst Extension: Popup 加载');

// 前端页面地址（本地开发环境前端运行在5174端口；生产环境前端与API同域，改为系统域名即可）
const FRONTEND_BASE_URL = 'http://localhost:5174';

// 历史遗留：不再硬编码API地址，改为从storage动态读取
// 默认线上地址：https://tap.lazyfirst.com
const FALLBACK_API_URL = 'https://tap.lazyfirst.com';

/**
 * 获取API基础地址
 * 优先读取用户在options页配置的apiUrl，否则用线上默认地址
 */
async function getApiBaseUrl() {
  const { apiUrl, apiBaseUrl } = await chrome.storage.local.get(['apiUrl', 'apiBaseUrl']);
  let base = apiUrl || apiBaseUrl || FALLBACK_API_URL;
  // 去末尾的 /api 后缀
  base = base.replace(/\/api\/?$/, '');
  return base;
}

// 登录错误限制配置
const LOGIN_CONFIG = {
  MAX_ATTEMPTS: 3, // 最大尝试次数
  LOCKOUT_DURATION: 5 * 60 * 1000 // 锁定时间（5分钟）
};

console.log('LazyFirst Extension: Popup 加载');

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM加载完成');
  checkLoginStatus();
  bindEvents();
  loadSettings();
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
  
  // 检查是否被锁定
  checkLockoutStatus();
}

/**
 * 显示主视图
 */
function showMainView(user) {
  console.log('显示主视图:', user);
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('main-view').style.display = 'block';
  
  // 显示用户信息 - 兼容后端返回的数据结构
  const userName = user.realName || user.username || '用户';
  const roleName = getRoleText(user.role);
  
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-role').textContent = roleName;
  
  // 加载统计数据
  loadStats();
}

/**
 * 获取角色文本
 */
function getRoleText(role) {
  if (!role) return '普通用户';
  
  // 如果role是对象，取name字段
  if (typeof role === 'object') {
    if (role.name) return role.name;
    if (role === 'admin' || role === 'bd' || role === 'supplier' || role === 'shopfinder') {
      return role;
    }
    return '普通用户';
  }
  
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
  
  // 查看数据按钮
  document.getElementById('view-data-btn').addEventListener('click', handleViewData);
  
  // DEBUG模式开关
  document.getElementById('debug-mode').addEventListener('change', handleDebugModeChange);
}

/**
 * 加载设置
 */
async function loadSettings() {
  const { debugMode } = await chrome.storage.local.get(['debugMode']);
  document.getElementById('debug-mode').checked = debugMode || false;
}

/**
 * 处理DEBUG模式开关变化
 */
async function handleDebugModeChange() {
  const debugMode = document.getElementById('debug-mode').checked;
  await chrome.storage.local.set({ debugMode });
  console.log('DEBUG模式:', debugMode);
}

/**
 * 检查锁定状态
 */
async function checkLockoutStatus() {
  const lockoutData = await chrome.storage.local.get(['loginAttempts', 'lockoutUntil']);
  
  if (lockoutData.lockoutUntil && Date.now() < lockoutData.lockoutUntil) {
    // 还在锁定期间
    showLockoutMessage(lockoutData.lockoutUntil);
    return true;
  } else if (lockoutData.lockoutUntil && Date.now() >= lockoutData.lockoutUntil) {
    // 锁定已过期，清除锁定状态
    await chrome.storage.local.remove(['loginAttempts', 'lockoutUntil']);
  }
  
  return false;
}

/**
 * 显示锁定消息
 */
function showLockoutMessage(lockoutUntil) {
  const lockoutDiv = document.getElementById('lockout-message');
  const loginBtn = document.getElementById('login-btn');
  
  lockoutDiv.style.display = 'block';
  loginBtn.disabled = true;
  
  // 更新倒计时
  updateLockoutTimer(lockoutUntil);
}

/**
 * 更新锁定倒计时
 */
function updateLockoutTimer(lockoutUntil) {
  const timerSpan = document.getElementById('lockout-timer');
  
  function update() {
    const remaining = lockoutUntil - Date.now();
    
    if (remaining <= 0) {
      // 锁定已过期
      document.getElementById('lockout-message').style.display = 'none';
      document.getElementById('login-btn').disabled = false;
      chrome.storage.local.remove(['loginAttempts', 'lockoutUntil']);
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    setTimeout(update, 1000);
  }
  
  update();
}

/**
 * 处理登录
 */
async function handleLogin() {
  console.log('处理登录...');
  
  // 检查是否被锁定
  const isLocked = await checkLockoutStatus();
  if (isLocked) {
    return;
  }
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  // 验证输入
  if (!username) {
    showLoginError('请输入用户名');
    return;
  }
  
  if (!password) {
    showLoginError('请输入密码');
    return;
  }
  
  // 禁用登录按钮，显示加载状态
  const loginBtn = document.getElementById('login-btn');
  const originalText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading-spinner"></span> 登录中...';
  
  try {
    // 调用LazyFirst API登录（优先使用用户配置的API地址，否则用线上默认地址）
    const apiBase = await getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('登录成功:', data);
      
      // 注意：后端返回的是 { success: true, data: { user, token } }
      const userData = data.data.user;
      const token = data.data.token;
      
      // 存储Token和用户信息
      await chrome.storage.local.set({
        accessToken: token,
        apiBaseUrl: apiBase, // 存储正确的API地址
        user: userData,
        loginTime: Date.now()
      });
      
      // 清除登录错误计数
      await chrome.storage.local.remove(['loginAttempts', 'lockoutUntil']);
      
      // 显示主视图
      showMainView(data.user);
      
      // 清除错误信息
      hideLoginError();
      
      // 清除密码字段（安全考虑）
      document.getElementById('password').value = '';
    } else {
      console.error('登录失败:', data.message);
      
      // 增加登录错误计数
      await incrementLoginAttempts();
      
      showLoginError(data.message || '登录失败，请检查用户名和密码');
    }
  } catch (error) {
    console.error('登录请求失败:', error);
    
    // 增加登录错误计数
    await incrementLoginAttempts();
    
    if (error.message.includes('Failed to fetch')) {
      showLoginError('无法连接到服务器，请检查网络连接');
    } else {
      showLoginError('登录请求失败：' + error.message);
    }
  } finally {
    // 恢复登录按钮
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
  }
}

/**
 * 增加登录错误计数
 */
async function incrementLoginAttempts() {
  const { loginAttempts = 0 } = await chrome.storage.local.get(['loginAttempts']);
  const newAttempts = loginAttempts + 1;
  
  if (newAttempts >= LOGIN_CONFIG.MAX_ATTEMPTS) {
    // 达到最大尝试次数，锁定
    const lockoutUntil = Date.now() + LOGIN_CONFIG.LOCKOUT_DURATION;
    await chrome.storage.local.set({
      loginAttempts: newAttempts,
      lockoutUntil: lockoutUntil
    });
    
    showLockoutMessage(lockoutUntil);
  } else {
    await chrome.storage.local.set({ loginAttempts: newAttempts });
    showLoginError(`登录失败，还有 ${LOGIN_CONFIG.MAX_ATTEMPTS - newAttempts} 次机会`);
  }
}

/**
 * 处理退出登录
 */
async function handleLogout() {
  console.log('处理退出登录...');
  
  // 清除存储
  await chrome.storage.local.remove(['accessToken', 'apiBaseUrl', 'user', 'loginTime']);
  
  // 显示登录视图
  showLoginView();
}

/**
 * 处理查看数据
 */
async function handleViewData() {
  console.log('处理查看数据...');
  
  // 打开前端管理页面（注意：前端页面运行在前端端口，不是后端API端口）
  const { frontendUrl, accessToken } = await chrome.storage.local.get(['frontendUrl', 'accessToken']);
  const base = frontendUrl || FRONTEND_BASE_URL;
  
  // 带上扩展的登录Token，前端AuthManager会自动从URL恢复登录态（避免空白/跳登录页）
  let url = `${base}/bd/chrome-extension`;
  if (accessToken) {
    url += `?token=${encodeURIComponent(accessToken)}`;
  }
  
  chrome.tabs.create({ url });
}

/**
 * 加载统计数据
 */
async function loadStats() {
  console.log('加载统计数据...');
  
  try {
    // 从Background获取真实数据总数（来自数据库）
    const stats = await sendMessageToBackground({ type: 'GET_STATS' });
    
    document.getElementById('today-count').textContent = stats.totalCount || 0;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
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
  // 不再使用status消息，改为直接在页面上显示
  console.log('状态消息:', message);
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
