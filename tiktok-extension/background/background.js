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
  
  if (request.type === 'SAVE_COLLECTED_VIDEOS') {
    // 保存批量采集的视频数据
    saveCollectedVideos(request.data)
      .then(result => sendResponse(result))
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
  
  if (request.type === 'GET_STATS') {
    // 获取统计信息
    getStats()
      .then(stats => sendResponse(stats))
      .catch(error => sendResponse({ error: error.message }));
    
    return true;
  }
  
  if (request.type === 'FETCH_VIDEO_PAGE_DATA') {
    // 核心：抓取TikTok视频详情页的完整统计数据
    fetchVideoPageData(request.videoUrl)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, message: error.message }));
    
    return true; // 异步响应
  }
  
  if (request.type === 'GET_INFLUENCER_METRICS') {
    // 插件内查询：返回达人的 followers/totalLikes
    getInfluencerMetrics(request.tiktokId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, message: error.message }));

    return true; // 异步响应
  }

  if (request.type === 'GET_MESSAGE_TEMPLATE') {
    // 插件内查询：返回当前 BD 的三语私信模板
    getMessageTemplate()
      .then(templates => sendResponse({ success: true, templates }))
      .catch(error => sendResponse({ success: false, message: error.message }));

    return true; // 异步响应
  }

  if (request.type === 'FETCH_INFLUENCER_PROFILE') {
    // ★ 去达人Profile页抓取粉丝数和被赞总数
    fetchInfluencerProfileData(request.tiktokId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, message: error.message }));

    return true; // 异步响应
  }
});

/**
 * 获取API地址（从存储中读取，默认使用生产环境地址）
 */
