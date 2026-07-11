/**
 * LazyFirst TikTok 数据采集器 - Content Script
 * 注入到TikTok页面，自动解析DOM数据并静默上传
 */

console.log('LazyFirst Extension: Content Script 加载');

// 全局状态
let lastProcessedUrl = ''; // 上次处理的URL，防止重复处理
let processingDelay = 2000; // 页面加载后延迟处理的时间（毫秒）
let showVideoTags = true; // 是否显示视频数据标签（从storage读取）
let searchPageObserver = null; // 搜索页MutationObserver引用，用于清理
let videoPageTimeout = null;     // 视频页首次提取定时器ID
let videoPageRetryTimeout = null; // 视频页重试提取定时器ID
let fetchedVideoCache = {};       // videoId -> 完整统计，避免8s重试时重复爬取内页
let searchApiCache = {};          // videoId -> 完整stats，由 injected.js 拦截搜索API后推送
let authorApiCache = {};          // tiktokId(uniqueId小写) -> { followerCount, totalLikes, ... } 作者数据缓存
let influencerMetricsCache = {};  // tiktokId -> { fv, gmv, mss, apv } 达人四指标缓存
let inflMetricRequests = {};      // tiktokId -> 当前正在进行的请求 Promise（去重）

// 页面主世界注入脚本状态（CSP 禁止 inline script，需加载外部文件）
let injectedScriptReady = false;
const pendingInjectedRequests = [];
let sigiDataPromise = null;
let sigiDataResolved = null;

function ensureInjectedScript() {
  if (document.getElementById('lf-injected-script')) return;
  const script = document.createElement('script');
  script.id = 'lf-injected-script';
  script.src = chrome.runtime.getURL('content/injected.js');
  script.async = true;
  document.documentElement.appendChild(script);
  console.log('[LF] 已加载主世界脚本:', script.src);
}

function sendToInjectedScript(payload) {
  if (injectedScriptReady) {
    window.postMessage({ source: 'lf-request', ...payload }, '*');
  } else {
    pendingInjectedRequests.push(payload);
  }
}

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
  console.log('[LF] Content Script 初始化，URL:', window.location.href);

  // 先加载主世界脚本（CSP 会拦截 inline script，必须加载外部文件）
  ensureInjectedScript();

  // 读取配置
  chrome.storage.local.get(['showVideoTags', 'debugMode'], (config) => {
    showVideoTags = config.showVideoTags !== false;
    console.log('[LF] 视频数据标签显示:', showVideoTags ? '开启' : '关闭');

    // 延迟执行，等待页面完全加载
    setTimeout(() => {
      // 检测当前页面类型
      const pageType = detectPageType();
      console.log('[LF] 当前页面类型:', pageType);
      
      // 根据页面类型执行不同的逻辑
      if (pageType === 'search') {
        handleSearchPage();
      } else if (pageType === 'profile') {
        handleProfilePage();
      } else if (pageType === 'video') {
        handleVideoPage();
      } else if (pageType === 'message') {
        handleMessagePage();
      } else {
        console.log('[LF] 未知页面类型，跳过处理');
      }
      
      // 记录当前URL
      lastProcessedUrl = window.location.href;
    }, processingDelay);
  });
  
  // 监听URL变化（TikTok是SPA，URL会变化但页面不刷新）
  observeUrlChanges();
  
  // 监听页面脚本返回的 SIGI_STATE 数据 / 搜索API缓存更新
  window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'lazyfirst-sigi') {
      window.__LF_SIGI_DATA__ = event.data.data;
      console.log('[LF] 收到页面注入数据');
      // 触发搜索页重刷（如果 scanCards 已挂载）
      if (typeof window.__lfRefreshSearchCards === 'function') {
        setTimeout(() => window.__lfRefreshSearchCards(true), 100);
      }
    }
    if (event.data && event.data.source === 'lazyfirst-search-api-data') {
      const incoming = event.data.data || {};
      const countBefore = Object.keys(searchApiCache).length;
      searchApiCache = { ...searchApiCache, ...incoming };
      const countAfter = Object.keys(searchApiCache).length;
      console.log(`[LF] 收到搜索API缓存数据: ${countBefore} -> ${countAfter} 条`);
      // 触发搜索页重刷（API缓存到达后，把DOM/SIGI的简陋数据替换成完整stats）
      if (typeof window.__lfRefreshSearchCards === 'function') {
        setTimeout(() => window.__lfRefreshSearchCards(true), 100);
      }
    }
    if (event.data && event.data.source === 'lazyfirst-author-api-data') {
      const incoming = event.data.data || {};
      const countBefore = Object.keys(authorApiCache).length;
      authorApiCache = { ...authorApiCache, ...incoming };
      const countAfter = Object.keys(authorApiCache).length;
      console.log(`[LF] 收到作者API缓存数据: ${countBefore} -> ${countAfter} 条`);
      // 触发搜索页重刷，补全达人卡粉丝数/被赞总数
      if (typeof window.__lfRefreshSearchCards === 'function') {
        setTimeout(() => window.__lfRefreshSearchCards(true), 100);
      }
    }
    if (event.data && event.data.source === 'lf-injected-ready') {
      injectedScriptReady = true;
      console.log('[LF] 主世界脚本已就绪，清空待发送队列:', pendingInjectedRequests.length);
      pendingInjectedRequests.forEach((payload) => {
        window.postMessage({ source: 'lf-request', ...payload }, '*');
      });
      pendingInjectedRequests.length = 0;
    }
  });
}

/**
 * 检测页面类型
 */
