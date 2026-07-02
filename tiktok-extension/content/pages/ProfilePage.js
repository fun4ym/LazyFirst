/**
 * 达人主页处理逻辑
 */

/**
 * 处理达人主页
 */
function handleProfilePage() {
  console.log('处理达人主页');
  
  // 提取达人详细信息
  const authorData = extractAuthorDataFromProfile();
  
  if (authorData) {
    console.log('提取到达人数据:', authorData);
    
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
 * 显示"导入"按钮（达人主页）
 */
function showImportButton(authorData) {
  // 避免重复添加
  if (document.getElementById('lazyfirst-import-btn-profile')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'lazyfirst-import-btn-profile';
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
  // 避免重复添加
  if (document.getElementById('lazyfirst-overlay-profile')) {
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'lazyfirst-overlay-profile';
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
      
      // 移除"导入"按钮，显示覆盖层
      const button = document.getElementById('lazyfirst-import-btn-profile');
      if (button) {
        button.remove();
      }
      
      // 重新查询并显示覆盖层
      checkInfluencerInLazyFirst(authorData.tiktokId)
        .then(result => {
          if (result.success && result.influencer) {
            showOverlay(authorData, result.influencer);
          }
        });
    } else {
      alert('导入失败：' + response.message);
    }
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
      
      // 重新查询并显示覆盖层
      checkInfluencerInLazyFirst(tiktokId)
        .then(result => {
          if (result.success && result.influencer) {
            // 移除旧覆盖层
            const oldOverlay = document.getElementById('lazyfirst-overlay-profile');
            if (oldOverlay) {
              oldOverlay.remove();
            }
            
            // 显示新覆盖层
            showOverlay(authorData, result.influencer);
          }
        });
    } else {
      alert('更新失败：' + response.message);
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

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleProfilePage,
    extractAuthorDataFromProfile,
    showImportButton,
    showOverlay,
    importToLazyFirst,
    updateInfluencerData,
    checkInfluencerInLazyFirst
  };
}
