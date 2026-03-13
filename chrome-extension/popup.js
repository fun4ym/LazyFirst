// 获取DOM元素
const pageStatus = document.getElementById('pageStatus');
const apiStatus = document.getElementById('apiStatus');
const messageDiv = document.getElementById('message');
const dataCountDiv = document.getElementById('dataCount');
const sampleCountSpan = document.getElementById('sampleCount');
const scanBtn = document.getElementById('scanBtn');
const syncBtn = document.getElementById('syncBtn');
const exportBtn = document.getElementById('exportBtn');
const apiUrlInput = document.getElementById('apiUrl');
const apiTokenInput = document.getElementById('apiToken');
const saveBtn = document.getElementById('saveBtn');

let scannedData = [];
let settings = {};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载设置
  settings = await chrome.storage.local.get(['apiUrl', 'apiToken']);
  if (settings.apiUrl) apiUrlInput.value = settings.apiUrl;
  if (settings.apiToken) apiTokenInput.value = settings.apiToken;

  // 检查API连接
  await checkApiConnection();

  // 检查当前页面
  await checkPageStatus();
});

// 检查页面状态
async function checkPageStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab.url && tab.url.includes('partner.tiktokshop.com')) {
    pageStatus.textContent = '✅ 已检测到';
    pageStatus.className = 'status-value connected';
    scanBtn.disabled = false;

    // 检查是否已有数据
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { action: 'getData' });
      if (result && result.data) {
        scannedData = result.data;
        showDataCount();
      }
    } catch (error) {
      console.log('No content script loaded yet');
    }
  } else {
    pageStatus.textContent = '❌ 请在TikTok Partner Center页面使用';
    pageStatus.className = 'status-value disconnected';
    scanBtn.disabled = true;
  }
}

// 检查API连接
async function checkApiConnection() {
  if (!settings.apiUrl || !settings.apiToken) {
    apiStatus.textContent = '❌ 未配置';
    apiStatus.className = 'status-value disconnected';
    return;
  }

  try {
    const response = await fetch(`${settings.apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`
      }
    });

    if (response.ok) {
      apiStatus.textContent = '✅ 已连接';
      apiStatus.className = 'status-value connected';
    } else {
      throw new Error('Invalid token');
    }
  } catch (error) {
    apiStatus.textContent = '❌ 连接失败';
    apiStatus.className = 'status-value disconnected';
  }
}

// 显示消息
function showMessage(message, type = 'error') {
  messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => {
    messageDiv.innerHTML = '';
  }, 5000);
}

// 显示数据计数
function showDataCount() {
  sampleCountSpan.textContent = scannedData.length;
  dataCountDiv.style.display = 'block';
  syncBtn.disabled = false;
  exportBtn.disabled = false;
}

// 扫描页面
scanBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'scan' });

    if (result && result.data) {
      scannedData = result.data;
      showDataCount();
      showMessage(`成功扫描到 ${scannedData.length} 条样品数据`, 'success');
    } else {
      showMessage('未扫描到数据，请确保页面已完全加载', 'error');
    }
  } catch (error) {
    console.error('Scan error:', error);
    showMessage('扫描失败，请刷新页面后重试', 'error');
  }
});

// 同步到TAP系统
syncBtn.addEventListener('click', async () => {
  if (!settings.apiUrl || !settings.apiToken) {
    showMessage('请先配置API地址和Token', 'error');
    return;
  }

  try {
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ 同步中...';

    let successCount = 0;
    let errorCount = 0;

    for (const sample of scannedData) {
      try {
        const response = await fetch(`${settings.apiUrl}/samples`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiToken}`
          },
          body: JSON.stringify(sample)
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error('Sync failed for:', sample);
        }
      } catch (error) {
        errorCount++;
        console.error('Sync error:', error);
      }
    }

    showMessage(
      `同步完成！成功 ${successCount} 条，失败 ${errorCount} 条`,
      successCount > 0 ? 'success' : 'error'
    );

  } catch (error) {
    console.error('Sync error:', error);
    showMessage('同步失败，请检查网络连接', 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = '🔄 同步到TAP系统';
  }
});

// 导出为Excel
exportBtn.addEventListener('click', () => {
  if (scannedData.length === 0) {
    showMessage('没有可导出的数据', 'error');
    return;
  }

  // 创建CSV
  const headers = ['达人名称', 'TikTok ID', '产品名称', '申请日期', '状态'];
  const rows = scannedData.map(sample => [
    sample.influencerName || '',
    sample.tiktokId || '',
    sample.productName || '',
    sample.requestDate || '',
    sample.status || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // 下载文件
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tiktok_samples_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  showMessage('已导出为CSV文件', 'success');
});

// 保存设置
saveBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiToken = apiTokenInput.value.trim();

  if (!apiUrl || !apiToken) {
    showMessage('请填写完整的API地址和Token', 'error');
    return;
  }

  await chrome.storage.local.set({ apiUrl, apiToken });
  settings = { apiUrl, apiToken };

  showMessage('设置已保存', 'success');
  await checkApiConnection();
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'dataUpdated') {
    scannedData = request.data;
    showDataCount();
  }
});