function detectPageType() {
  const url = window.location.href;

  if (url.includes('/search') || url.includes('/explore')) {
    return 'search';
  } else if (url.includes('/message')) {
    return 'message';
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
      
      // 防重复处理
      if (currentUrl === lastProcessedUrl) return;
      lastProcessedUrl = currentUrl;
      
      console.log('[LF] URL变化:', currentUrl);
      
      // 取消上一次视频页的所有待处理定时器（防止旧提取干扰新页面）
      if (videoPageTimeout) { clearTimeout(videoPageTimeout); videoPageTimeout = null; }
      if (videoPageRetryTimeout) { clearTimeout(videoPageRetryTimeout); videoPageRetryTimeout = null; }
      
      // 移除旧视频面板（SPA切换时DOM残留）
      const oldOverlay = document.getElementById('lazyfirst-video-detail-overlay');
      if (oldOverlay) {
        oldOverlay.remove();
        console.log('[LF] 旧视频面板已清理');
      }
      
      // 移除搜索页卡片覆盖层（SPA切换时DOM残留）
      document.querySelectorAll('.lf-compact-overlay, .lf-influencer-metrics-overlay').forEach(el => {
        el.remove();
      });
      console.log('[LF] 搜索页覆盖层已清理');
      
      // 离开搜索页时清理observer
      if (searchPageObserver) {
        searchPageObserver.disconnect();
        searchPageObserver = null;
        console.log('[LF] 搜索页观察器已清理');
      }
      
      // 延迟处理新的页面
      setTimeout(() => {
        const pageType = detectPageType();
        console.log('[LF] 新页面类型:', pageType);
        
        if (pageType === 'search') {
          handleSearchPage();
        } else if (pageType === 'profile') {
          handleProfilePage();
        } else if (pageType === 'video') {
          handleVideoPage();
        } else if (pageType === 'message') {
          handleMessagePage();
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
 * 从视频链接向上查找合理的卡片容器
 */
function findVideoCardFromLink(link) {
  let el = link;
  for (let i = 0; i < 8; i++) {
    if (!el || el === document.body) break;
    const rect = el.getBoundingClientRect();
    // 卡片尺寸：宽度适中，高度明显大于宽度（竖屏视频）
    if (rect.width >= 150 && rect.height >= 220 && rect.width < 500 && rect.height < 900) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * 处理搜索页 - 自动展示数据，手动点击采集按钮入库
 */
function handleSearchPage() {
  console.log('[LF] 处理搜索页 - 展示数据+手动采集模式');
  
  // 清理旧观察器
  if (searchPageObserver) {
    searchPageObserver.disconnect();
    searchPageObserver = null;
  }
  
  // ★ 预注入数据读取脚本（提前准备）
  injectPageDataReader();
  
  // 处理单个视频卡片的逻辑：只展示数据，不自动上传
  async function processCard(card, isRetry = false) {
    if (card.dataset.lazyfirstProcessed && !isRetry) return;
    
    try {
      const authorData = extractAuthorDataFromSearchCard(card);
      if (authorData) {
        card.dataset.lazyfirstProcessed = 'true';
        // 不再自动 uploadAuthorData！
        
        if (showVideoTags) {
          try {
            await addVideoTagsToCard(card, authorData);
          } catch (e) {
            console.warn('[LF] 添加视频标签失败:', e.message);
          }
        }
      }
    } catch (e) {
      console.warn('[LF] 处理搜索卡失败:', e.message);
    }
  }
  
  // 扫描当前已有的卡片
  async function scanCards(isRetryScan = false) {
    // 优先用TikTok常见卡片容器选择器
    const cardSelectors = [
      '[data-e2e="search-card"]',
      '[class*="DivItemContainer"]',
      '[class*="search_card"]',
      '[class*="video-card"]',
      '[class*="item-card"]'
    ];
    
    const foundCards = new Set();
    for (const sel of cardSelectors) {
      document.querySelectorAll(sel).forEach(card => {
        if (card.querySelector('a[href*="/video/"]')) {
          foundCards.add(card);
        }
      });
    }
    
    // 兜底：从视频链接向上找合适容器
    if (foundCards.size === 0) {
      const allVideoLinks = document.querySelectorAll('a[href*="/video/"]');
      allVideoLinks.forEach(link => {
        const card = findVideoCardFromLink(link);
        if (card) foundCards.add(card);
      });
    }
    
    const cards = Array.from(foundCards);
    
    if (!isRetryScan || cards.length > 0) {
      console.log(`[LF] 搜索页：找到${cards.length}个视频卡片${isRetryScan ? '（重试）' : ''}`);
    }
    for (const card of cards) {
      await processCard(card, isRetryScan);
    }
    
    return cards.length;
  }
  
  // ★ 去刷新化：只做「首屏一次性扫描 + 数据补全一次」，之后不再反复重建覆盖层
  // 1.5s 后首屏扫描（此时 DOM 基本稳定，先以 loading 态建卡）
  setTimeout(scanCards, 1500);

  // 使用MutationObserver监听页面变化（TikTok是SPA，滚动加载新卡时增量处理）
  searchPageObserver = new MutationObserver((mutations) => {
    let hasNewCards = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              (node.querySelector?.('[href*="/video/"]') ||
               node.tagName === 'DIV' || node.tagName === 'SECTION')) {
            hasNewCards = true;
            break;
          }
        }
      }
    }
    if (hasNewCards) {
      // 延迟一下让DOM稳定（仅处理尚未处理的新卡，不重建已存在的卡）
      setTimeout(() => scanCards(false), 500);
    }
  });

  // 挂载全局刷新函数，供 injected 脚本数据/缓存到达后调用
  // ★ 关键改动：仅「缺则补建、有则不动」，绝不删卡重建，避免卡片闪烁/消失
  window.__lfRefreshSearchCards = async function(isRetry = false) {
    const cards = document.querySelectorAll('[data-lazyfirst-processed]');
    let patched = 0;
    let updated = 0;
    for (const card of cards) {
      const authorData = extractAuthorDataFromSearchCard(card);
      if (!authorData) continue;

      // 视频卡：存在则不动（其内部异步补全负责填数据）；缺失才补建一次
      if (!card.querySelector('.lf-compact-overlay')) {
        try { await addVideoTagsToCard(card, authorData); patched++; } catch (e) {}
      }

      // 达人卡：缺失补建；重试时若已有覆盖层且API缓存已到达，则更新数据
      const hasInfluencerOverlay = card.querySelector('.lf-influencer-metrics-overlay');
      if (!hasInfluencerOverlay) {
        try { addInfluencerMetricsToCard(card, authorData); patched++; } catch (e) {}
      } else if (isRetry) {
        const normalizedId = (authorData.tiktokId || '').replace(/^\/+/, '').replace(/^@/, '').trim().toLowerCase();
        if (authorApiCache[normalizedId] && !influencerMetricsCache[authorData.tiktokId]) {
          try { addInfluencerMetricsToCard(card, authorData); updated++; } catch (e) {}
        }
      }
    }
    console.log(`[LF] 补全模式：检查 ${cards.length} 张卡，补建 ${patched} 张，更新 ${updated} 张（不删卡）`);
  };

  searchPageObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 尝试从页面注入的 SIGI_STATE / universal data 获取搜索视频完整数据
 * ★ 每次都重新检查，因为数据可能是异步加载的
 */
function getSearchVideoExtraData() {
  try {
    // 策略1：优先用我们注入脚本设置的数据
    if (window.__LF_SIGI_DATA__) {
      const d = window.__LF_SIGI_DATA__;
      if (d.sigi || d.universal || Object.keys(d).length > 0) {
        console.log('[LF] __LF_SIGI_DATA__ 存在, keys:', Object.keys(d));
        return d;
      }
    }
  } catch (e) {
    console.warn('[LF] 读取__LF_SIGI_DATA__失败:', e.message);
  }

  // 策略2：直接读取页面全局变量（content script无法直接访问，需要通过注入脚本）
  // 这里返回null，让injectPageDataReader重新注入
  return null;
}

/**
 * 注入脚本读取 TikTok 页面级数据（SIGI_STATE / __UNIVERSAL_DATA_FOR_REHYDRATION__）
 * 返回 Promise，等待 injected 脚本回传数据（最多2.5秒）
 */
function injectPageDataReader() {
  if (sigiDataResolved) return Promise.resolve(sigiDataResolved);
  if (sigiDataPromise) return sigiDataPromise;

  sigiDataPromise = new Promise((resolve) => {
    let resolved = false;
    const handler = (e) => {
      if (e.data && e.data.source === 'lazyfirst-sigi') {
        resolved = true;
        window.removeEventListener('message', handler);
        sigiDataResolved = e.data.data;
        window.__LF_SIGI_DATA__ = e.data.data;
        resolve(e.data.data);
      }
    };
    window.addEventListener('message', handler);

    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener('message', handler);
        sigiDataResolved = window.__LF_SIGI_DATA__ || null;
        resolve(sigiDataResolved);
      }
    }, 2500);

    ensureInjectedScript();
    sendToInjectedScript({ action: 'readSigi' });
  });

  return sigiDataPromise;
}

/**
 * 给视频卡片添加右下角达人指标覆盖层（FV/GMV/MSS/APV）
 * 始终显示占位（初始为0），后台异步更新为真实数据，数据为空也不删除卡片
 */
async function addInfluencerMetricsToCard(card, authorData) {
  try {
    const tiktokId = authorData?.tiktokId ? String(authorData.tiktokId).replace(/^\/+/, '') : '';
    if (!tiktokId) return;

    let existingOverlay = card.querySelector('.lf-influencer-metrics-overlay');

    // 1. 命中缓存：直接渲染/更新
    if (influencerMetricsCache[tiktokId]) {
      const metrics = influencerMetricsCache[tiktokId];
      if (existingOverlay) {
        updateInfluencerMetricsOverlay(existingOverlay, metrics, authorData);
      } else {
        const overlay = createInfluencerMetricsOverlay(metrics, authorData);
        ensureOverlayPosition(card);
        card.appendChild(overlay);
      }
      console.log(`[LF] 达人数据缓存命中 ${tiktokId}`);
      return;
    }

    // 2. 避免重复请求：复用当前正在进行的 Promise
    if (inflMetricRequests[tiktokId]) {
      if (!existingOverlay) {
        // ★ 先用DOM粉丝数展示，不等请求
        const placeholder = createInfluencerMetricsOverlay(null, authorData, false);
        ensureOverlayPosition(card);
        card.appendChild(placeholder);
        existingOverlay = placeholder;
      }

      const metrics = await inflMetricRequests[tiktokId];
      if (metrics && (metrics.followers > 0 || metrics.totalLikes > 0)) {
        updateInfluencerMetricsOverlay(existingOverlay, metrics, authorData);
      }
      return;
    }

    // 3. ★ 核心改动：先用DOM粉丝数立即建卡，再异步去达人页抓取
    if (!existingOverlay) {
      const initialOverlay = createInfluencerMetricsOverlay(null, authorData, false);
      ensureOverlayPosition(card);
      card.appendChild(initialOverlay);
      existingOverlay = initialOverlay;
    }

    // 3.5 ★ Explore/搜索API缓存中已有该作者数据：直接用，不用再请求Profile页
    const normalizedId = tiktokId.replace(/^\/+/, '').replace(/^@/, '').trim().toLowerCase();
    const cachedAuthor = authorApiCache[normalizedId];
    if (cachedAuthor && (cachedAuthor.followerCount > 0 || cachedAuthor.totalLikes > 0)) {
      const apiMetrics = {
        followers: cachedAuthor.followerCount || authorData?.followerCount || 0,
        totalLikes: cachedAuthor.totalLikes || 0
      };
      influencerMetricsCache[tiktokId] = apiMetrics;
      updateInfluencerMetricsOverlay(existingOverlay, apiMetrics, authorData);
      console.log(`[LF] 使用作者API缓存数据 ${tiktokId}: 粉丝=${apiMetrics.followers}, 被赞=${apiMetrics.totalLikes}`);
      return;
    }

    // 4. ★ 去达人Profile页抓粉丝数和被赞总数（绕过数据库依赖）
    const requestPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'FETCH_INFLUENCER_PROFILE',
        tiktokId: tiktokId
      }, (response) => {
        if (response && response.success && response.data) {
          const data = response.data;
          // 合并：profile页抓到的数据为主，后端缓存可补充
          const merged = {
            followers: data.followers || authorData?.followerCount || 0,
            totalLikes: data.totalLikes || 0
          };
          influencerMetricsCache[tiktokId] = merged;
          resolve(merged);
        } else {
          // profile页抓取失败，回退到后端接口
          console.log(`[LF] Profile页抓取失败，回退后端接口: ${tiktokId}`);
          chrome.runtime.sendMessage({
            type: 'GET_INFLUENCER_METRICS',
            tiktokId: tiktokId
          }, (resp) => {
            if (resp && resp.success && resp.data) {
              const data = resp.data;
              data.followers = data.followers || authorData?.followerCount || 0;
              influencerMetricsCache[tiktokId] = data;
              resolve(data);
            } else {
              // 最终兜底：仅用DOM粉丝数
              const fallback = { followers: authorData?.followerCount || 0, totalLikes: 0 };
              influencerMetricsCache[tiktokId] = fallback;
              resolve(fallback);
            }
          });
        }
      });
    });

    inflMetricRequests[tiktokId] = requestPromise;
    const metrics = await requestPromise;
    delete inflMetricRequests[tiktokId];

    // 5. 真实数据到达后更新覆盖层
    if (metrics && metrics.totalLikes > 0) {
      updateInfluencerMetricsOverlay(existingOverlay, metrics, authorData);
      console.log(`[LF] 达人数据已补全 ${tiktokId}: 粉丝=${metrics.followers}, 被赞=${metrics.totalLikes}`);
    }
    // 如果totalLikes为0但followers已更新，也更新一下
    else if (metrics && metrics.followers > 0 && authorData?.followerCount !== metrics.followers) {
      updateInfluencerMetricsOverlay(existingOverlay, metrics, authorData);
    }
  } catch (e) {
    console.warn('[LF] 添加达人指标覆盖层失败:', e.message);
  }
}

