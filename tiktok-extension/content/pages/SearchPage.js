/**
 * 搜索页处理逻辑
 */

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

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleSearchPage,
    extractAuthorDataFromSearchCard,
    addImportButton,
    addBatchImportButton,
    addCheckbox,
    importToLazyFirst,
    batchImportToLazyFirst
  };
}
