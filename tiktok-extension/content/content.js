/**
 * LazyFirst TikTok 数据采集器 - Content Script
 * 注入到TikTok页面，解析DOM数据，显示覆盖层
 */

console.log('LazyFirst Extension: Content Script 加载');

// 等待页面加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('LazyFirst Extension: 初始化Content Script');
  
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
 * 处理搜索页
 */
function handleSearchPage() {
  console.log('处理搜索页');
  
  // 添加"批量导入"按钮到页面顶部
  addBatchImportButton();
  
  // 使用MutationObserver监听页面变化（TikTok是SPA）
  const observer = new MutationObserver(() => {
    // 查找视频卡片
    const videoCards = document.querySelectorAll('[data-e2e="video-card"]');
    
    videoCards.forEach(card => {
      // 避免重复添加按钮
      if (card.querySelector('.lazyfirst-import-btn')) {
        return;
      }
      
      // 提取达人信息
      const authorData = extractAuthorDataFromSearchCard(card);
      
      if (authorData) {
        // 添加"导入"按钮
        addImportButton(card, authorData);
        
        // 添加复选框（用于批量选择）
        addCheckbox(card, authorData);
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 处理达人主页
 */
function handleProfilePage() {
  console.log('处理达人主页');
  
  // 提取达人详细信息
  const authorData = extractAuthorDataFromProfile();
  
  if (authorData) {
    // 查询LazyFirst系统中的历史数据
    checkInfluencerInLazyFirst(authorData.tiktokId)
      .then(result => {
        if (result.success && result.influencer) {
          // 显示覆盖层（历史数据）
          showOverlay(authorData, result.influencer);
        } else {
          // 显示"导入"按钮
          showImportButton(authorData);
        }
      });
  }
}

/**
 * 处理视频详情页
 */
function handleVideoPage() {
  console.log('处理视频详情页');
  
  // 提取视频和达人信息
  const videoData = extractVideoData();
  const authorData = extractAuthorDataFromVideo();
  
  if (authorData) {
    // 查询LazyFirst系统中的历史数据
    checkInfluencerInLazyFirst(authorData.tiktokId)
      .then(result => {
        if (result.success && result.influencer) {
          // 显示覆盖层（历史数据）
          showOverlay(authorData, result.influencer);
        } else {
          // 显示"导入"按钮
          showImportButton(authorData);
        }
      });
  }
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
    const tiktokId = authorLink.getAttribute('href').replace('/', '').replace('@', '@');
    
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
      followerCount: followerCount
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
      likesCount: likes ? parseCount(likes.textContent) : 0
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
    
    return {
      tiktokId: authorLink.getAttribute('href').replace('/', ''),
      username: authorLink.textContent,
      nickname: authorName ? authorName.textContent : '',
      followerCount: followers ? parseFollowers(followers.textContent) : 0
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
 * 添加"导入"按钮
 */
function addImportButton(card, authorData) {
  const button = document.createElement('button');
  button.className = 'lazyfirst-import-btn';
  button.textContent = '导入到LazyFirst';
  button.onclick = () => importToLazyFirst(authorData);
  
  card.appendChild(button);
}

/**
 * 添加"批量导入"按钮
 */
function addBatchImportButton() {
  // 避免重复添加
  if (document.getElementById('lazyfirst-batch-import-btn')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'lazyfirst-batch-import-btn';
  button.className = 'lazyfirst-import-btn';
  button.textContent = '批量导入到LazyFirst';
  button.style.position = 'fixed';
  button.style.top = '60px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.background = '#4caf50';
  button.onclick = () => batchImportToLazyFirst();
  
  document.body.appendChild(button);
}

/**
 * 添加复选框
 */
function addCheckbox(card, authorData) {
  // 避免重复添加
  if (card.querySelector('.lazyfirst-checkbox')) {
    return;
  }
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'lazyfirst-checkbox';
  checkbox.dataset.tiktokId = authorData.tiktokId;
  checkbox.dataset.authorData = JSON.stringify(authorData);
  checkbox.style.position = 'absolute';
  checkbox.style.top = '10px';
  checkbox.style.left = '10px';
  checkbox.style.zIndex = '9999';
  
  card.style.position = 'relative';
  card.appendChild(checkbox);
}

/**
 * 显示"导入"按钮（达人主页/视频详情页）
 */
function showImportButton(authorData) {
  const button = document.createElement('button');
  button.className = 'lazyfirst-import-btn';
  button.textContent = '导入到LazyFirst';
  button.style.position = 'fixed';
  button.style.top = '60px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.onclick = () => importToLazyFirst(authorData);
  
  document.body.appendChild(button);
}

/**
 * 显示覆盖层（历史数据）
 */
function showOverlay(authorData, influencer) {
  const overlay = document.createElement('div');
  overlay.className = 'lazyfirst-overlay';
  overlay.innerHTML = `
    <h4>LazyFirst 数据</h4>
    <div class="metric">
      <span class="metric-label">粉丝数</span>
      <span class="metric-value">${influencer.latestFollowers || 0}</span>
    </div>
    <div class="metric">
      <span class="metric-label">GMV</span>
      <span class="metric-value">${influencer.latestGmv || 0}</span>
    </div>
    <div class="metric">
      <span class="metric-label">月销件数</span>
      <span class="metric-value">${influencer.monthlySalesCount || 0}</span>
    </div>
    <div class="metric">
      <span class="metric-label">平均播放量</span>
      <span class="metric-value">${influencer.avgVideoViews || 0}</span>
    </div>
    <button class="import-btn" onclick="updateInfluencerData('${authorData.tiktokId}')">
      更新数据
    </button>
  `;
  
  overlay.style.position = 'fixed';
  overlay.style.top = '60px';
  overlay.style.right = '20px';
  overlay.style.zIndex = '9999';
  
  document.body.appendChild(overlay);
}

/**
 * 导入到LazyFirst
 */
async function importToLazyFirst(authorData) {
  console.log('导入达人到LazyFirst:', authorData);
  
  // 发送消息到Background
  chrome.runtime.sendMessage({
    type: 'IMPORT_INFLUENCER',
    data: authorData
  }, response => {
    if (response.success) {
      alert('导入成功！' + response.message);
    } else {
      alert('导入失败：' + response.message);
    }
  });
}

/**
 * 批量导入到LazyFirst
 */
async function batchImportToLazyFirst() {
  console.log('批量导入达人到LazyFirst');
  
  // 获取所有选中的复选框
  const checkboxes = document.querySelectorAll('.lazyfirst-checkbox:checked');
  
  if (checkboxes.length === 0) {
    alert('请先选择要导入的达人');
    return;
  }
  
  // 提取达人数据
  const influencersData = [];
  checkboxes.forEach(checkbox => {
    const authorData = JSON.parse(checkbox.dataset.authorData);
    influencersData.push(authorData);
  });
  
  console.log(`准备批量导入 ${influencersData.length} 个达人`);
  
  // 发送消息到Background
  chrome.runtime.sendMessage({
    type: 'BATCH_IMPORT_INFLUENCERS',
    data: influencersData
  }, response => {
    if (response.success) {
      const results = response.results;
      alert(`批量导入完成！\n成功: ${results.success}\n失败: ${results.failed}`);
    } else {
      alert('批量导入失败：' + response.message);
    }
  });
}

/**
 * 查询达人在LazyFirst中是否存在
 */
async function checkInfluencerInLazyFirst(tiktokId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'FETCH_INFLUENCER',
      tiktokId: tiktokId
    }, response => {
      if (response.success && response.influencer) {
        resolve({ success: true, influencer: response.influencer });
      } else {
        resolve({ success: false });
      }
    });
  });
}

/**
 * 更新达人数据
 */
async function updateInfluencerData(tiktokId) {
  console.log('更新达人数据:', tiktokId);
  
  // 提取最新数据
  const authorData = extractAuthorDataFromProfile();
  
  // 发送消息到Background
  chrome.runtime.sendMessage({
    type: 'IMPORT_INFLUENCER',
    data: authorData
  }, response => {
    if (response.success) {
      alert('更新成功！' + response.message);
    } else {
      alert('更新失败：' + response.message);
    }
  });
}
