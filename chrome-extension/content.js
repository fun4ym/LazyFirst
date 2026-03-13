// TikTok Partner Center 页面内容脚本

// 存储扫描的数据
let scannedSamples = [];

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scan') {
    const data = scanPage();
    sendResponse({ data });
  } else if (request.action === 'getData') {
    sendResponse({ data: scannedSamples });
  }
  return true;
});

// 扫描页面
function scanPage() {
  try {
    scannedSamples = [];

    // 方法1：查找表格数据（根据TikTok Partner Center实际页面结构调整）
    const tables = document.querySelectorAll('table');

    tables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const sample = extractSampleFromRow(row);
        if (sample) {
          scannedSamples.push(sample);
        }
      });
    });

    // 方法2：如果表格未找到，尝试其他选择器
    if (scannedSamples.length === 0) {
      const sampleCards = document.querySelectorAll('[data-testid*="sample"], [class*="sample"]');
      sampleCards.forEach(card => {
        const sample = extractSampleFromCard(card);
        if (sample) {
          scannedSamples.push(sample);
        }
      });
    }

    // 方法3：查找所有包含样品信息的div
    if (scannedSamples.length === 0) {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        const text = element.textContent;
        if (text.includes('Sample') && text.includes('Request')) {
          const sample = extractSampleFromElement(element);
          if (sample) {
            scannedSamples.push(sample);
          }
        }
      });
    }

    // 通知popup数据已更新
    chrome.runtime.sendMessage({
      action: 'dataUpdated',
      data: scannedSamples
    });

    return scannedSamples;

  } catch (error) {
    console.error('Scan error:', error);
    return [];
  }
}

// 从表格行提取样品信息
function extractSampleFromRow(row) {
  try {
    const cells = row.querySelectorAll('td');

    if (cells.length < 3) return null;

    // 尝试从列中提取信息
    const getText = (index) => cells[index]?.textContent?.trim() || '';

    const sample = {
      influencerName: getText(0),
      tiktokId: extractTikTokId(getText(0)),
      productName: getText(1),
      requestDate: extractDate(getText(2)),
      status: extractStatus(getText(3) || getText(2)),
      campaignId: extractCampaignId(row),
      tiktokSampleId: extractSampleId(row)
    };

    // 验证必要字段
    if (sample.influencerName || sample.tikTokId) {
      return sample;
    }

    return null;

  } catch (error) {
    console.error('Extract from row error:', error);
    return null;
  }
}

// 从卡片元素提取样品信息
function extractSampleFromCard(card) {
  try {
    const sample = {
      influencerName: extractText(card, 'influencer') || extractText(card, 'creator'),
      tiktokId: extractTikTokId(card.textContent),
      productName: extractText(card, 'product') || extractText(card, 'item'),
      requestDate: extractDate(card.textContent),
      status: extractStatus(card.textContent),
      campaignId: '',
      tiktokSampleId: ''
    };

    if (sample.influencerName || sample.tikTokId) {
      return sample;
    }

    return null;

  } catch (error) {
    console.error('Extract from card error:', error);
    return null;
  }
}

// 从元素提取样品信息
function extractSampleFromElement(element) {
  try {
    const text = element.textContent;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // 简单的模式匹配
    const sample = {
      influencerName: '',
      tiktokId: extractTikTokId(text),
      productName: '',
      requestDate: extractDate(text),
      status: extractStatus(text),
      campaignId: '',
      tiktokSampleId: ''
    };

    if (sample.tikTokId) {
      return sample;
    }

    return null;

  } catch (error) {
    console.error('Extract from element error:', error);
    return null;
  }
}

// 辅助函数：提取TikTok ID
function extractTikTokId(text) {
  const patterns = [
    /@([a-zA-Z0-9_.]+)/,
    /TikTok ID:\s*([a-zA-Z0-9_]+)/,
    /@([a-zA-Z0-9_]+)\s/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return '';
}

// 辅助函数：提取日期
function extractDate(text) {
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{1,2}\s+\w+\s+\d{4})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return '';
}

// 辅助函数：提取状态
function extractStatus(text) {
  const statusKeywords = {
    'pending': ['pending', '待审核', '等待'],
    'approved': ['approved', '已批准', '批准', 'accepted'],
    'shipped': ['shipped', '已发货', '发货'],
    'rejected': ['rejected', '已拒绝', '拒绝', 'declined'],
    'received': ['received', '已接收', '接收']
  };

  const lowerText = text.toLowerCase();
  for (const [status, keywords] of Object.entries(statusKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return status;
      }
    }
  }

  return 'pending';
}

// 辅助函数：提取文本
function extractText(element, keyword) {
  const regex = new RegExp(keyword, 'i');
  const allElements = element.querySelectorAll('*');
  for (const el of allElements) {
    if (el.textContent.match(regex)) {
      return el.textContent.trim();
    }
  }
  return '';
}

// 辅助函数：提取Campaign ID
function extractCampaignId(row) {
  const link = row.querySelector('a[href*="campaign"]');
  if (link) {
    const match = link.href.match(/campaign[\/=]([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  }
  return '';
}

// 辅助函数：提取Sample ID
function extractSampleId(row) {
  const dataId = row.getAttribute('data-id');
  return dataId || '';
}

// 页面加载完成后自动扫描
setTimeout(() => {
  console.log('TAP TikTok Sync content script loaded');
}, 2000);
