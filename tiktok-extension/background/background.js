/**
 * LazyFirst TikTok 数据采集器 - Background Service Worker
 * 处理API调用、Token管理、数据同步
 */

console.log('LazyFirst Extension: Background Service Worker 启动');

// 监听来自Content Script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background收到消息:', request.type, request);
  
  if (request.type === 'IMPORT_INFLUENCER') {
    // 导入达人
    importInfluencer(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true; // 异步响应
  }
  
  if (request.type === 'BATCH_IMPORT_INFLUENCERS') {
    // 批量导入达人
    batchImportInfluencers(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true; // 异步响应
  }
  
  if (request.type === 'FETCH_INFLUENCER') {
    // 查询达人
    checkInfluencerExists(request.tiktokId)
      .then(influencer => sendResponse({ success: true, influencer }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true;
  }
  
  if (request.type === 'CHECK_AUTH') {
    // 检查认证状态
    checkAuthStatus()
      .then(status => sendResponse(status))
      .catch(error => sendResponse({ isLoggedIn: false, error: error.message }));
    
    return true;
  }
});

/**
 * 检查达人是否存在（带缓存）
 */
async function checkInfluencerExists(tiktokId) {
  const { apiUrl, accessToken } = await chrome.storage.local.get(['apiUrl', 'accessToken']);
  
  if (!apiUrl || !accessToken) {
    throw new Error('未登录或API地址未配置');
  }
  
  // 先检查缓存
  const cacheKey = `influencer_${tiktokId}`;
  const cachedData = await getCache(cacheKey);
  
  if (cachedData) {
    console.log('从缓存中读取达人数据:', tiktokId);
    return cachedData;
  }
  
  // 缓存未命中，调用API
  console.log('调用API查询达人:', tiktokId);
  
  const response = await fetch(`${apiUrl}/influencers?tiktokId=${tiktokId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`查询失败: ${response.status}`);
  }
  
  const data = await response.json();
  
  let influencer = null;
  if (data.data && data.data.length > 0) {
    influencer = data.data[0]; // 返回第一个匹配的达人
    
    // 存入缓存（1小时有效期）
    await setCache(cacheKey, influencer, 60 * 60 * 1000);
  }
  
  return influencer; // 达人不存在返回null
}

// 导入cache工具函数
// 注意：Chrome Extension中无法直接import，需要复制函数或使用chrome.storage直接操作
async function setCache(key, data, ttl = 60 * 60 * 1000) {
  const cacheKey = 'cache_' + key;
  const cacheData = {
    data: data,
    timestamp: Date.now(),
    ttl: ttl
  };
  
  await chrome.storage.local.set({ [cacheKey]: cacheData });
}

async function getCache(key) {
  const cacheKey = 'cache_' + key;
  const result = await chrome.storage.local.get(cacheKey);
  const cacheData = result[cacheKey];
  
  if (!cacheData) {
    return null; // 缓存不存在
  }
  
  // 检查是否过期
  if (Date.now() - cacheData.timestamp > cacheData.ttl) {
    // 缓存过期，删除
    await chrome.storage.local.remove(cacheKey);
    return null;
  }
  
  return cacheData.data;
}

/**
 * 导入达人（核心逻辑）
 */
async function importInfluencer(authorData) {
  try {
    const { apiUrl, accessToken, user } = await chrome.storage.local.get(['apiUrl', 'accessToken', 'user']);
    
    if (!apiUrl || !accessToken) {
      throw new Error('未登录或API地址未配置');
    }
    
    // 1. 检查达人是否存在
    const existingInfluencer = await checkInfluencerExists(authorData.tiktokId);
    
    if (existingInfluencer) {
      // 2a. 达人已存在 → 添加维护记录
      await addMaintenanceRecord(existingInfluencer._id, authorData, apiUrl, accessToken);
      
      return {
        success: true,
        message: '已更新维护记录',
        influencerId: existingInfluencer._id,
        isNew: false
      };
    } else {
      // 2b. 达人不存在 → 创建新达人
      const newInfluencer = await createInfluencer(authorData, apiUrl, accessToken, user);
      
      // 添加维护记录
      await addMaintenanceRecord(newInfluencer._id, authorData, apiUrl, accessToken);
      
      return {
        success: true,
        message: '已创建达人并添加维护记录',
        influencerId: newInfluencer._id,
        isNew: true
      };
    }
  } catch (error) {
    console.error('导入达人失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * 创建新达人
 */
async function createInfluencer(authorData, apiUrl, accessToken, user) {
  const influencerData = {
    tiktokName: authorData.nickname || authorData.username,
    tiktokId: authorData.tiktokId,
    latestFollowers: authorData.followerCount || 0,
    latestGmv: authorData.estimatedGmv || 0,
    monthlySalesCount: authorData.monthlySalesCount || 0,
    avgVideoViews: authorData.avgVideoViews || 0,
    poolType: 'private',
    assignedTo: user ? user._id : null
  };
  
  const response = await fetch(`${apiUrl}/influencers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(influencerData)
  });
  
  if (!response.ok) {
    throw new Error(`创建达人失败: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 添加维护记录
 */
async function addMaintenanceRecord(influencerId, authorData, apiUrl, accessToken) {
  const maintenanceData = {
    influencerId: influencerId,
    followers: authorData.followerCount || 0,
    gmv: authorData.estimatedGmv || 0,
    monthlySalesCount: authorData.monthlySalesCount || 0,
    avgVideoViews: authorData.avgVideoViews || 0,
    poolType: 'private',
    remark: 'Chrome插件自动更新',
    maintainerId: (await chrome.storage.local.get('user')).user?._id,
    maintainerName: (await chrome.storage.local.get('user')).user?.realName || 'Chrome插件'
  };
  
  const response = await fetch(`${apiUrl}/influencer-maintenances`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(maintenanceData)
  });
  
  if (!response.ok) {
    throw new Error(`添加维护记录失败: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 批量导入达人
 */
async function batchImportInfluencers(influencersData) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  for (const authorData of influencersData) {
    try {
      const result = await importInfluencer(authorData);
      
      if (result.success) {
        results.success++;
        results.details.push({
          tiktokId: authorData.tiktokId,
          status: 'success',
          message: result.message,
          isNew: result.isNew
        });
      } else {
        results.failed++;
        results.details.push({
          tiktokId: authorData.tiktokId,
          status: 'failed',
          message: result.message
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        tiktokId: authorData.tiktokId,
        status: 'failed',
        message: error.message
      });
    }
  }
  
  return {
    success: true,
    results: results
  };
}

/**
 * 检查认证状态
 */
async function checkAuthStatus() {
  const { accessToken, apiUrl, user, loginTime } = await chrome.storage.local.get([
    'accessToken',
    'apiUrl',
    'user',
    'loginTime'
  ]);
  
  if (!accessToken || !apiUrl) {
    return { isLoggedIn: false };
  }
  
  // 检查Token是否过期（7天有效期，提前1天提示刷新）
  const tokenExpireTime = loginTime + (7 * 24 * 60 * 60 * 1000) - (1 * 24 * 60 * 60 * 1000);
  
  if (Date.now() >= tokenExpireTime) {
    return { 
      isLoggedIn: true, 
      user, 
      needRefresh: true,
      message: 'Token即将过期，请重新登录' 
    };
  }
  
  return { 
    isLoggedIn: true, 
    user, 
    needRefresh: false 
  };
}