async function getApiBaseUrl() {
  // 注意：options 页面保存的存储 key 是 apiUrl（并非 apiBaseUrl），这里以 apiUrl 为准，兼容旧的 apiBaseUrl
  const { apiUrl, apiBaseUrl } = await chrome.storage.local.get(['apiUrl', 'apiBaseUrl']);
  let base = apiUrl || apiBaseUrl || 'https://tap.lazyfirst.com'; // 默认生产环境地址（与 popup/options 保持一致）
  // 规范化：去掉结尾的 /api，调用处统一拼接 /api/...，避免 "http://x/api/api/..." 双路径导致 404
  base = base.replace(/\/api\/?$/, '');
  return base;
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
 * 批量保存采集的视频数据
 */
async function saveCollectedVideos(videoData) {
  try {
    const { accessToken, user } = await chrome.storage.local.get(['accessToken', 'user']);
    
    if (!accessToken) {
      throw new Error('未登录');
    }
    
    const apiBaseUrl = await getApiBaseUrl();
    console.log('批量保存视频数据:', videoData.tiktokId, '视频数:', videoData.videos?.length || 0);
    
    const response = await apiRequest(`${apiBaseUrl}/api/tiktok-extension-data/batch-videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tiktokId: videoData.tiktokId,
        videos: videoData.videos,
        collectedAt: videoData.collectedAt || new Date().toISOString(),
        collectedBy: user ? user._id : null
      })
    });
    
    const result = await response.json();
    
    await updateStats();
    
    return {
      success: true,
      message: `已保存 ${videoData.videos.length} 个视频数据`,
      count: videoData.videos.length
    };
  } catch (error) {
    console.error('批量保存视频数据失败:', error);
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
 * 获取统计信息（真实从数据库拉取采集数据总数）
 */
async function getStats() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    
    if (accessToken) {
      const apiBaseUrl = await getApiBaseUrl();
      
      // 调用后端列表接口，取总数（limit=1只拿分页信息）
      const response = await apiRequest(`${apiBaseUrl}/api/tiktok-extension-data?page=1&limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data && result.data.pagination) {
        return {
          totalCount: result.data.pagination.total || 0
        };
      }
    }
  } catch (error) {
    console.error('获取统计信息失败:', error);
  }
  
  return {
    totalCount: 0
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

/**
 * 获取达人指标：FV(粉丝数)/GMV(月销GMV)/MSS(月销量)/APV(平均播放)
 */
async function getInfluencerMetrics(tiktokId) {
  try {
    if (!tiktokId) {
      throw new Error('tiktokId不能为空');
    }

    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) {
      throw new Error('未登录');
    }

    const apiBaseUrl = await getApiBaseUrl();
    const normalizedId = String(tiktokId).replace(/^\/+/, '').trim();

    const response = await apiRequest(`${apiBaseUrl}/api/tiktok-extension-data/influencer/${encodeURIComponent(normalizedId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || '获取达人指标失败');
    }

    return result.data;
  } catch (error) {
    console.error('获取达人指标失败:', error.message);
    throw error;
  }
}

/**
 * ★ 从达人Profile页抓取粉丝数和被点赞总数
 * 直接fetch TikTok达人主页HTML，解析出真实数据
 */
async function fetchInfluencerProfileData(tiktokId) {
  try {
    if (!tiktokId) throw new Error('tiktokId不能为空');

    const username = String(tiktokId).replace(/^\/+/, '').replace(/^@/, '').trim();
    // try /@username (without trailing slash) 
    const profileUrl = `https://www.tiktok.com/@${username}`;
    console.log('[BG] 抓取达人Profile页:', profileUrl);

    const response = await fetchWithTimeout(profileUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': navigator.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, 10000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // 尝试多种方式解析达人数据
    let data = null;

    // 方式1：__UNIVERSAL_DATA_FOR_REHYDRATION__ (新版TikTok)
    const uniMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>\s*(\{.*?\})\s*<\/script>/s);
    if (uniMatch) {
      try {
        const parsed = JSON.parse(uniMatch[1]);
        // 数据路径: __DEFAULT_SCOPE__."webapp.user-detail".userInfo
        const scope = parsed['__DEFAULT_SCOPE__'] || {};
        const userDetail = scope['webapp.user-detail'] || {};
        const userInfo = userDetail.userInfo || {};
        const user = userInfo.user || {};
        const stats = userInfo.stats || {};

        if (user.id) {
          data = {
            tiktokId: user.uniqueId || user.id,
            nickname: user.nickname || '',
            followers: user.followerCount || stats.followerCount || 0,
            totalLikes: stats.heartCount || stats.diggCount || stats.heart || 0
          };
          console.log('[BG] ✅ 从 UNIVERSAL_DATA 提取达人数据:', JSON.stringify(data));
        }
      } catch (e) {
        console.warn('[BG] 解析 UNIVERSAL_DATA 失败:', e.message);
      }
    }

    // 方式2：SIGI_STATE (旧版TikTok)
    if (!data) {
      const sigiMatch = html.match(/<script[^>]*id="SIGI_STATE"[^>]*>\s*(\{.*?\})\s*<\/script>/s);
      if (sigiMatch) {
        try {
          const parsed = JSON.parse(sigiMatch[1]);
          const userModule = parsed?.UserModule || {};
          const users = userModule.users || {};
          const usernameKey = Object.keys(users).find(k =>
            users[k]?.uniqueId?.toLowerCase() === username.toLowerCase()
          ) || Object.keys(users)[0];
          const user = users[usernameKey] || {};

          if (user.id) {
            data = {
              tiktokId: user.uniqueId || user.id,
              nickname: user.nickname || '',
              followers: user.followerCount || 0,
              totalLikes: (userStats(user, parsed) || 0)
            };
            console.log('[BG] ✅ 从 SIGI_STATE 提取达人数据:', JSON.stringify(data));
          }

          function userStats(u, full) {
            if (u.stats) return u.stats.heartCount || u.stats.diggCount || 0;
            const sm = full?.StatsModule || {};
            const su = sm.userStats || {};
            const key = Object.keys(su)[0];
            return su[key]?.heartCount || su[key]?.diggCount || 0;
          }
        } catch (e) {
          console.warn('[BG] 解析 SIGI_STATE 失败:', e.message);
        }
      }
    }

    // 方式3：window.__INIT_PROPS__ / 内联脚本
    if (!data) {
      const propsMatch = html.match(/<script[^>]*>\s*window\.__INIT_PROPS__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
      if (propsMatch) {
        try {
          const parsed = JSON.parse(propsMatch[1]);
          const info = (parsed?.UserModule || parsed?.userInfo || parsed?.user || {});
          if (info.id || info.uniqueId) {
            data = {
              tiktokId: info.uniqueId || info.id,
              nickname: info.nickname || '',
              followers: info.followerCount || 0,
              totalLikes: info.heartCount || info.diggCount || 0
            };
            console.log('[BG] ✅ 从 __INIT_PROPS__ 提取达人数据:', JSON.stringify(data));
          }
        } catch (e) {
          console.warn('[BG] 解析 __INIT_PROPS__ 失败:', e.message);
        }
      }
    }

    // 方式4：搜索页面上的JSON-LD / meta标签（兜底）
    if (!data) {
      // 尝试从RENDER_DATA中提取
      const renderMatch = html.match(/window\.__RENDER_DATA__\s*=\s*'([^']+)'/);
      if (renderMatch && renderMatch[1]) {
        try {
          const decoded = decodeURIComponent(atob(renderMatch[1]));
          const parsed = JSON.parse(decoded);
          const findUser = (obj) => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.uniqueId && obj.followerCount !== undefined) return obj;
            for (const k of Object.keys(obj)) {
              const r = findUser(obj[k]);
              if (r) return r;
            }
            return null;
          };
          const u = findUser(parsed);
          if (u) {
            data = {
              tiktokId: u.uniqueId,
              nickname: u.nickname || '',
              followers: u.followerCount || 0,
              totalLikes: u.heartCount || u.diggCount || 0
            };
            console.log('[BG] ✅ 从 RENDER_DATA 提取达人数据:', JSON.stringify(data));
          }
        } catch (e) {
          console.warn('[BG] 解析 RENDER_DATA 失败:', e.message);
        }
      }
    }

    if (!data) {
      throw new Error('未能从Profile页提取到达人数据');
    }

    return data;
  } catch (error) {
    console.error('[BG] 抓取达人Profile页失败:', error.message);
    throw error;
  }
}

