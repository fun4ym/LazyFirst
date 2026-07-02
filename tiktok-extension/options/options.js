/**
 * LazyFirst TikTok 数据采集器 - Options Script
 * 处理设置页面的逻辑
 */

console.log('LazyFirst Extension: Options 加载');

// 默认设置
const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:3001/api',
  autoSync: false,
  syncInterval: 60,
  showNotifications: true,
  showOverlay: true,
  showGmv: true,
  showFv: true,
  showBatchImport: true
};

// 页面加载时读取设置
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options DOM加载完成');
  loadSettings();
  bindEvents();
});

/**
 * 加载设置
 */
async function loadSettings() {
  console.log('加载设置...');
  
  try {
    const settings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    
    // 填充表单
    document.getElementById('api-url').value = settings.apiUrl || DEFAULT_SETTINGS.apiUrl;
    document.getElementById('auto-sync').checked = settings.autoSync || DEFAULT_SETTINGS.autoSync;
    document.getElementById('sync-interval').value = settings.syncInterval || DEFAULT_SETTINGS.syncInterval;
    document.getElementById('show-notifications').checked = settings.showNotifications !== false;
    document.getElementById('show-overlay').checked = settings.showOverlay !== false;
    document.getElementById('show-gmv').checked = settings.showGmv !== false;
    document.getElementById('show-fv').checked = settings.showFv !== false;
    document.getElementById('show-batch-import').checked = settings.showBatchImport !== false;
    
    // 加载缓存大小
    updateCacheSize();
    
    console.log('设置加载成功:', settings);
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

/**
 * 保存设置
 */
async function saveSettings() {
  console.log('保存设置...');
  
  const settings = {
    apiUrl: document.getElementById('api-url').value.trim(),
    autoSync: document.getElementById('auto-sync').checked,
    syncInterval: parseInt(document.getElementById('sync-interval').value) || DEFAULT_SETTINGS.syncInterval,
    showNotifications: document.getElementById('show-notifications').checked,
    showOverlay: document.getElementById('show-overlay').checked,
    showGmv: document.getElementById('show-gmv').checked,
    showFv: document.getElementById('show-fv').checked,
    showBatchImport: document.getElementById('show-batch-import').checked
  };
  
  // 验证API地址
  if (!settings.apiUrl) {
    showStatus('请输入API地址', 'error');
    return;
  }
  
  try {
    // 保存到chrome.storage
    await chrome.storage.local.set(settings);
    
    console.log('设置保存成功:', settings);
    showStatus('设置已保存', 'success');
  } catch (error) {
    console.error('保存设置失败:', error);
    showStatus('保存失败: ' + error.message, 'error');
  }
}

/**
 * 恢复默认设置
 */
async function resetSettings() {
  console.log('恢复默认设置...');
  
  try {
    // 保存默认设置
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    
    // 重新加载表单
    loadSettings();
    
    console.log('默认设置已恢复');
    showStatus('已恢复默认设置', 'success');
  } catch (error) {
    console.error('恢复默认设置失败:', error);
    showStatus('恢复失败: ' + error.message, 'error');
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  console.log('绑定事件...');
  
  // 保存按钮
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  
  // 恢复默认按钮
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  
  // 测试API连接按钮
  document.getElementById('test-api-btn').addEventListener('click', testAPIConnection);
  
  // 清除缓存按钮
  document.getElementById('clear-cache-btn').addEventListener('click', clearCache);
}

/**
 * 测试API连接
 */
async function testAPIConnection() {
  console.log('测试API连接...');
  
  const apiUrl = document.getElementById('api-url').value.trim();
  const resultElem = document.getElementById('api-test-result');
  
  if (!apiUrl) {
    resultElem.textContent = '请输入API地址';
    resultElem.style.color = '#f44336';
    return;
  }
  
  resultElem.textContent = '测试中...';
  resultElem.style.color = '#666';
  
  try {
    // 调用LazyFirst API（检查健康状态）
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/../health`, {
      method: 'GET'
    });
    
    if (response.ok) {
      resultElem.textContent = 'API连接成功！';
      resultElem.style.color = '#4caf50';
    } else {
      resultElem.textContent = 'API连接失败：' + response.status;
      resultElem.style.color = '#f44336';
    }
  } catch (error) {
    console.error('API连接测试失败:', error);
    resultElem.textContent = 'API连接失败：' + error.message;
    resultElem.style.color = '#f44336';
  }
}

/**
 * 清除缓存
 */
async function clearCache() {
  console.log('清除缓存...');
  
  try {
    // 获取所有缓存键
    const allData = await chrome.storage.local.get();
    const cacheKeys = Object.keys(allData).filter(key => key.startsWith('cache_'));
    
    // 删除缓存
    await chrome.storage.local.remove(cacheKeys);
    
    console.log(`已清除 ${cacheKeys.length} 个缓存项`);
    showStatus('缓存已清除', 'success');
    
    // 更新缓存大小显示
    updateCacheSize();
  } catch (error) {
    console.error('清除缓存失败:', error);
    showStatus('清除缓存失败: ' + error.message, 'error');
  }
}

/**
 * 更新缓存大小显示
 */
async function updateCacheSize() {
  console.log('更新缓存大小...');
  
  try {
    const allData = await chrome.storage.local.get();
    const cacheKeys = Object.keys(allData).filter(key => key.startsWith('cache_'));
    
    const sizeElem = document.getElementById('cache-size');
    sizeElem.textContent = `当前缓存: ${cacheKeys.length} 项`;
  } catch (error) {
    console.error('更新缓存大小失败:', error);
  }
}

/**
 * 显示状态消息
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('save-status');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  // 3秒后自动隐藏
  setTimeout(() => {
    statusDiv.className = 'status-message';
  }, 3000);
}