/**
 * 确保卡片有非 static 定位，以便绝对定位覆盖层正确显示
 */
function ensureOverlayPosition(card) {
  const computedPosition = window.getComputedStyle(card).position;
  if (computedPosition === 'static') {
    card.style.position = 'relative';
  }
}

/**
 * 给视频卡片添加右上角紧凑数据标签 + 采集按钮
 * ★ 核心逻辑：优先等 SIGI_STATE 完整数据；拿不到时先显示DOM数据，再异步补全
 */
async function addVideoTagsToCard(card, authorData) {
  try {
    // 同时触发达人指标覆盖层渲染（异步，不阻塞视频数据展示）
    addInfluencerMetricsToCard(card, authorData);

    // 去重检查：已有overlay时，只更新成更完整的数据
    if (card.querySelector('.lf-compact-overlay')) {
      const existingOverlay = card.querySelector('.lf-compact-overlay');
      const videoData = extractVideoDataFromCard(card);
      if (videoData && (videoData.plays > 0 || videoData.comments > 0)) {
        const newOverlay = createVideoCardOverlay(videoData, authorData);
        existingOverlay.replaceWith(newOverlay);
        console.log('[LF] 更新视频卡片标签(数据更完整):', authorData.tiktokId, 'plays:', videoData.plays);
      }
      return;
    }

    // ★ 首屏先建 loading 态（读取中），数据就绪后静态替换，避免空白/闪烁
    const computedPosition = window.getComputedStyle(card).position;
    if (computedPosition === 'static') {
      card.style.position = 'relative';
    }
    const loadingOverlay = createVideoCardOverlay(null, authorData, true);
    card.appendChild(loadingOverlay);

    // ════════════════════════════════════════════
    // 第一优先级：从 TikTok 搜索/推荐 API 响应缓存读取完整数据
    // ════════════════════════════════════════════
    const apiData = tryExtractFromSearchApiCache(card);
    if (apiData && (apiData.plays > 0 || apiData.likes > 0)) {
      console.log('[LF] 使用搜索API缓存数据创建标签:', authorData.tiktokId, '播放:', apiData.plays, '点赞:', apiData.likes, '评论:', apiData.comments);
      loadingOverlay.replaceWith(createVideoCardOverlay(apiData, authorData));
      return;
    }

    // ════════════════════════════════════════════
    // 第二优先级：从 SIGI_STATE 获取完整数据
    // ════════════════════════════════════════════
    const sigiData = await tryExtractFromSigiState(card);
    if (sigiData && (sigiData.plays > 0 || sigiData.likes > 0)) {
      console.log('[LF] 使用SIGI_STATE数据创建标签:', authorData.tiktokId, '播放:', sigiData.plays, '点赞:', sigiData.likes, '评论:', sigiData.comments);
      loadingOverlay.replaceWith(createVideoCardOverlay(sigiData, authorData));
      return;
    }

    // ════════════════════════════════════════════
    // 第三优先级：从DOM提取+异步补全
    // ════════════════════════════════════════════
    const videoData = extractVideoDataFromCard(card);
    if (videoData) {
      console.log('[LF] 添加视频卡片标签(DOM):', authorData.tiktokId, '播放:', videoData.plays, '点赞:', videoData.likes, '评论:', videoData.comments);

      loadingOverlay.replaceWith(createVideoCardOverlay(videoData, authorData));

      // 如果数据不完整，异步爬取video内页
      if (!videoData.plays || !videoData.comments || videoData.plays === videoData.likes) {
        console.log('[LF] 数据不完整, 开始异步爬取video内页...');
        fetchVideoDetailAndUpdate(card, card.querySelector('.lf-compact-overlay'), authorData);
      }
    } else {
      // 无数据：保留 loading 态（后续 __lfRefreshSearchCards 补全或维持 loading）
      console.log('[LF] 暂未提取到视频数据，保留 loading 态等待补全');
    }
  } catch (e) {
    console.error('[LF] addVideoTagsToCard 失败:', e.message, e.stack);
  }
}

/**
 * ★★ 核心：在页面上下文中注入脚本抓取video详情页，获取完整统计数据
 * 使用注入脚本方式可以携带完整的浏览器cookie/session，避免被CDN拦截
 */
function fetchVideoDetailAndUpdate(card, currentOverlay, authorData) {
  try {
    const videoLink = card.querySelector('a[href*="/video/"]');
    if (!videoLink) {
      console.log('[LF] ❌ 找不到视频链接');
      return;
    }

    const href = videoLink.getAttribute('href') || '';
    let videoUrl;
    if (href.startsWith('http')) {
      videoUrl = href;
    } else if (href.startsWith('//')) {
      videoUrl = 'https:' + href;
    } else {
      videoUrl = 'https://www.tiktok.com' + (href.startsWith('/') ? href : '/' + href);
    }

    // 去重：同一视频只爬一次（避免8s重试时重复请求内页）
    const idMatch = href.match(/\/video\/(\d+)/);
    const videoId = idMatch ? idMatch[1] : videoUrl;
    if (fetchedVideoCache[videoId]) {
      updateOverlayWithFullData(card, currentOverlay, authorData, fetchedVideoCache[videoId]);
      return;
    }

    console.log('[LF] 🚀 开始获取数据, videoUrl:', videoUrl);

    // ★ 方法1: 先尝试从当前页全局变量取（最快）
    // 注意：该函数返回 Promise，必须用 .then 链式调用，绝不能当成布尔判断
    // （旧代码 if(tryFetchFromCurrentPage(...)) 恒为真 → 方法2 永不可达，是数据取不到的根因）
    tryFetchFromCurrentPage(card, currentOverlay, authorData).then((success) => {
      if (success) {
        console.log('[LF] ✅ 方法1成功：从当前页面全局变量获取');
        return;
      }
      console.log('[LF] 方法1未命中，降级到方法2（爬取video内页）');

      // 方法2: 注入脚本 XHR 爬取 video 内页
      injectVideoPageFetcher(videoUrl, (ok, dataOrError) => {
        if (ok && dataOrError) {
          fetchedVideoCache[videoId] = dataOrError;
          updateOverlayWithFullData(card, currentOverlay, authorData, dataOrError);
        } else {
          console.warn('[LF] ⚠️ 方法1/2 均失败:', dataOrError);
        }
      });
    });

  } catch (e) {
    console.error('[LF] fetchVideoDetailAndUpdate 失败:', e.message, e.stack);
  }
}

/**
 * 方法1：尝试从当前页面已加载的全局数据中提取（最快，无需网络请求）
 * TikTok SPA在导航时会预加载数据到全局变量
 */
