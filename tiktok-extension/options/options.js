/**
 * LazyFirst TikTok 数据采集器 - Options Script
 * 处理设置页面的逻辑
 */

console.log('LazyFirst Extension: Options 加载');

// 默认设置
const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:3000',
  autoSync: false,
  syncInterval: 60,
  showNotifications: true,
  showOverlay: true,
  showVideoTags: true,
  showGmv: true,
  showFv: true,
  showBatchImport: true
};

// 默认统计数据
const DEFAULT_STATS = {
  totalImports: 0,
  todayImports: 0,
  successCount: 0,
  failureCount: 0,
  lastImportDate: null
};

// 页面加载时读取设置
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options DOM加载完成');
  loadSettings();
  loadStats();
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
    document.getElementById('show-video-tags').checked = settings.showVideoTags !== false;
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
    showVideoTags: document.getElementById('show-video-tags').checked,
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
  
  // 重置统计按钮
  document.getElementById('reset-stats-btn').addEventListener('click', resetStats);
  
  // 导出配置按钮
  document.getElementById('export-config-btn').addEventListener('click', exportConfig);
  
  // 导入配置按钮
  document.getElementById('import-config-btn').addEventListener('click', importConfig);
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
    // 方法1：测试健康检查端点
    let response = await fetch(`${apiUrl}/../health`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (response.ok) {
      resultElem.textContent = '✓ API连接成功！（健康检查）';
      resultElem.style.color = '#4caf50';
      return;
    }
  } catch (error) {
    console.log('健康检查端点不可达，尝试其他方法...');
  }
  
  try {
    // 方法2：测试API根路径
    let response = await fetch(apiUrl, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (response.status === 401 || response.status === 403) {
      // 需要认证，说明API可达
      resultElem.textContent = '✓ API地址正确（需要登录）';
      resultElem.style.color = '#4caf50';
      return;
    }
    
    if (response.ok) {
      resultElem.textContent = '✓ API连接成功！';
      resultElem.style.color = '#4caf50';
      return;
    }
  } catch (error) {
    console.error('API连接测试失败:', error);
  }
  
  // 所有方法都失败
  resultElem.textContent = '✗ API连接失败，请检查地址';
  resultElem.style.color = '#f44336';
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

/**
 * 加载统计数据
 */
async function loadStats() {
  console.log('加载统计数据...');
  
  try {
    const stats = await chrome.storage.local.get(Object.keys(DEFAULT_STATS));
    updateStatsDisplay(stats);
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

/**
 * 更新统计数据显示
 */
function updateStatsDisplay(stats) {
  const totalImports = stats.totalImports || DEFAULT_STATS.totalImports;
  const todayImports = stats.todayImports || DEFAULT_STATS.todayImports;
  const successCount = stats.successCount || DEFAULT_STATS.successCount;
  const failureCount = stats.failureCount || DEFAULT_STATS.failureCount;
  
  // 计算成功率
  const total = successCount + failureCount;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  
  // 更新显示
  document.getElementById('stat-total-imports').textContent = totalImports;
  document.getElementById('stat-today-imports').textContent = todayImports;
  document.getElementById('stat-success-rate').textContent = successRate + '%';
}

/**
 * 重置统计数据
 */
async function resetStats() {
  console.log('重置统计数据...');
  
  if (!confirm('确定要重置所有统计数据吗？')) {
    return;
  }
  
  try {
    await chrome.storage.local.set(DEFAULT_STATS);
    loadStats();
    showStatus('统计数据已重置', 'success');
  } catch (error) {
    console.error('重置统计数据失败:', error);
    showStatus('重置失败: ' + error.message, 'error');
  }
}

/**
 * 导出配置
 */
async function exportConfig() {
  console.log('导出配置...');
  
  try {
    const settings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const stats = await chrome.storage.local.get(Object.keys(DEFAULT_STATS));
    
    const config = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      settings: settings,
      stats: stats
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `lazyfirst-extension-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showStatus('配置已导出', 'success');
  } catch (error) {
    console.error('导出配置失败:', error);
    showStatus('导出失败: ' + error.message, 'error');
  }
}

/**
 * 导入配置
 */
async function importConfig() {
  console.log('导入配置...');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      // 验证配置格式
      if (!config.settings || !config.version) {
        throw new Error('无效的配置文件');
      }
      
      // 导入设置
      await chrome.storage.local.set(config.settings);
      
      // 导入统计数据（可选）
      if (config.stats) {
        await chrome.storage.local.set(config.stats);
      }
      
      // 重新加载显示
      loadSettings();
      loadStats();
      
      showStatus('配置已导入', 'success');
    } catch (error) {
      console.error('导入配置失败:', error);
      showStatus('导入失败: ' + error.message, 'error');
    }
  };
  
  input.click();
}

/**
 * 更新统计数据的辅助函数（供background.js调用）
 * 注意：这个函数需要在background.js中实现，通过chrome.runtime.sendMessage调用
 */
function updateImportStats(success) {
  chrome.storage.local.get(Object.keys(DEFAULT_STATS), (stats) => {
    stats.totalImports = (stats.totalImports || 0) + 1;
    
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastImportDate !== today) {
      stats.todayImports = 0;
    }
    stats.todayImports = (stats.todayImports || 0) + 1;
    stats.lastImportDate = today;
    
    if (success) {
      stats.successCount = (stats.successCount || 0) + 1;
    } else {
      stats.failureCount = (stats.failureCount || 0) + 1;
    }
    
    chrome.storage.local.set(stats);
  });
}
