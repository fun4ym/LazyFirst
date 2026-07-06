/**
 * LazyFirst TikTok 数据采集器 - Background Service Worker
 * 处理API调用、Token管理、数据存储
 */

console.log('LazyFirst Extension: Background Service Worker 启动');

// 配置
const CONFIG = {
  API_TIMEOUT: 30000, // API请求超时时间（30秒）
  MAX_RETRIES: 3, // 最大重试次数
  CACHE_TTL: 60 * 60 * 1000 // 缓存有效期（1小时）
};

// 监听来自Content Script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background收到消息:', request.type, request);
  
  if (request.type === 'SAVE_COLLECTED_DATA') {
    // 保存采集的数据
    saveCollectedData(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true; // 异步响应
  }
  
  if (request.type === 'CHECK_AUTH') {
    // 检查认证状态
    checkAuthStatus()
      .then(status => sendResponse(status))
      .catch(error => sendResponse({ isLoggedIn: false, error: error.message }));
    
    return true;
  }
  
  if (request.type === 'GET_STATS') {
    // 获取统计信息
    getStats()
      .then(stats => sendResponse(stats))
      .catch(error => sendResponse({ error: error.message }));
    
    return true;
  }
});

/**
 * 获取API地址（从存储中读取，默认使用生产环境地址）
 */
async function getApiBaseUrl() {
  const { apiBaseUrl } = await chrome.storage.local.get(['apiBaseUrl']);
  return apiBaseUrl || 'https://lazyfirst.com'; // 默认生产环境地址
}

/**
 * 带超时的fetch请求
 */
async function fetchWithTimeout(url, options, timeout = CONFIG.API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
}

/**
 * 带重试的API请求
 */
async function apiRequest(url, options, retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // 如果是401错误，可能是Token过期
      if (response.status === 401 && i === retries - 1) {
        // 最后一次重试失败，清除Token
        await chrome.storage.local.remove(['accessToken', 'user', 'loginTime']);
        throw new Error('认证失败，请重新登录');
      }
      
      // 其他错误，继续重试
      if (i < retries - 1) {
        await sleep(1000 * (i + 1)); // 指数退避
        continue;
      }
      
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      
      // 网络错误，继续重试
      await sleep(1000 * (i + 1));
    }
  }
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 保存采集的数据（核心逻辑）
 * 将数据存储到tiktok_extension_data表，不直接同步到influencer表
 */
async function saveCollectedData(authorData) {
  try {
    const { accessToken, user } = await chrome.storage.local.get(['accessToken', 'user']);
    
    if (!accessToken) {
      throw new Error('未登录');
    }
    
    // 获取API地址
    const apiBaseUrl = await getApiBaseUrl();
    
    // 调用API保存数据到tiktok_extension_data表
    console.log('保存采集的数据:', authorData.tiktokId);
    
    const response = await apiRequest(`${apiBaseUrl}/api/tiktok-extension-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tiktokId: authorData.tiktokId,
        tiktokName: authorData.nickname || authorData.username,
        followerCount: authorData.followerCount || 0,
        estimatedGmv: authorData.estimatedGmv || 0,
        monthlySalesCount: authorData.monthlySalesCount || 0,
        avgVideoViews: authorData.avgVideoViews || 0,
        collectedAt: authorData.collectedAt || new Date().toISOString(),
        collectedBy: user ? user._id : null
      })
    });
    
    const result = await response.json();
    
    // 更新本地统计
    await updateStats();
    
    return {
      success: true,
      message: '数据已保存，等待系统同步',
      dataId: result.data._id
    };
  } catch (error) {
    console.error('保存数据失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 更新本地统计
 */
async function updateStats() {
  const { todayCount = 0, lastCollectTime } = await chrome.storage.local.get(['todayCount', 'lastCollectTime']);
  
  // 检查是否是同一天
  const today = new Date().toDateString();
  const lastCollectDay = lastCollectTime ? new Date(lastCollectTime).toDateString() : null;
  
  if (today !== lastCollectDay) {
    // 新的一天，重置计数
    await chrome.storage.local.set({
      todayCount: 1,
      lastCollectTime: Date.now()
    });
  } else {
    // 同一天，增加计数
    await chrome.storage.local.set({
      todayCount: todayCount + 1,
      lastCollectTime: Date.now()
    });
  }
}

/**
 * 获取统计信息
 */
async function getStats() {
  const { todayCount = 0, lastCollectTime, totalCount = 0 } = await chrome.storage.local.get([
    'todayCount',
    'lastCollectTime',
    'totalCount'
  ]);
  
  return {
    todayCount,
    lastCollectTime,
    totalCount
  };
}

/**
 * 检查认证状态
 */
async function checkAuthStatus() {
  const { accessToken, user, loginTime } = await chrome.storage.local.get([
    'accessToken',
    'user',
    'loginTime'
  ]);
  
  if (!accessToken) {
    return { isLoggedIn: false };
  }
  
  // 检查Token是否过期（7天有效期）
  const tokenExpireTime = loginTime + (7 * 24 * 60 * 60 * 1000);
  
  if (Date.now() >= tokenExpireTime) {
    // Token已过期，清除登录状态
    await chrome.storage.local.remove(['accessToken', 'user', 'loginTime']);
    return { 
      isLoggedIn: false,
      message: 'Token已过期，请重新登录' 
    };
  }
  
  // Token即将过期（24小时内），提示用户但继续使用
  const refreshThreshold = tokenExpireTime - (24 * 60 * 60 * 1000);
  if (Date.now() >= refreshThreshold) {
    return { 
      isLoggedIn: true, 
      user, 
      needRefresh: true,
      message: 'Token即将过期，建议重新登录' 
    };
  }
  
  return { 
    isLoggedIn: true, 
    user, 
    needRefresh: false 
  };
}