function tryFetchFromCurrentPage(card, currentOverlay, authorData) {
  return new Promise((resolve) => {
    try {
      const videoLink = card.querySelector('a[href*="/video/"]');
      if (!videoLink) { resolve(false); return; }
      const href = videoLink.getAttribute('href') || '';
      const idMatch = href.match(/\/video\/(\d+)/);
      const videoId = idMatch ? idMatch[1] : '';
      if (!videoId) { resolve(false); return; }

      const callbackId = 'lf-page-check-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

      // 等待结果
      const handler = (e) => {
        if (e.data?.source === 'lf-page-check' && e.data?.callbackId === callbackId) {
          window.removeEventListener('message', handler);
          if (e.data.success && e.data.stats) {
            updateOverlayWithFullData(card, currentOverlay, authorData, e.data.stats);
            resolve(true);
          } else {
            resolve(false);
          }
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(false);
      }, 2000); // 2秒超时

      // 通过外部主世界脚本读取页面全局变量
      ensureInjectedScript();
      sendToInjectedScript({ action: 'fetchFromCurrentPage', callbackId, videoId });
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * 注入脚本到TikTok页面中执行fetch（携带完整cookie/session）
 * 通过postMessage将结果回传给content script
 */
function injectVideoPageFetcher(videoUrl, callback) {
  const callbackId = 'lf-fetcher-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

  // 设置一次性监听器等待结果
  function handleMessage(event) {
    if (event.data && event.data.source === 'lf-video-fetcher' && event.data.callbackId === callbackId) {
      window.removeEventListener('message', handleMessage);

      if (event.data.success && event.data.videoStats) {
        callback(true, event.data.videoStats);
      } else {
        callback(false, event.data.error || '提取失败');
      }
    }
  }

  window.addEventListener('message', handleMessage);

  // ★ 超时处理（8秒）
  setTimeout(() => {
    window.removeEventListener('message', handleMessage);
    callback(false, '请求超时');
  }, 8000);

  // 通过外部主世界脚本发起 XHR 爬取（CSP 禁止 inline script）
  ensureInjectedScript();
  sendToInjectedScript({ action: 'fetchVideoPage', callbackId, videoUrl });

  console.log('[LF] 视频页面抓取请求已发送(XHR), 等待结果...');
}

/**
 * 用完整数据更新Overlay显示
 */
function updateOverlayWithFullData(card, currentOverlay, authorData, fullData) {
  // 检查是否还在DOM中
  if (!card.contains(currentOverlay)) {
    console.log('[LF] overlay已移除，跳过更新');
    return;
  }
  
  const domData = extractVideoDataFromCard(card) || { plays: 0, likes: 0, comments: 0, shares: 0, saves: 0, duration: '-', dateText: '-' };
  const mergedData = {
    ...domData,
    plays: fullData.plays || 0,
    likes: fullData.likes || 0,
    comments: fullData.comments || 0,
    shares: fullData.shares || 0,
    saves: fullData.saves || 0,
    duration: fullData.duration || domData.duration || '-',
    dateText: fullData.dateText || domData.dateText || '-'
  };
  
  console.log(`[LF] ✅ 准备更新overlay: plays=${mergedData.plays} likes=${mergedData.likes} comments=${mergedData.comments}`);
  
  const newOverlay = createVideoCardOverlay(mergedData, authorData);
  
  // 动画效果
  newOverlay.style.opacity = '0';
  newOverlay.style.transition = 'opacity 0.3s ease';
  currentOverlay.replaceWith(newOverlay);
  
  requestAnimationFrame(() => {
    newOverlay.style.opacity = '1';
  });
  
  console.log('[LF] ✨ Overlay已更新为完整数据!');
}

/**
 * 从搜索页视频卡片提取视频数据 - 纯 DOM 提取（不再内嵌 SIGI 读取）
 */
function extractVideoDataFromCard(card) {
  try {
    let plays = 0, likes = 0, comments = 0, shares = 0, saves = 0;

    // ══════════════════════════════════════
    // 第一优先级：扫描卡片底部区域DOM元素
    // ══════════════════════════════════════
    const bottomData = extractBottomStats(card);
    if (bottomData.plays > 0 || bottomData.likes > 0 || bottomData.comments > 0) {
      plays = bottomData.plays || 0;
      likes = bottomData.likes || 0;
      comments = bottomData.comments || 0;
    }

    // 如果底部扫描没拿到，尝试旧策略兜底
    if (plays === 0 && likes === 0) {
      plays = extractCardPlays(card);
      likes = extractCardLikes(card);
      
      // 兜底：从带 aria-label 的按钮里提取
      const allButtons = card.querySelectorAll('button, [role="button"]');
      for (const btn of allButtons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const count = extractButtonCount(btn);
        if (!count) continue;
        
        if (/\blike\b|❤|heart/.test(label) && !/\bcomment\b/.test(label)) {
          if (!likes) likes = count;
        } else if (/\bcomment\b|💬/.test(label)) {
          if (!comments) comments = count;
        } else if (/\bshare\b|↗/.test(label)) {
          if (!shares) shares = count;
        } else if (/\b(?:save|bookmark|favorite|collect|🔖)\b/.test(label)) {
          if (!saves) saves = count;
        }
      }
    }
    
    // ── 时长 ──
    let duration = '-';
    const timeEl = card.querySelector(
      '[data-e2e="video-duration"], [class*="DivVideoDuration"], ' +
      '[class*="video-duration"], [class*="duration"], time'
    );
    if (timeEl) {
      const t = timeEl.textContent.trim();
      if (/\d+:\d{2}/.test(t)) duration = t;
    }
    
    // 从aria-label里提取时长
    if (duration === '-') {
      const img = card.querySelector('img[alt]');
      if (img && img.alt) {
        const durMatch = img.alt.match(/(\d+:\d{2})/);
        if (durMatch) duration = durMatch[1];
      }
    }
    
    // ── 日期 ──
    let dateText = '-';
    const dateEl = card.querySelector('[class*="time-ago"], [class*="create-time"], [class*="DivTimeTag"]');
    if (dateEl) dateText = dateEl.textContent.trim();
    
    console.log(`[LF] 卡片数据提取(DOM): plays=${plays} likes=${likes} comments=${comments} duration=${duration}`);
    return { plays, likes, comments, shares, saves, duration, dateText };
  } catch (error) {
    console.error('提取视频数据失败:', error);
    return null;
  }
}

/**
 * ★ 最高优先级：从 TikTok 搜索/推荐 API 响应缓存读取完整视频数据
 * injected.js 拦截了 /api/search、/api/recommend 等请求，把每个 videoId 的完整 stats 放在这里
 */
function tryExtractFromSearchApiCache(card) {
  try {
    const videoLink = card.querySelector('a[href*="/video/"]');
    if (!videoLink) return null;
    const href = videoLink.getAttribute('href') || '';
    const idMatch = href.match(/\/video\/(\d+)/);
    if (!idMatch) return null;
    const videoId = idMatch[1];

    const s = searchApiCache[videoId];
    if (s && (s.plays > 0 || s.likes > 0)) {
      console.log(`[LF] ✅ 搜索API缓存命中 videoId=${videoId}:`, JSON.stringify(s));
      return { ...s, duration: '-', dateText: '-' };
    }
  } catch (e) {
    console.warn('[LF] 读取搜索API缓存失败:', e.message);
  }
  return null;
}

/**
 * ★★ 核心数据源：从 SIGI_STATE / UNIVERSAL_DATA 提取完整视频数据
 */
async function tryExtractFromSigiState(card) {
  try {
    // 1. 从卡片获取 video ID（用于匹配）
    const videoLink = card.querySelector('a[href*="/video/"]');
    if (!videoLink) {
      console.log('[LF] SIGI: 卡片中找不到视频链接');
      return null;
    }
    
    const href = videoLink.getAttribute('href') || '';
    const idMatch = href.match(/\/video\/(\d+)/);
    if (!idMatch) {
      console.log('[LF] SIGI: 无法从链接提取视频ID, href:', href);
      return null;
    }
    const videoId = idMatch[1];
    
    // 2. ★ 等待 injected 脚本返回 SIGI_STATE 数据
    const sigiData = await injectPageDataReader();
    
    if (!sigiData || (!sigiData.sigi && !sigiData.universal)) {
      console.log('[LF] SIGI: 无法获取任何SIGI数据, videoId:', videoId);
      return null;
    }
    
    console.log('[LF] SIGI: 数据源类型:', Object.keys(sigiData).join(','));
    
    // 3. 在 SIGI_STATE 中搜索匹配的视频数据
    let result = null;
    
    if (sigiData.sigi) {
      result = findVideoInObject(sigiData.sigi, videoId);
      if (result) {
        console.log('[LF] ✅ SIGI_STATE 命中!');
      }
    }
    
    if (!result && sigiData.universal) {
      result = findVideoInObject(sigiData.universal, videoId);
      if (result) {
        console.log('[LF] ✅ UNIVERSAL_DATA 命中!');
      }
    }
    
    if (result) {
      const plays = parseInt(result.playCount) || parseInt(result.stats?.playCount) || parseInt(result.viewCount) || parseInt(result.stats?.viewCount) || 0;
      const likes = parseInt(result.diggCount) || parseInt(result.stats?.diggCount) || parseInt(result.likeCount) || parseInt(result.stats?.likeCount) || 0;
      const comments = parseInt(result.commentCount) || parseInt(result.stats?.commentCount) || 0;
      const shares = parseInt(result.shareCount) || parseInt(result.stats?.shareCount) || 0;
      const saves = parseInt(result.collectCount) || parseInt(result.stats?.collectCount) || parseInt(result.favoriteCount) || parseInt(result.favouriteCount) || parseInt(result.stats?.favoriteCount) || 0;
      console.log(`[LF] ✅ SIGI命中: plays=${plays} likes=${likes} comments=${comments} saves=${saves}`);
      return {
        plays, likes, comments, shares, saves,
        duration: result.video?.duration || result.duration || '-',
        dateText: '-'
      };
    }
    
    console.log('[LF] SIGI: 在所有数据源中都未找到视频', videoId);
    return null;
  } catch (e) {
    console.warn('[LF] SIGI_STATE 提取失败:', e.message, e.stack);
    return null;
  }
}

/**
 * ★ 备用方案：直接通过注入脚本读取SIGI_STATE（绕过postMessage延迟问题）
 */
function tryGetSgiDirectly() {
  // content script 与页面主世界不共享 window，直接读取页面变量不可行。
  // SIGI 数据统一由 injectPageDataReader() + postMessage 提供。
  return null;
}

/**
 * 在对象中递归搜索包含指定videoId的视频数据
 * TikTok的数据结构很深，需要广度优先搜索
 */
function findVideoInObject(obj, targetId, depth = 0) {
  if (!obj || depth > 10 || typeof obj !== 'object') return null;
  
  // ══ 检查当前对象是否直接包含目标ID（多种可能字段名）══
  const idFields = ['id', 'videoId', 'itemId', 'aweme_id', 'awemeId'];
  for (const field of idFields) {
    if (obj[field] && String(obj[field]) === String(targetId)) {
      // 确认有统计数据才返回
      const hasStats = obj.stats || 
                       obj.playCount !== undefined || 
                       obj.diggCount !== undefined ||
                       obj.likeCount !== undefined ||
                       obj.commentCount !== undefined;
      
      if (hasStats || depth > 5) { // 深层搜索时放宽条件
        console.log(`[LF-搜索] 找到匹配! 字段=${field}, 值=${obj[field]}, depth=${depth}`);
        return obj;
      }
    }
  }
  
  // 如果是数组，遍历每个元素
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findVideoInObject(obj[i], targetId, depth + 1);
      if (result) return result;
    }
    return null;
  }
  
  // ★ 优先检查常见的视频数据字段路径
  const priorityKeys = ['ItemList', 'itemList', 'data', 'items', 'videos', 'list', 'contents'];
  for (const pk of priorityKeys) {
    if (obj[pk] && typeof obj[pk] === 'object') {
      const result = findVideoInObject(obj[pk], targetId, depth + 1);
      if (result) return result;
    }
  }
  
  // 遍历其他对象属性
  for (const key of Object.keys(obj)) {
    // 跳过一些明显不相关的属性
    if (key === 'innerHTML' || key === 'innerText' || key === 'outerHTML' || key === 'textContent') continue;
    if (key === '__proto__' || key === 'constructor') continue;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !priorityKeys.includes(key)) {
      const result = findVideoInObject(obj[key], targetId, depth + 1);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * ★ 核心：扫描卡片底部区域，按图标类型识别统计数字
 * TikTok搜索卡片底部通常有一行统计数据，每个统计项格式为: [SVG图标][数字文本]
 */
function extractBottomStats(card) {
  const result = { plays: 0, likes: 0, comments: 0 };
  
  try {
    const rect = card.getBoundingClientRect();
    const cardHeight = rect.height;
    
    // 收集卡片下半部分(50%-95%高度范围)的所有"图标+数字"组合
    const statItems = [];
    
    // 策略A：找所有包含SVG+相邻数字的容器
    // TikTok每个统计项的结构通常是: <div><svg icon/><span>数字</span></div>
    const allElements = card.querySelectorAll('span, strong, div');
    
    for (const el of allElements) {
      const text = el.textContent?.trim() || '';
      // 只关心纯数字或带K/M后缀的文本
      if (!/^[\d.,]+[KMBkmb]?$/.test(text)) continue;
      if (parseInt(text.replace(/[.,KMBkmb]/g, '')) <= 0) continue;
      
      const val = parseCount(text);
      if (!val || val < 1) continue;
      
      // 检查该数字元素的相对位置（必须在卡片下半部分）
      const elRect = el.getBoundingClientRect();
      const relativeY = (elRect.top - rect.top) / cardHeight;
      if (relativeY < 0.4 || relativeY > 0.98) continue;
      
      // 检查附近是否有SVG图标（前一个兄弟、父级第一个子、或同容器内的svg）
      let iconType = detectNearbyIconType(el);
      
      statItems.push({
        element: el,
        value: val,
        text: text,
        left: elRect.left - rect.left,
        top: relativeY,
        iconType: iconType
      });
    }
    
    // 按从左到右排序（TikTok通常是：播放 | 点赞 | ...）
    statItems.sort((a, b) => a.left - b.left);
    
    console.log(`[LF] 底部统计扫描: 找到${statItems.length}个数字`, 
      statItems.map(s => `${s.text}(${s.iconType})`).join(', '));
    
    // 分配结果
    for (const item of statItems) {
      if (item.iconType === 'play' && result.plays === 0) {
        result.plays = item.value;
      } else if (item.iconType === 'like' && result.likes === 0) {
        result.likes = item.value;
      } else if (item.iconType === 'comment' && result.comments === 0) {
        result.comments = item.value;
      } else if (item.iconType === 'unknown') {
        // ★ 关键修复：TikTok搜索页的数字默认是点赞数（♥图标旁边）
        // 只有明确识别为播放图标时才给plays
        if (result.likes === 0) {
          result.likes = item.value;  // 默认给点赞
        } else if (result.plays === 0) {
          result.plays = item.value;  // 第二个数字才考虑给播放
        }
      }
    }
    
    // 特殊情况：如果只有一个数字，它就是点赞数
    if (statItems.length >= 1 && result.plays === 0 && result.likes === 0) {
      const firstItem = statItems[0];
      result.likes = firstItem.value;
    }
    
  } catch (e) {
    console.warn('[LF] extractBottomStats 失败:', e.message);
  }
  
  return result;
}

/**
 * 检测元素附近的SVG图标类型
 */
function detectNearbyIconType(numberEl) {
  // 检查1: 前一个兄弟元素是不是SVG
  const prevSibling = numberEl.previousElementSibling;
  if (prevSibling && prevSibling.tagName === 'SVG') {
    if (isPlayIcon(prevSibling)) return 'play';
    if (isHeartIcon(prevSibling)) return 'like';
    // 尝试通过use href判断
    const use = prevSibling.querySelector('use');
    if (use) {
      const href = use.getAttribute('xlink:href') || use.getAttribute('href') || '';
      if (/play/i.test(href)) return 'play';
      if (/heart|like/i.test(href)) return 'like';
      if (/comment|chat|message/i.test(href)) return 'comment';
    }
  }
  
  // 检查2: 同一父容器内的第一个子元素是不是SVG
  const parent = numberEl.parentElement;
  if (parent) {
    const firstChild = parent.children[0];
    if (firstChild && firstChild.tagName === 'SVG' && firstChild !== numberEl) {
      if (isPlayIcon(firstChild)) return 'play';
      if (isHeartIcon(firstChild)) return 'like';
    }
  }
  
  // 检查3: 父容器的aria-label
  if (parent) {
    const label = (parent.getAttribute('aria-label') || parent.getAttribute('title') || '').toLowerCase();
    if (/play|view|播放/.test(label)) return 'play';
    if (/like|heart|love|赞/.test(label)) return 'like';
    if (/comment|评论/.test(label)) return 'comment';
  }
  
  // 检查4: 向上几层找带aria-label的祖先
  let ancestor = parent?.parentElement;
  for (let i = 0; i < 3 && ancestor; i++) {
    const label = (ancestor.getAttribute('aria-label') || ancestor.getAttribute('title') || '').toLowerCase();
    if (/play|view|播放/.test(label)) return 'play';
    if (/like|heart|love|赞/.test(label)) return 'like';
    if (/comment|评论/.test(label)) return 'comment';
    ancestor = ancestor.parentElement;
  }
  
  return 'unknown';
}

/**
 * 检查向上N层是否有心形/点赞相关元素
 */
function hasHeartLikeAncestor(el, levels) {
  let node = el.parentElement;
  for (let i = 0; i < levels && node && node !== document.body; i++) {
    // 检查自身属性
    const attrs = (node.getAttribute('aria-label') || '') + ' ' + 
                  (node.getAttribute('class') || '') + ' ' + 
                  (node.getAttribute('data-e2e') || '');
    if (/like|heart|love|赞/i.test(attrs)) return true;
    
    // 检查子SVG
    const svg = node.querySelector('svg');
    if (svg && isHeartIcon(svg)) return true;
    
    // 检查innerHTML中是否有心形path特征
    const html = node.innerHTML || '';
    if (/(?:heart|like)/i.test(html) && /<svg/i.test(html)) return true;
    
    node = node.parentElement;
  }
  return false;
}

/**
 * 从搜索页卡片提取点赞数 - 多策略
 * TikTok搜索卡片：左下角播放图标+播放量，心形图标+点赞数
 */
function extractCardLikes(card) {
  // ── 策略1：aria-label 明确包含 like/heart 的元素 ──
  const likeBtn = card.querySelector('[aria-label*="like" i], [aria-label*="赞" i], [aria-label*="heart" i]');
  if (likeBtn) {
    const count = extractButtonCount(likeBtn);
    if (count) return count;
  }

  // ── 策略2：基于心形 SVG 图标找相邻数字 ──
  const allSvgs = card.querySelectorAll('svg');
  for (const svg of allSvgs) {
    if (isHeartIcon(svg)) {
      // 心形图标通常和数字在同一父容器或相邻元素
      let node = svg.parentElement;
      for (let i = 0; i < 4 && node; i++) {
        const text = node.textContent.trim();
        const val = parseCount(text);
        if (val > 0) {
          // 确保这个数字不是播放量：如果同一容器里还有播放图标，跳过该容器
          if (!node.querySelector('svg') || isHeartIcon(node.querySelector('svg'))) {
            return val;
          }
        }
        node = node.parentElement;
      }
    }
  }

  // ── 策略3：基于播放量元素找共同父容器内的其他数字 ──
  let playEl = null;
  const playSelectors = [
    '[data-e2e="video-views"]',
    'strong[data-e2e="video-views"]',
    '[class*="DivNumber"]'
  ];
  for (const sel of playSelectors) {
    playEl = card.querySelector(sel);
    if (playEl) break;
  }

  if (playEl) {
    const playVal = parseCount(playEl.textContent);
    // 向上找共同父容器（通常2-3层）
    let container = playEl.parentElement;
    for (let i = 0; i < 3 && container; i++) {
      const candidates = [];
      const numberEls = container.querySelectorAll('span, strong');
      for (const el of numberEls) {
        const val = parseCount(el.textContent);
        if (val > 0 && val !== playVal) {
          candidates.push({ el, val });
        }
      }
      // 如果找到候选，优先选带心形图标的
      for (const c of candidates) {
        const prevSvg = c.el.previousElementSibling;
        if (prevSvg && prevSvg.tagName === 'SVG' && isHeartIcon(prevSvg)) {
          return c.val;
        }
        const parentSvg = c.el.parentElement?.querySelector(':scope > svg');
        if (parentSvg && isHeartIcon(parentSvg)) {
          return c.val;
        }
      }
      // 没有图标的话，如果只有一个候选数字，就取它
      if (candidates.length === 1) {
        return candidates[0].val;
      }
      container = container.parentElement;
    }
  }

  return 0;
}

/**
 * 判断 SVG 是否为心形/点赞图标
 */
function isHeartIcon(svg) {
  if (!svg || svg.tagName !== 'SVG') return false;

  // aria-label
  const label = (svg.getAttribute('aria-label') || '').toLowerCase();
  if (/like|heart|love|赞/.test(label)) return true;

  // use href
  const use = svg.querySelector('use');
  if (use) {
    const href = use.getAttribute('xlink:href') || use.getAttribute('href') || '';
    if (/heart|like|love/.test(href.toLowerCase())) return true;
  }

  // path 特征：心形路径通常有多个曲线
  const paths = svg.querySelectorAll('path');
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    if (d.length > 30 && /M.*C.*C.*Z/i.test(d)) return true;
  }

  // class
  const cls = (svg.getAttribute('class') || '').toLowerCase();
  if (/heart|like|love/.test(cls)) return true;

  return false;
}

/**
 * 从搜索页卡片提取播放量 - 优先找播放图标旁边的数字
 */
function extractCardPlays(card) {
  // ── 策略1：特定选择器 ──
  const playSelectors = [
    '[data-e2e="video-views"]',
    'strong[data-e2e="video-views"]',
    '[class*="DivNumber"]',
    '[class*="video-count"]',
    '[class*="play-count"]',
    '[class*="view-count"]'
  ];
  for (const sel of playSelectors) {
    const el = card.querySelector(sel);
    if (el) {
      const text = el.textContent.trim();
      if (text && /[\d.,]+[KMBkmb]?/i.test(text)) {
        const val = parseCount(text);
        if (val) return val;
      }
    }
  }

  // ── 策略2：基于播放图标找数字 ──
  const allSvgs = card.querySelectorAll('svg');
  for (const svg of allSvgs) {
    if (isPlayIcon(svg)) {
      let node = svg.parentElement;
      for (let i = 0; i < 4 && node; i++) {
        const text = node.textContent.trim();
        const val = parseCount(text);
        if (val > 0) return val;
        node = node.parentElement;
      }
    }
  }

  // ── 策略3：卡片左下角区域的数字 ──
  // 取卡片底部 30% 区域内的数字
  const rect = card.getBoundingClientRect();
  const allTextEls = card.querySelectorAll('span, strong');
  const bottomCandidates = [];
  for (const el of allTextEls) {
    const text = el.textContent.trim();
    if (/^[\d.,]+[KMBkmb]?$/i.test(text)) {
      const elRect = el.getBoundingClientRect();
      const relativeY = (elRect.top - rect.top) / rect.height;
      // 在卡片底部 0-35% 区域
      if (relativeY > 0.65 && relativeY < 1.0) {
        bottomCandidates.push({ val: parseCount(text), el });
      }
    }
  }
  // 底部区域通常最左边的是播放量
  if (bottomCandidates.length > 0) {
    bottomCandidates.sort((a, b) => a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left);
    return bottomCandidates[0].val;
  }

  return 0;
}

/**
 * 判断 SVG 是否为播放图标
 */
function isPlayIcon(svg) {
  if (!svg || svg.tagName !== 'SVG') return false;

  const label = (svg.getAttribute('aria-label') || '').toLowerCase();
  if (/play|view|播放/.test(label)) return true;

  const use = svg.querySelector('use');
  if (use) {
    const href = use.getAttribute('xlink:href') || use.getAttribute('href') || '';
    if (/play|view/.test(href.toLowerCase())) return true;
  }

  const paths = svg.querySelectorAll('path');
  for (const p of paths) {
    const d = p.getAttribute('d') || '';
    // 三角形播放图标路径特征
    if (/M.*L.*L.*Z/i.test(d) && d.length < 200) return true;
  }

  const cls = (svg.getAttribute('class') || '').toLowerCase();
  if (/play|view/.test(cls)) return true;

  return false;
}

/**
 * 处理达人主页 - 手动采集模式，双按钮
 */
function handleProfilePage() {
  console.log('[LF] 处理达人主页 - 手动采集模式');
  
  // 延迟执行，等待页面完全加载
  setTimeout(() => {
    try {
      const authorData = extractAuthorDataFromProfile();
      
      if (authorData) {
        console.log('[LF] 达人主页数据:', authorData);
        // 不再自动上传，改为注入采集按钮
        injectProfileCollectButtons(authorData);
      } else {
        console.warn('[LF] 未能提取达人主页数据');
      }
    } catch (e) {
      console.error('[LF] handleProfilePage 失败:', e.message);
    }
  }, processingDelay);
}

/**
 * 处理私信页 - 将预填文案写入输入框（由 BD 手动发送）
 * 预填数据来自 window.__LF_PENDING_DM__（由搜索页 send message 按钮设置）
 */
function handleMessagePage() {
  console.log('[LF] 处理私信页 - 预填文案');
  const pending = window.__LF_PENDING_DM__;
  if (!pending || !pending.text) return;

  // 多次尝试填入（私信页为 SPA，输入框异步渲染）
  let attempts = 0;
  const maxAttempts = 20;
  const tryFill = () => {
    attempts++;
    // TikTok 私信输入框候选选择器
    const inputSelectors = [
      'div[contenteditable="true"]',
      '[data-e2e="message-input"]',
      'textarea[placeholder*="message" i]',
      'textarea'
    ];
    let input = null;
    for (const sel of inputSelectors) {
      input = document.querySelector(sel);
      if (input) break;
    }

    if (input) {
      // 设置内容（contenteditable 用 innerText，textarea 用 value）
      try {
        if (input.isContentEditable) {
          input.focus();
          input.innerText = pending.text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(input, pending.text);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        console.log('[LF] ✅ 私信文案已预填');
        delete window.__LF_PENDING_DM__;
        return;
      } catch (e) {
        console.warn('[LF] 填入私信框失败:', e.message);
      }
    }

    if (attempts < maxAttempts) {
      setTimeout(tryFill, 300);
    } else {
      console.warn('[LF] 私信输入框未找到，放弃预填');
      delete window.__LF_PENDING_DM__;
    }
  };
  setTimeout(tryFill, 600);
}

/**
 * 在达人主页注入采集按钮组
 */
function injectProfileCollectButtons(authorData) {
  // 检查是否已注入
  if (document.getElementById('lf-profile-buttons')) return;

  const tiktokId = authorData.tiktokId || '';
  const collected = window.LF_COLLECTED_IDS.has(tiktokId);

  // 寻找注入位置：达人主页的用户信息区域
  const targetEl = document.querySelector('h1[data-e2e="user-title"], h2[data-e2e="user-subtitle"]');
  if (!targetEl) {
    console.warn('[LF] 达人主页找不到注入位置');
    return;
  }

  const container = document.createElement('div');
  container.id = 'lf-profile-buttons';
  container.className = 'lf-profile-buttons';
  container.style.cssText = 'display:flex;gap:8px;margin-top:12px;';

  container.innerHTML = `
    <button class="lf-profile-btn lf-btn-collect-author" 
            data-tiktok-id="${tiktokId}"
            ${collected ? 'disabled' : ''}>
      ${collected ? '✓ 达人已采集' : '📋 采集达人信息'}
    </button>
    <button class="lf-profile-btn lf-btn-collect-videos">
      📹 采集视频数据
    </button>
  `;

  // 插入到目标元素后面
  targetEl.parentElement.appendChild(container);

  // 绑定「采集达人」按钮
  const authorBtn = container.querySelector('.lf-btn-collect-author');
  authorBtn.addEventListener('click', () => {
    if (window.LF_COLLECTED_IDS.has(tiktokId)) return;
    
    authorBtn.classList.add('lf-collecting');
    authorBtn.textContent = '采集...';
    authorBtn.disabled = true;

    chrome.runtime.sendMessage({
      type: 'SAVE_COLLECTED_DATA',
      data: { ...authorData, collectedAt: new Date().toISOString() }
    }, response => {
      if (response && response.success) {
        window.LF_COLLECTED_IDS.add(tiktokId);
        authorBtn.classList.remove('lf-collecting');
        authorBtn.classList.add('lf-collected');
        authorBtn.textContent = '✓ 达人已采集';
        console.log('[LF] ✅ 达人采集成功:', tiktokId);
      } else {
        authorBtn.classList.remove('lf-collecting');
        authorBtn.textContent = '📋 采集达人信息';
        authorBtn.disabled = false;
        console.error('[LF] ❌ 达人采集失败');
      }
    });
  });

  // 绑定「采集视频数据」按钮
  const videoBtn = container.querySelector('.lf-btn-collect-videos');
  videoBtn.addEventListener('click', () => {
    collectProfileVideos(videoBtn, tiktokId);
  });
}

/**
 * 采集达人主页的视频数据
 */
function collectProfileVideos(btn, tiktokId) {
  btn.classList.add('lf-collecting');
  btn.textContent = '扫描中...';
  btn.disabled = true;

  // 抓取主页视频列表
  const videoCards = document.querySelectorAll('div[class*="DivItemContainer"]');
  const collectedIds = [];
  
  console.log(`[LF] 达人主页视频卡片数量: ${videoCards.length}`);
  
  // 批量采集视频数据
  const videoDataList = [];
  videoCards.forEach(card => {
    try {
      const videoData = extractVideoDataFromCard(card);
      if (videoData && videoData.plays > 0) {
        videoDataList.push(videoData);
      }
      // 找到对应的达人链接
      const authorLink = card.querySelector('a[href*="/@"]');
      if (authorLink) {
        const href = authorLink.getAttribute('href');
        const match = href.match(/\/@([\w.]+)/);
        if (match) collectedIds.push(match[1]);
      }
    } catch (e) {
      // skip
    }
  });

  // 上传视频数据
  if (videoDataList.length > 0) {
    chrome.runtime.sendMessage({
      type: 'SAVE_COLLECTED_VIDEOS',
      data: {
        tiktokId: tiktokId,
        videos: videoDataList,
        collectedAt: new Date().toISOString()
      }
    }, response => {
      btn.classList.remove('lf-collecting');
      if (response && response.success) {
        btn.classList.add('lf-collected');
        btn.textContent = `✓ 已采集 ${videoDataList.length} 个视频`;
        console.log('[LF] ✅ 视频数据采集成功:', videoDataList.length);
      } else {
        btn.textContent = '📹 采集视频数据';
        btn.disabled = false;
        console.error('[LF] ❌ 视频数据采集失败');
      }
    });
  } else {
    btn.classList.remove('lf-collecting');
    btn.textContent = '📹 未找到视频';
    btn.disabled = false;
    setTimeout(() => {
      btn.textContent = '📹 采集视频数据';
    }, 2000);
  }
}

/**
 * 处理视频详情页 - 采集视频和达人数据 + 显示视频热度面板
 */
function handleVideoPage() {
  console.log('[LF] 处理视频详情页 - 静默采集模式');
  
  // 取消旧的定时器（防止重复处理）
  if (videoPageTimeout) { clearTimeout(videoPageTimeout); }
  if (videoPageRetryTimeout) { clearTimeout(videoPageRetryTimeout); }
  
  // 延迟执行，等待页面完全加载
  videoPageTimeout = setTimeout(() => {
    try {
      console.log('[LF] 首次提取视频详情页数据...');
      const videoData = extractVideoData();
      const authorData = extractAuthorDataFromVideo();
      
      console.log('[LF] 视频数据:', videoData);
      console.log('[LF] 达人数据:', authorData);
      
      if (authorData) {
        authorData.latestVideo = videoData;
        uploadAuthorData(authorData);
        
        if (showVideoTags) {
          try {
            showVideoDetailOverlay(authorData, videoData);
            console.log('[LF] 视频面板已显示（首次提取）');
          } catch (e) {
            console.error('[LF] 显示视频面板失败:', e.message, e.stack);
          }
        }
      } else {
        console.warn('[LF] 首次提取：未能提取视频页达人数据');
      }
    } catch (e) {
      console.error('[LF] handleVideoPage 首次提取失败:', e.message, e.stack);
    }
  }, processingDelay);
  
  // 重试1：5s后（数据可能加载较慢）
  videoPageRetryTimeout = setTimeout(() => {
    // 检查面板数据是否有效（plays>0 才是真正提取到了数据）
    const existingPanel = document.getElementById('lazyfirst-video-detail-overlay');
    let needUpdate = !existingPanel;
    if (existingPanel) {
      // 检查面板里的数据是否为空（全0表示首次提取没拿到数据）
      const playsEl = existingPanel.querySelector('.lf-video-stat-value');
      if (playsEl && playsEl.textContent.trim() === '0') {
        needUpdate = true;
        console.log('[LF] 重试1：检测到面板数据为0，需要更新');
      }
    }
    
    if (needUpdate) {
      try {
        console.log('[LF] 重试1：5s后重新提取...');
        const authorData = extractAuthorDataFromVideo();
        if (authorData && showVideoTags) {
          const videoData = extractVideoData();
          authorData.latestVideo = videoData;
          showVideoDetailOverlay(authorData, videoData);
          console.log('[LF] 重试1：视频面板已更新');
        }
      } catch (e) {
        console.warn('[LF] 重试1失败:', e.message);
      }
    }
  }, 5000);
  
  // 重试2：10s后（最后的兜底）
  setTimeout(() => {
    const existingPanel = document.getElementById('lazyfirst-video-detail-overlay');
    let needUpdate = !existingPanel;
    if (existingPanel) {
      const playsEl = existingPanel.querySelector('.lf-video-stat-value');
      if (playsEl && playsEl.textContent.trim() === '0') {
        needUpdate = true;
        console.log('[LF] 重试2：面板数据仍为0，最后尝试');
      }
    }
    
    if (needUpdate) {
      try {
        console.log('[LF] 重试2：10s后最后尝试...');
        const authorData = extractAuthorDataFromVideo();
        if (authorData && showVideoTags) {
          const videoData = extractVideoData();
          authorData.latestVideo = videoData;
          showVideoDetailOverlay(authorData, videoData);
          console.log('[LF] 重试2：视频面板已更新');
        }
      } catch (e) {
        console.warn('[LF] 重试2失败:', e.message);
      }
    }
  }, 10000);
}

/**
 * 视频详情页显示数据面板
 */
function showVideoDetailOverlay(authorData, videoData) {
  try {
    // 如果旧面板存在则替换（SPA切换视频时会触发）
    const existing = document.getElementById('lazyfirst-video-detail-overlay');
    if (existing) {
      console.log('[LF] 视频面板已存在，替换为新数据');
      existing.remove();
    }
    
    console.log('[LF] 创建视频详情面板...');
    
    const plays = videoData?.plays || 0;
    const likes = videoData?.likes || 0;
    const comments = videoData?.comments || 0;
    const saves = videoData?.saves || 0;
    const shares = videoData?.shares || 0;
    const engagementRate = plays > 0 && likes > 0 ? ((likes / plays) * 100).toFixed(1) + '%' : '-';
    
    const overlay = document.createElement('div');
    overlay.id = 'lazyfirst-video-detail-overlay';
    overlay.className = 'lazyfirst-overlay';
    overlay.innerHTML = `
      <div class="lf-video-panel-header">
        <h4 style="margin:0;font-size:16px;">📹 视频热度</h4>
        <span class="lf-video-panel-author">${authorData.tiktokId || ''}</span>
      </div>
      <div class="lf-video-panel-stats">
        <div class="lf-video-panel-row">
          <div class="lf-video-stat-item">
            <span class="lf-video-stat-icon">▶</span>
            <span class="lf-video-stat-value">${formatCompact(plays)}</span>
            <span class="lf-video-stat-label">播放</span>
          </div>
          <div class="lf-video-stat-item">
            <span class="lf-video-stat-icon">♥</span>
            <span class="lf-video-stat-value">${formatCompact(likes)}</span>
            <span class="lf-video-stat-label">点赞</span>
          </div>
          <div class="lf-video-stat-item">
            <span class="lf-video-stat-icon">💬</span>
            <span class="lf-video-stat-value">${formatCompact(comments)}</span>
            <span class="lf-video-stat-label">评论</span>
          </div>
          <div class="lf-video-stat-item">
            <span class="lf-video-stat-icon">🔖</span>
            <span class="lf-video-stat-value">${formatCompact(saves)}</span>
            <span class="lf-video-stat-label">收藏</span>
          </div>
        </div>
        <div class="lf-video-panel-metrics">
          <div class="lf-video-metric">
            <span class="lf-video-metric-value">${engagementRate}</span>
            <span class="lf-video-metric-label">互动率</span>
          </div>
          <div class="lf-video-metric">
            <span class="lf-video-metric-value">${formatCompact(authorData.followerCount || 0)}</span>
            <span class="lf-video-metric-label">粉丝数</span>
          </div>
        </div>
      </div>
    `;
    
    overlay.style.position = 'fixed';
    overlay.style.top = '60px';
    overlay.style.right = '20px';
    overlay.style.zIndex = '9999';
    overlay.style.minWidth = '240px';
    
    document.body.appendChild(overlay);
    console.log('[LF] ✅ 视频详情面板已成功创建');
  } catch (e) {
    console.error('[LF] showVideoDetailOverlay 失败:', e.message, e.stack);
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
    
    // 提取用户名，归一化：只取 /@xxx 部分（去掉 /video/... 等后缀）
    const href = authorLink.getAttribute('href');
    const rawTid = href.startsWith('/') ? href : '/' + href;
    const tiktokId = (rawTid.match(/\/@[\w.]+/) || [rawTid])[0];
    
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
    
    // ★ 如果DOM没有粉丝数，尝试从已拦截的API缓存中补全
    const normalizedId = tiktokId.replace(/^\/+/, '').replace(/^@/, '').trim().toLowerCase();
    if ((!followerCount || followerCount <= 0) && authorApiCache[normalizedId]) {
      followerCount = authorApiCache[normalizedId].followerCount || 0;
      console.log(`[LF] 从作者API缓存补全粉丝数 ${normalizedId}:`, followerCount);
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
    
    // 安全获取 pathname
    const pathname = window.location && window.location.pathname ? window.location.pathname : '';
    const tiktokId = (pathname.match(/\/@[\w.]+/) || [pathname])[0];
    
    const result = {
      tiktokId: tiktokId,
      username: username ? username.textContent : '',
      nickname: nickname ? nickname.textContent : '',
      followerCount: followers ? parseCount(followers.textContent) : 0,
      followingCount: following ? parseCount(following.textContent) : 0,
      likesCount: likes ? parseCount(likes.textContent) : 0,
      collectedAt: new Date().toISOString()
    };
    
    console.log('[LF] 达人主页提取结果:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[LF] 提取达人主页信息失败:', error.message);
    return null;
  }
}

/**
 * 从视频详情页提取达人信息 - 多策略精确定位 + URL兜底
 */
function extractAuthorDataFromVideo() {
  try {
    // 策略0：从URL提取作者ID（最可靠，兜底）
    const urlMatch = window.location.pathname.match(/\/@([\w.]+)/);
    const urlTiktokId = urlMatch ? '/@' + urlMatch[1] : '';
    
    let authorLink = null;
    let authorName = null;
    let followerCount = 0;
    
    // 策略1：打印所有 /@ 链接帮助调试
    const allAtLinks = document.querySelectorAll('a[href^="/@"]');
    console.log(`[LF] 页面上共 ${allAtLinks.length} 个 /@ 链接:`);
    allAtLinks.forEach((l, i) => {
      console.log(`[LF]   链接${i + 1}: href="${l.getAttribute('href')}" text="${l.textContent?.trim()?.substring(0, 30)}"`);
    });
    
    // 策略2：通过常见作者容器精确查找
    const containerSelectors = [
      '[data-e2e="browse-video-author"]',
      '[data-e2e="video-info"]',
      '[data-e2e="video-information"]',
      '[class*="author-info"]',
      '[class*="AuthorInfo"]',
      '[class*="author-name"]',
      '[class*="videoDesc"]',
      '[class*="video-info"]',
    ];
    
    for (const selector of containerSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        console.log(`[LF] 找到容器: ${selector}`);
        const link = container.querySelector('a[href^="/@"]');
        if (link) { authorLink = link; break; }
      }
    }
    
    // 策略3：遍历所有 /@ 链接，找与URL中作者名匹配的（纯 @xxx 形式）
    if (!authorLink) {
      for (const link of allAtLinks) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/@[\w.]+/);
        if (match && match[0] === urlTiktokId) {
          authorLink = link;
          console.log(`[LF] 策略3 匹配到作者链接: ${href}`);
          break;
        }
      }
    }
    
    // 策略4：找最短的纯 /@xxx 链接作后备
    if (!authorLink) {
      let shortest = null;
      for (const link of allAtLinks) {
        const href = link.getAttribute('href') || '';
        if (/^\/@[\w.]+$/.test(href)) {
          if (!shortest || href.length < shortest.getAttribute('href').length) {
            shortest = link;
          }
        }
      }
      if (shortest) {
        authorLink = shortest;
        console.log(`[LF] 策略4 最短链接: ${shortest.getAttribute('href')}`);
      }
    }
    
    // 提取昵称（用urlTiktokId在页面上找对应文本）
    authorName = document.querySelector(
      '[data-e2e="video-author-uniqueid"], [data-e2e="author-uniqueid"], ' +
      '[class*="unique-id"], [class*="author-username"]'
    );
    
    // 提取粉丝数
    const followers = document.querySelector(
      '[data-e2e="video-author-followers"], [data-e2e*="follower"], ' +
      '[class*="follower-count"], [class*="followerCount"]'
    );
    if (followers) followerCount = parseFollowers(followers.textContent);
    
    // 如果找到作者链接则用它，否则用URL中的ID构造最小数据
    let tiktokId, username;
    if (authorLink) {
      const href = authorLink.getAttribute('href') || '';
      const rawTid = href.startsWith('/') ? href : '/' + href;
      tiktokId = (rawTid.match(/\/@[\w.]+/) || [rawTid])[0];
      username = authorLink.textContent.trim();
      
      // 如果链接本身text为空（通常是头像链接），从相邻元素取真实文本
      if (!username) {
        // 找同一父容器内text非空的同名作者链接
        const parent = authorLink.parentElement;
        if (parent) {
          const sibling = parent.querySelector(`a[href="${href}"]`);
          if (sibling && sibling !== authorLink && sibling.textContent?.trim()) {
            username = sibling.textContent.trim();
            console.log('[LF] 从兄弟链接取到作者名:', username.substring(0, 40));
          }
        }
        // 还是没取到，尝试提取父容器的文本（去掉图片alt等噪音）
        if (!username && parent) {
          const parentText = parent.textContent?.trim()?.split(/\s{2,}/)[0];
          if (parentText && parentText.length < 60) {
            username = parentText;
            console.log('[LF] 从父容器取到作者名:', username.substring(0, 40));
          }
        }
        // 最终还是用 tiktokId
        if (!username) {
          username = tiktokId;
          console.log('[LF] 使用tiktokId作为用户名:', tiktokId);
        }
      }
    } else if (urlTiktokId) {
      // 兜底：用URL中的作者ID
      tiktokId = urlTiktokId;
      username = urlTiktokId;
      console.log('[LF] ⚠️ 使用URL兜底作者ID:', tiktokId);
    } else {
      console.warn('[LF] 视频页无法提取任何作者信息');
      return null;
    }
    
    const result = {
      tiktokId: tiktokId,
      username: username,
      nickname: authorName ? authorName.textContent.trim() : username,
      followerCount: followerCount,
      collectedAt: new Date().toISOString()
    };
    
    console.log('[LF] 最终提取到作者:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('[LF] 提取达人信息失败:', error);
    return null;
  }
}

/**
 * 提取视频数据 - 多策略兼容TikTok新版DOM
 */
function extractVideoData() {
  try {
    const interactions = extractVideoInteractions();
    
    // 播放量：视频页通常不直接显示，尝试多种选择器
    let plays = 0;
    const playSelectors = [
      'strong[data-e2e="video-plays"]',
      '[data-e2e="video-plays"]',
      '[data-e2e="play-count"]',
      '[class*="play-count"]',
      '[class*="view-count"]',
      '[class*="video-count"]'
    ];
    for (const selector of playSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        plays = parseCount(el.textContent);
        if (plays) break;
      }
    }
    
    // 标题
    const titleEl = document.querySelector(
      'h1[data-e2e="video-title"], h1[class*="video-title"], [data-e2e="video-desc"]'
    );
    
    return {
      title: titleEl ? titleEl.textContent.trim() : '',
      plays: plays,
      likes: interactions.likes,
      comments: interactions.comments,
      shares: interactions.shares,
      saves: interactions.saves
    };
  } catch (error) {
    console.error('[LF] 提取视频数据失败:', error);
    return { title: '', plays: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  }
}

/**
 * 提取视频右侧交互数据（点赞/评论/分享/收藏）
 */
function extractVideoInteractions() {
  const result = { likes: 0, comments: 0, shares: 0, saves: 0 };
  
  try {
    // 策略1：通过 data-e2e 计数元素直接提取
    const countMap = [
      { key: 'likes', selectors: ['[data-e2e="like-count"]', '[data-e2e="video-likes"]'] },
      { key: 'comments', selectors: ['[data-e2e="comment-count"]', '[data-e2e="video-comments"]'] },
      { key: 'shares', selectors: ['[data-e2e="share-count"]', '[data-e2e="video-shares"]'] },
      { key: 'saves', selectors: ['[data-e2e="bookmark-count"]', '[data-e2e="favorite-count"]', '[data-e2e="video-saves"]'] }
    ];
    
    for (const item of countMap) {
      for (const selector of item.selectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim()) {
          const val = parseCount(el.textContent);
          if (val) { result[item.key] = val; break; }
        }
      }
    }
    
    // 策略2：通过按钮 aria-label 精准匹配（仅匹配明确的关键词）
    const buttons = document.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const title = (btn.getAttribute('title') || '').toLowerCase();
      const combined = label + ' ' + title;
      
      const count = extractButtonCount(btn);
      if (!count) continue;
      
      // 严格匹配：只匹配明确的关键词
      if (/\blike\b/.test(combined) && !/\bcomment\b/.test(combined)) {
        if (!result.likes) result.likes = count;
      } else if (/\bcomment\b/.test(combined)) {
        if (!result.comments) result.comments = count;
      } else if (/\bshare\b/.test(combined)) {
        if (!result.shares) result.shares = count;
      } else if (/\b(save|bookmark|favorite|collect)\b/.test(combined)) {
        if (!result.saves) result.saves = count;
      }
    }
    
    // 策略3：限定在视频右侧互动区域内查找按钮
    // 互动按钮特征：垂直排列，位于屏幕右侧，包含数字计数
    if (!result.likes || !result.comments || !result.saves) {
      const allBtns = document.querySelectorAll('button, [role="button"]');
      const rightButtons = [];
      
      for (const btn of allBtns) {
        const rect = btn.getBoundingClientRect();
        const count = extractButtonCount(btn);
        // 筛选条件：
        // 1. 在屏幕右侧 (>55%)
        // 2. 有有效计数
        // 3. 尺寸合理（不是大卡片或导航元素）
        // 4. 不在顶部导航栏
        if (count && count > 0 && count < 1000000000 &&
            rect.left > window.innerWidth * 0.55 &&
            rect.top > 80 &&
            rect.width < 80 && rect.height < 100) {
          rightButtons.push({ btn, count, top: rect.top });
        }
      }
      
      // 按垂直位置排序
      rightButtons.sort((a, b) => a.top - b.top);
      
      // 按垂直间距聚类：互动按钮通常聚在一起（间距<60px）
      const clusters = [];
      let currentCluster = [];
      for (let i = 0; i < rightButtons.length; i++) {
        if (currentCluster.length === 0) {
          currentCluster.push(rightButtons[i]);
        } else {
          const prevTop = currentCluster[currentCluster.length - 1].top;
          if (rightButtons[i].top - prevTop < 60) {
            currentCluster.push(rightButtons[i]);
          } else {
            if (currentCluster.length >= 3) clusters.push([...currentCluster]);
            currentCluster = [rightButtons[i]];
          }
        }
      }
      if (currentCluster.length >= 3) clusters.push([...currentCluster]);
      
      // 取最密集的聚类（间距最小、元素最多）
      let bestCluster = null;
      for (const c of clusters) {
        if (!bestCluster || c.length > bestCluster.length) {
          bestCluster = c;
        }
      }
      
      if (bestCluster && bestCluster.length >= 2) {
        // 去重计数
        const unique = [];
        const seen = new Set();
        for (const item of bestCluster) {
          if (!seen.has(item.count)) {
            seen.add(item.count);
            unique.push(item.count);
          }
        }
        
        console.log('[LF] 策略3 右侧聚类按钮计数:', unique, '聚类大小:', bestCluster.length);
        
        // 典型TikTok顺序：点赞→评论→收藏→分享
        if (unique.length >= 1 && !result.likes) result.likes = unique[0];
        if (unique.length >= 2 && !result.comments) result.comments = unique[1];
        if (unique.length >= 3 && !result.saves) result.saves = unique[2];
        if (unique.length >= 4 && !result.shares) result.shares = unique[3];
      }
    }
    
    console.log('[LF] 交互数据提取结果:', result);
  } catch (e) {
    console.warn('[LF] 提取交互数据失败:', e.message);
  }
  
  return result;
}

/**
 * 从按钮元素中提取计数数字
 */
function extractButtonCount(btn) {
  // 优先取按钮内所有纯数字文本中的最大值（TikTok计数通常在独立span中）
  const numbers = [];
  
  // 递归收集文本节点中的数字
  function collect(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (/^[\d.,]+[KMBkmb]?$/.test(text)) {
        const val = parseCount(text);
        if (val) numbers.push(val);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of node.childNodes) collect(child);
    }
  }
  collect(btn);
  
  if (numbers.length > 0) {
    // 取最大数字，避免SVG里的微小数字干扰
    return Math.max(...numbers);
  }
  
  // 备用：取aria-label中的数字
  const label = btn.getAttribute('aria-label') || '';
  const match = label.match(/([\d.,]+[KMBkmb]?)/);
  if (match) return parseCount(match[1]);
  
  return 0;
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