/**
 * 获取当前登录 BD 的三语私信模板
 */
async function getMessageTemplate() {
  try {
    const { accessToken } = await chrome.storage.local.get(['accessToken']);

    if (!accessToken) {
      throw new Error('未登录');
    }

    const apiBaseUrl = await getApiBaseUrl();

    const response = await apiRequest(`${apiBaseUrl}/api/tiktok-extension-data/message-template`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || '获取私信模板失败');
    }

    // 返回三语模板对象 { th, en, zh }
    return result.templates || { th: '', en: '', zh: '' };
  } catch (error) {
    console.error('获取私信模板失败:', error.message);
    throw error;
  }
}

/**
 * ★★ 核心：抓取TikTok视频详情页，提取完整统计数据
 * 通过请求video内页HTML，从中解析SIGI_STATE获取播放量、点赞、评论等完整数据
 */
async function fetchVideoPageData(videoUrl) {
  console.log('[BG] 开始抓取视频页面:', videoUrl);
  
  try {
    // 1. 请求video内页的HTML（携带cookie等认证信息）
    const response = await fetchWithTimeout(videoUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': navigator.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, 10000); // 10秒超时
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 2. 从HTML中提取SIGI_STATE数据
    const videoData = extractSigiStateFromHtml(html, videoUrl);
    
    if (videoData) {
      console.log('[BG] ✅ 成功提取视频数据:', videoData);
      return videoData;
    } else {
      throw new Error('未能从页面提取到SIGI_STATE数据');
    }
    
  } catch (error) {
    console.error('[BG] 抓取视频页面失败:', error.message);
    throw error;
  }
}

/**
 * 从TikTok HTML页面源码中提取SIGI_STATE或UNIVERSAL_DATA中的视频统计数据
 */
function extractSigiStateFromHtml(html, sourceUrl) {
  try {
    // 尝试提取SIGI_STATE
    let sigiMatch = html.match(/window\.__RENDER_DATA__\s*=\s*'([^']+)'/);
    
    if (sigiMatch && sigiMatch[1]) {
      try {
        // TikTok使用base64编码存储__RENDER_DATA__
        const decoded = decodeURIComponent(atob(sigiMatch[1]));
        const data = JSON.parse(decoded);
        
        console.log('[BG] 找到 __RENDER_DATA__, 开始搜索视频数据...');
        
        // 在解码后的数据中搜索视频统计
        const result = findVideoStatsInData(data);
        
        if (result) {
          return result;
        }
      } catch (e) {
        console.warn('[BG] 解析__RENDER_DATA__失败:', e.message);
      }
    }
    
    // 备用：尝试直接从HTML匹配SIGI_STATE JSON
    sigiMatch = html.match(/window\.SIGI_STATE\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/);
    
    if (sigiMatch && sigiMatch[1]) {
      try {
        const data = new Function(`return ${sigiMatch[1]}`)();
        
        console.log('[BG] 找到 SIGI_STATE, keys:', Object.keys(data));
        
        const result = findVideoStatsInData(data);
        
        if (result) {
          return result;
        }
      } catch (e) {
        console.warn('[BG] 解析SIGI_STATE失败:', e.message);
      }
    }
    
    // 第三种：尝试__UNIVERSAL_DATA_FOR_REHYDRATION__
    const uniMatch = html.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/);
    
    if (uniMatch && uniMatch[1]) {
      try {
        const data = new Function(`return ${uniMatch[1]}`)();
        
        console.log('[BG] 找到 UNIVERSAL_DATA');
        
        const result = findVideoStatsInData(data);
        
        if (result) {
          return result;
        }
      } catch (e) {
        console.warn('[BG] 解析UNIVERSAL_DATA失败:', e.message);
      }
    }
    
    console.log('[BG] ⚠️ 所有数据源都未找到有效视频统计数据');
    return null;
    
  } catch (e) {
    console.error('[BG] extractSigiStateFromHtml 异常:', e.message);
    return null;
  }
}

