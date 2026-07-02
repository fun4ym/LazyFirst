/**
 * LazyFirst TikTok 数据采集器 - Parser Utility
 * 解析TikTok页面数据
 */

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
 * 解析价格（处理"$19.99"、"¥129"等格式）
 */
function parsePrice(text) {
  if (!text) return 0;
  
  text = text.trim().replace(/[$¥€£]/g, '');
  
  return parseFloat(text) || 0;
}

/**
 * 解析日期（处理相对时间，如"3天前"、"1周前"）
 */
function parseRelativeDate(text) {
  if (!text) return null;
  
  text = text.trim();
  
  const now = new Date();
  
  if (text.includes('分钟前') || text.includes('minutes ago')) {
    const minutes = parseInt(text);
    return new Date(now - minutes * 60 * 1000);
  } else if (text.includes('小时前') || text.includes('hours ago')) {
    const hours = parseInt(text);
    return new Date(now - hours * 60 * 60 * 1000);
  } else if (text.includes('天前') || text.includes('days ago')) {
    const days = parseInt(text);
    return new Date(now - days * 24 * 60 * 60 * 1000);
  } else if (text.includes('周前') || text.includes('weeks ago')) {
    const weeks = parseInt(text);
    return new Date(now - weeks * 7 * 24 * 60 * 60 * 1000);
  } else if (text.includes('月前') || text.includes('months ago')) {
    const months = parseInt(text);
    return new Date(now - months * 30 * 24 * 60 * 60 * 1000);
  } else {
    // 尝试解析绝对日期
    const date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
  }
}

/**
 * 提取联系方式（从Bio文本中）
 */
function extractContacts(bio) {
  if (!bio) return { line: null, phone: null, email: null, whatsapp: null };
  
  const contacts = {
    line: null,
    phone: null,
    email: null,
    whatsapp: null
  };
  
  // LINE ID
  const linePatterns = [
    /LINE\s*[：:]\s*([a-zA-Z0-9_.-]+)/i,
    /LINE\s*[：:]\s*@?([a-zA-Z0-9_.-]+)/i,
    /[Ll]ine[_\s]?[Ii][Dd]\s*[：:]\s*([a-zA-Z0-9_.-]+)/i
  ];
  
  for (const pattern of linePatterns) {
    const match = bio.match(pattern);
    if (match) {
      contacts.line = match[1];
      break;
    }
  }
  
  // 手机号
  const phonePatterns = [
    /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
    /[Tt]el[.\s]*[：:]\s*([+\d\s-]{8,})/
  ];
  
  for (const pattern of phonePatterns) {
    const match = bio.match(pattern);
    if (match) {
      contacts.phone = match[0];
      break;
    }
  }
  
  // 邮箱
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = bio.match(emailPattern);
  if (emailMatch) {
    contacts.email = emailMatch[0];
  }
  
  // WhatsApp
  const whatsappPatterns = [
    /[Ww]hats[Aa]pp[.\s]*[：:]\s*([+\d\s-]{8,})/,
    /wa\.me\/(\d+)/
  ];
  
  for (const pattern of whatsappPatterns) {
    const match = bio.match(pattern);
    if (match) {
      contacts.whatsapp = match[1];
      break;
    }
  }
  
  return contacts;
}

/**
 * 估算GMV（根据粉丝数和互动数据）
 */
function estimateGMV(followerCount, avgVideoViews, engagementRate = 0.05) {
  // 简单估算公式：GMV = 粉丝数 × 互动率 × 平均客单价 × 转化率
  // 这里假设平均客单价$20，转化率2%
  const avgOrderValue = 20;
  const conversionRate = 0.02;
  
  const estimatedGMV = followerCount * engagementRate * avgOrderValue * conversionRate;
  
  return Math.round(estimatedGMV * 100) / 100;
}

/**
 * 估算FV（粉丝价值 = GMV / 粉丝数）
 */
function estimateFV(gmv, followerCount) {
  if (!followerCount) return 0;
  
  return Math.round((gmv / followerCount) * 10000) / 10000;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseFollowers,
    parseCount,
    parsePrice,
    parseRelativeDate,
    extractContacts,
    estimateGMV,
    estimateFV
  };
}
