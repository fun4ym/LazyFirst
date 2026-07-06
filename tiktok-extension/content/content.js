/**
 * LazyFirst TikTok 数据采集器 - Content Script
 * 注入到TikTok页面，自动解析DOM数据并静默上传
 */

console.log('LazyFirst Extension: Content Script 加载');

// 全局状态
let lastProcessedUrl = ''; // 上次处理的URL，防止重复处理
let processingDelay = 2000; // 页面加载后延迟处理的时间（毫秒）

// 等待页面加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * 显示通知提示（仅在DEBUG模式下显示）
 */
function showNotification(message, type = 'info', duration = 3000) {
  // 检查是否开启DEBUG模式
  chrome.storage.local.get(['debugMode'], (result) => {
    if (!result.debugMode) {
      return; // 非DEBUG模式不显示通知
    }
    
    // 移除已有通知
    const existingNotification = document.querySelector('.lazyfirst-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `lazyfirst-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'lazyfirst-slide-out 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  });
}

function init() {
  console.log('LazyFirst Extension: 初始化Content Script');
  
  // 延迟执行，等待页面完全加载
  setTimeout(() => {
    // 检测当前页面类型
    const pageType = detectPageType();
    console.log('当前页面类型:', pageType);
    
    // 根据页面类型执行不同的逻辑
    if (pageType === 'search') {
      handleSearchPage();
    } else if (pageType === 'profile') {
      handleProfilePage();
    } else if (pageType === 'video') {
      handleVideoPage();
    }
    
    // 记录当前URL
    lastProcessedUrl = window.location.href;
  }, processingDelay);
  
  // 监听URL变化（TikTok是SPA，URL会变化但页面不刷新）
  observeUrlChanges();
}

/**
 * 检测页面类型
 */
function detectPageType() {
  const url = window.location.href;
  
  if (url.includes('/search')) {
    return 'search';
  } else if (url.match(/\/@[\w.]+$/)) {
    return 'profile';
  } else if (url.includes('/video/')) {
    return 'video';
  }
  
  return 'unknown';
}

/**
 * 监听URL变化（SPA路由变化）
 */
function observeUrlChanges() {
  // 使用History API监听URL变化
  let lastUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL变化:', currentUrl);
      
      // 延迟处理新的页面
      setTimeout(() => {
        const pageType = detectPageType();
        console.log('新页面类型:', pageType);
        
        if (pageType === 'search') {
          handleSearchPage();
        } else if (pageType === 'profile') {
          handleProfilePage();
        } else if (pageType === 'video') {
          handleVideoPage();
        }
      }, processingDelay);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 处理搜索页 - 采集所有视频卡片中的达人数据
 */
function handleSearchPage() {
  console.log('处理搜索页 - 静默采集模式');
  
  // 使用MutationObserver监听页面变化（TikTok是SPA）
  const observer = new MutationObserver(() => {
    // 查找视频卡片
    const videoCards = document.querySelectorAll('[data-e2e="video-card"]');
    
    videoCards.forEach(card => {
      // 避免重复处理
      if (card.dataset.lazyfirstProcessed) {
        return;
      }
      
      // 提取达人信息
      const authorData = extractAuthorDataFromSearchCard(card);
      
      if (authorData) {
        // 标记已处理
        card.dataset.lazyfirstProcessed = 'true';
        
        // 静默上传数据
        uploadAuthorData(authorData);
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 处理达人主页 - 采集达人详细信息
 */
function handleProfilePage() {
  console.log('处理达人主页 - 静默采集模式');
  
  // 延迟执行，等待页面完全加载
  setTimeout(() => {
    // 提取达人详细信息
    const authorData = extractAuthorDataFromProfile();
    
    if (authorData) {
      // 静默上传数据
      uploadAuthorData(authorData);
    }
  }, processingDelay);
}

/**
 * 处理视频详情页 - 采集视频和达人数据
 */
function handleVideoPage() {
  console.log('处理视频详情页 - 静默采集模式');
  
  // 延迟执行，等待页面完全加载
  setTimeout(() => {
    // 提取视频和达人信息
    const videoData = extractVideoData();
    const authorData = extractAuthorDataFromVideo();
    
    if (authorData) {
      // 合并视频数据到达人数据
      authorData.latestVideo = videoData;
      
      // 静默上传数据
      uploadAuthorData(authorData);
    }
  }, processingDelay);
}

/**
 * 从搜索页卡片中提取达人信息
 */
function extractAuthorDataFromSearchCard(card) {
  try {
    // 多种选择器备用
    const authorLinkSelectors = [
      'a[href^="/@"]',
      'a[href*="@"]',
      '.video-author a',
      '[class*="author"] a'
    ];
    
    let authorLink = null;
    for (const selector of authorLinkSelectors) {
      authorLink = card.querySelector(selector);
      if (authorLink) break;
    }
    
    if (!authorLink) {
      console.log('未找到作者链接');
      return null;
    }
    
    // 提取用户名
    const href = authorLink.getAttribute('href');
    const tiktokId = href.startsWith('/') ? href : '/' + href;
    
    // 提取昵称（多种选择器备用）
    const nicknameSelectors = [
      '[data-e2e="video-author-uniqueid"]',
      '[class*="author-uniqueid"]',
      '[class*="author-name"]',
      '.author-name'
    ];
    
    let nickname = '';
    for (const selector of nicknameSelectors) {
      const elem = card.querySelector(selector);
      if (elem) {
        nickname = elem.textContent;
        break;
      }
    }
    
    // 提取粉丝数（多种选择器备用）
    const followersSelectors = [
      '[data-e2e="video-author-followers"]',
      '[class*="followers"]',
      '[class*="fan"]'
    ];
    
    let followerCount = 0;
    for (const selector of followersSelectors) {
      const elem = card.querySelector(selector);
      if (elem) {
        followerCount = parseFollowers(elem.textContent);
        break;
      }
    }
    
    return {
      tiktokId: tiktokId,
      username: authorLink.textContent,
      nickname: nickname,
      followerCount: followerCount,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('提取达人信息失败:', error);
    return null;
  }
}

/**
 * 从达人主页提取达人信息
 */
function extractAuthorDataFromProfile() {
  try {
    const username = document.querySelector('h1[data-e2e="user-title"]');
    const nickname = document.querySelector('h2[data-e2e="user-subtitle"]');
    const followers = document.querySelector('strong[data-e2e="followers-count"]');
    const following = document.querySelector('strong[data-e2e="following-count"]');
    const likes = document.querySelector('strong[data-e2e="likes-count"]');
    
    return {
      tiktokId: window.location.pathname,
      username: username ? username.textContent : '',
      nickname: nickname ? nickname.textContent : '',
      followerCount: followers ? parseCount(followers.textContent) : 0,
      followingCount: following ? parseCount(following.textContent) : 0,
      likesCount: likes ? parseCount(likes.textContent) : 0,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('提取达人信息失败:', error);
    return null;
  }
}

/**
 * 从视频详情页提取达人信息
 */
function extractAuthorDataFromVideo() {
  try {
    const authorLink = document.querySelector('a[href^="/@"]');
    const authorName = document.querySelector('[data-e2e="video-author-uniqueid"]');
    const followers = document.querySelector('[data-e2e="video-author-followers"]');
    
    if (!authorLink) {
      return null;
    }
    
    const href = authorLink.getAttribute('href');
    const tiktokId = href.startsWith('/') ? href : '/' + href;
    
    return {
      tiktokId: tiktokId,
      username: authorLink.textContent,
      nickname: authorName ? authorName.textContent : '',
      followerCount: followers ? parseFollowers(followers.textContent) : 0,
      collectedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('提取达人信息失败:', error);
    return null;
  }
}

/**
 * 提取视频数据
 */
function extractVideoData() {
  try {
    const title = document.querySelector('h1[data-e2e="video-title"]');
    const plays = document.querySelector('strong[data-e2e="video-plays"]');
    const likes = document.querySelector('strong[data-e2e="video-likes"]');
    const comments = document.querySelector('strong[data-e2e="video-comments"]');
    const shares = document.querySelector('strong[data-e2e="video-shares"]');
    
    return {
      title: title ? title.textContent : '',
      plays: plays ? parseCount(plays.textContent) : 0,
      likes: likes ? parseCount(likes.textContent) : 0,
      comments: comments ? parseCount(comments.textContent) : 0,
      shares: shares ? parseCount(shares.textContent) : 0
    };
  } catch (error) {
    console.error('提取视频数据失败:', error);
    return null;
  }
}

/**
 * 解析粉丝数（处理"1.2M"、"3.5K"等格式）
 */
function parseFollowers(text) {
  if (!text) return 0;
  
  text = text.trim().toUpperCase();
  
  if (text.includes('M')) {
    return parseFloat(text) * 1000000;
  } else if (text.includes('K')) {
    return parseFloat(text) * 1000;
  } else {
    return parseInt(text.replace(/,/g, '')) || 0;
  }
}

/**
 * 解析数量（处理"1.2M"、"3.5K"等格式）
 */
function parseCount(text) {
  if (!text) return 0;
  
  text = text.trim().toUpperCase();
  
  if (text.includes('M')) {
    return parseFloat(text) * 1000000;
  } else if (text.includes('K')) {
    return parseFloat(text) * 1000;
  } else {
    return parseInt(text.replace(/,/g, '')) || 0;
  }
}

/**
 * 静默上传达人数据到扩展后台
 */
function uploadAuthorData(authorData) {
  console.log('静默上传达人数据:', authorData);
  
  // 构造完整的数据对象
  const fullData = {
    ...authorData,
    rawData: authorData // 保存完整原始数据
  };
  
  // 发送消息到Background
  chrome.runtime.sendMessage({
    type: 'SAVE_COLLECTED_DATA',
    data: fullData
  }, response => {
    if (response && response.success) {
      console.log('数据上传成功:', response);
      showNotification('数据已采集: ' + authorData.tiktokId, 'success', 2000);
    } else {
      console.error('数据上传失败:', response);
    }
  });
}
