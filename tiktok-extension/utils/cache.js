/**
 * LazyFirst TikTok 数据采集器 - Cache Utility
 * 本地缓存管理（使用chrome.storage.local）
 */

// 缓存键前缀
const CACHE_PREFIX = 'cache_';

// 缓存过期时间（默认1小时）
const DEFAULT_CACHE_TTL = 60 * 60 * 1000;

/**
 * 设置缓存
 */
async function setCache(key, data, ttl = DEFAULT_CACHE_TTL) {
  const cacheKey = CACHE_PREFIX + key;
  const cacheData = {
    data: data,
    timestamp: Date.now(),
    ttl: ttl
  };
  
  await chrome.storage.local.set({ [cacheKey]: cacheData });
}

/**
 * 获取缓存
 */
async function getCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  const result = await chrome.storage.local.get(cacheKey);
  const cacheData = result[cacheKey];
  
  if (!cacheData) {
    return null; // 缓存不存在
  }
  
  // 检查是否过期
  if (Date.now() - cacheData.timestamp > cacheData.ttl) {
    // 缓存过期，删除
    await chrome.storage.local.remove(cacheKey);
    return null;
  }
  
  return cacheData.data;
}

/**
 * 删除缓存
 */
async function removeCache(key) {
  const cacheKey = CACHE_PREFIX + key;
  await chrome.storage.local.remove(cacheKey);
}

/**
 * 清除所有缓存
 */
async function clearCache() {
  const allData = await chrome.storage.local.get();
  const cacheKeys = Object.keys(allData).filter(key => key.startsWith(CACHE_PREFIX));
  await chrome.storage.local.remove(cacheKeys);
}

/**
 * 获取缓存大小
 */
async function getCacheSize() {
  const allData = await chrome.storage.local.get();
  const cacheKeys = Object.keys(allData).filter(key => key.startsWith(CACHE_PREFIX));
  return cacheKeys.length;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setCache,
    getCache,
    removeCache,
    clearCache,
    getCacheSize
  };
}