/**
 * 在已解析的数据对象中递归搜索视频统计数据
 */
function findVideoStatsInData(obj, depth = 0) {
  if (!obj || depth > 12 || typeof obj !== 'object') return null;
  
  // 检查当前对象是否包含视频统计数据
  const hasVideoStats = obj.stats && (
    obj.stats.playCount !== undefined ||
    obj.stats.diggCount !== undefined ||
    obj.stats.commentCount !== undefined
  );
  
  if (hasVideoStats) {
    const stats = obj.stats;
    console.log(`[BG] ✅ 找到视频统计: play=${stats.playCount} digg=${stats.diggCount} comment=${stats.commentCount}`);
    
    return {
      plays: parseInt(stats.playCount) || 0,
      likes: parseInt(stats.diggCount) || parseInt(stats.likeCount) || 0,
      comments: parseInt(stats.commentCount) || 0,
      shares: parseInt(stats.shareCount) || 0,
      saves: parseInt(stats.collectCount) || parseInt(stats.favoriteCount) || 0
    };
  }
  
  // 检查顶层字段（有些结构是扁平的）
  if (obj.playCount !== undefined || obj.diggCount !== undefined) {
    return {
      plays: parseInt(obj.playCount) || 0,
      likes: parseInt(obj.diggCount) || parseInt(obj.likeCount) || 0,
      comments: parseInt(obj.commentCount) || 0,
      shares: parseInt(obj.shareCount) || 0,
      saves: parseInt(obj.collectCount) || 0
    };
  }
  
  // 递归搜索
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findVideoStatsInData(item, depth + 1);
      if (result) return result;
    }
    return null;
  }
  
  // 优先检查常见路径
  const priorityKeys = ['ItemList', 'itemList', 'items', 'data', 'contents'];
  for (const pk of priorityKeys) {
    if (obj[pk] && typeof obj[pk] === 'object') {
      const result = findVideoStatsInData(obj[pk], depth + 1);
      if (result) return result;
    }
  }
  
  for (const key of Object.keys(obj)) {
    if (['innerHTML', 'outerHTML', '__proto__', 'constructor'].includes(key)) continue;
    if (typeof obj[key] === 'object' && obj[key] !== null && !priorityKeys.includes(key)) {
      const result = findVideoStatsInData(obj[key], depth + 1);
      if (result) return result;
    }
  }
  
  return null;
}
