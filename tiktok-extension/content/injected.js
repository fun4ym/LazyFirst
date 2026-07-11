/**
 * LazyFirst TikTok 扩展 - 页面主世界脚本
 * 负责：读取页面全局变量(SIGI/RENDER_DATA)、发起同域 XHR 爬取 video 内页
 * 与 content script 通过 window.postMessage 通信
 * 单独文件可避免 TikTok CSP 对 inline script 的拦截
 */
(function () {
  if (window.__LF_INJECTED_LOADED__) return;
  window.__LF_INJECTED_LOADED__ = true;

  console.log('[LF-injected] 主世界脚本已加载');

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'lf-request') return;
    const { action, callbackId } = e.data;
    if (!callbackId && action !== 'readSigi') return;

    if (action === 'readSigi') {
      readSigi();
    } else if (action === 'fetchFromCurrentPage') {
      fetchFromCurrentPage(e.data.videoId, callbackId);
    } else if (action === 'fetchVideoPage') {
      fetchVideoPage(e.data.videoUrl, callbackId);
    }
  });

  // 通知 content script 注入脚本已就绪
  window.postMessage({ source: 'lf-injected-ready', timestamp: Date.now() }, '*');

  // 页面刚加载时主动读一次 SIGI（异步数据可能随后才到）
  setTimeout(readSigi, 300);
  setTimeout(readSigi, 1500);
  setTimeout(readSigi, 3500);

  // ============================================================
  // ★ 拦截 TikTok 搜索/推荐 API，缓存每个视频的完整 stats
  // 这是搜索列表页获取播放/点赞/评论/收藏完整数据的关键
  // ============================================================
  setupSearchApiInterceptor();

  function readSigi() {
    const data = {};
    try {
      if (window.SIGI_STATE) {
        data.sigi = window.SIGI_STATE;
      }
      if (window.__UNIVERSAL_DATA_FOR_REHYDRATION__) {
        data.universal = window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
      }
      if (data.sigi || data.universal) {
        window.__LF_SIGI_DATA__ = data;
        window.postMessage({ source: 'lazyfirst-sigi', data: data, timestamp: Date.now() }, '*');
      }
    } catch (e) {
      console.error('[LF-injected] readSigi 错误:', e.message);
    }
  }

  // ============================================================
  // 方法1：从当前页全局变量里精确匹配 videoId 的统计
  // ============================================================
  function fetchFromCurrentPage(videoId, callbackId) {
    var result = null;
    var sources = [
      window.__RENDER_DATA__,
      window.SIGI_STATE,
      window.__UNIVERSAL_DATA_FOR_REHYDRATION__
    ];

    for (var i = 0; i < sources.length; i++) {
      if (!sources[i]) continue;
      var data = sources[i];
      if (typeof data === 'string') {
        try { data = JSON.parse(decodeURIComponent(atob(data))); }
        catch (e1) { try { data = JSON.parse(atob(data)); } catch (e2) { } }
      }
      if (data && typeof data === 'object') {
        var stats = searchStatsInObject(data, 0, String(videoId));
        if (stats) {
          result = stats;
          console.log('[LF-page-check] 在数据源', i, '中找到匹配视频统计!');
          break;
        }
      }
    }

    window.postMessage({ source: 'lf-page-check', callbackId: callbackId, success: !!result, stats: result }, '*');
  }

  function searchStatsInObject(obj, depth, tid) {
    if (!obj || depth > 12 || typeof obj !== 'object') return null;

    var idFields = ['id', 'videoId', 'itemId', 'aweme_id', 'awemeId'];
    var hasId = false;
    for (var f = 0; f < idFields.length; f++) {
      if (obj[idFields[f]] !== undefined && String(obj[idFields[f]]) === String(tid)) { hasId = true; break; }
    }
    if (hasId) {
      var s = obj.stats || obj.statsV2 || obj;
      if (s && (s.playCount !== undefined || s.viewCount !== undefined || s.diggCount !== undefined || s.commentCount !== undefined)) {
      return {
        plays: parseInt(s.playCount) || parseInt(s.viewCount) || 0,
        likes: parseInt(s.diggCount) || parseInt(s.likeCount) || 0,
        comments: parseInt(s.commentCount) || 0,
        shares: parseInt(s.shareCount) || 0,
        saves: parseInt(s.collectCount) || parseInt(s.favoriteCount) || parseInt(s.favouriteCount) || parseInt(s.saveCount) || 0
      };
      }
    }

    if (Array.isArray(obj)) {
      for (var j = 0; j < Math.min(obj.length, 80); j++) {
        var r = searchStatsInObject(obj[j], depth + 1, tid);
        if (r) return r;
      }
      return null;
    }

    var priorityKeys = ['ItemList', 'itemList', 'data', 'items', 'contents', 'state'];
    for (var k = 0; k < priorityKeys.length; k++) {
      if (obj[priorityKeys[k]] && typeof obj[priorityKeys[k]] === 'object') {
        var res = searchStatsInObject(obj[priorityKeys[k]], depth + 1, tid);
        if (res) return res;
      }
    }

    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      if (/html|proto|constructor|__proto__/i.test(key)) continue;
      if (typeof obj[key] === 'object' && obj[key]) {
        var r2 = searchStatsInObject(obj[key], depth + 1, tid);
        if (r2) return r2;
      }
    }
    return null;
  }

  // ============================================================
  // 方法2：XHR 爬取 video 内页并解析统计
  // ============================================================
  function fetchVideoPage(videoUrl, callbackId) {
    console.log('[LF-inject-fetch] 开始抓取:', videoUrl);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', videoUrl, true);
    xhr.withCredentials = true;
    xhr.timeout = 7000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          handleHtmlSuccess(xhr.responseText, callbackId);
        } else {
          sendError(callbackId, 'HTTP ' + xhr.status);
        }
      }
    };

    xhr.ontimeout = function () {
      sendError(callbackId, '请求超时');
    };

    xhr.onerror = function () {
      sendError(callbackId, '网络错误');
    };

    try {
      xhr.send();
    } catch (e) {
      sendError(callbackId, e.message);
    }
  }

  function decodeRenderData(raw) {
    if (!raw) return null;
    var attempts = [
      function () { return JSON.parse(decodeURIComponent(atob(raw))); },
      function () { return JSON.parse(atob(raw)); },
      function () { return JSON.parse(raw); }
    ];
    for (var i = 0; i < attempts.length; i++) {
      try {
        var d = attempts[i]();
        if (d && typeof d === 'object') return d;
      } catch (e) { }
    }
    return null;
  }

  function handleHtmlSuccess(html, callbackId) {
    console.log('[LF-inject-fetch] HTML长度:', html.length);

    var data = null;

    // 新版 TikTok: <script id="__RENDER_DATA__" type="application/json">BASE64</script>
    try {
      var m = html.match(/<script[^>]*id="__RENDER_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (m && m[1]) {
        data = decodeRenderData(m[1].trim());
        if (data) console.log('[LF-inject-fetch] RENDER_DATA(脚本标签) 解析成功');
      }
    } catch (e) { console.warn('[LF-inject-fetch] RENDER_DATA(脚本标签) 失败:', e.message); }

    // 旧版: window.__RENDER_DATA__ = 'BASE64'
    if (!data) {
      try {
        var m2 = html.match(/window\.__RENDER_DATA__\s*=\s*'([^']+)'/);
        if (m2 && m2[1]) {
          data = decodeRenderData(m2[1].trim());
          if (data) console.log('[LF-inject-fetch] RENDER_DATA(赋值) 解析成功');
        }
      } catch (e) { }
    }

    if (data) {
      var stats = searchForVideoStats(data);
      if (stats) { sendResult(callbackId, stats); return; }
      console.warn('[LF-inject-fetch] RENDER_DATA 已解析但未找到stats');
    }

    // SIGI_STATE（匹配到 </script> 结束，避免被首个 } 截断）
    try {
      var sigiMatch = html.match(/window\.SIGI_STATE\s*=\s*(\{[\s\S]*?\})\s*;\s*<\/script>/);
      if (sigiMatch && sigiMatch[1]) {
        var sigiData = new Function('return ' + sigiMatch[1])();
        var stats2 = searchForVideoStats(sigiData);
        if (stats2) { sendResult(callbackId, stats2); return; }
      }
    } catch (e) { console.warn('[LF-inject-fetch] SIGI_STATE 解析失败:', e.message); }

    // UNIVERSAL_DATA
    try {
      var uniMatch = html.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*(\{[\s\S]*?\})\s*;\s*<\/script>/);
      if (uniMatch && uniMatch[1]) {
        var uniData = new Function('return ' + uniMatch[1])();
        var stats3 = searchForVideoStats(uniData);
        if (stats3) { sendResult(callbackId, stats3); return; }
      }
    } catch (e) { }

    sendError(callbackId, '未找到视频统计数据（已拿到HTML但解析失败）');
  }

  function sendResult(callbackId, stats) {
    window.postMessage({ source: 'lf-video-fetcher', callbackId: callbackId, success: true, videoStats: stats }, '*');
  }

  function sendError(callbackId, msg) {
    console.error('[LF-inject-fetch] 错误:', msg);
    window.postMessage({ source: 'lf-video-fetcher', callbackId: callbackId, success: false, error: msg }, '*');
  }

  // ============================================================
  // 搜索 API 拦截器
  // ============================================================
  function setupSearchApiInterceptor() {
    if (window.__LF_API_INTERCEPTOR_LOADED__) return;
    window.__LF_API_INTERCEPTOR_LOADED__ = true;

    const cache = {};
    window.__LF_SEARCH_VIDEO_STATS__ = cache;

    // ★ 新增：作者/达人数据缓存（从搜索/推荐/Explore API提取的粉丝数、被赞总数等）
    const authorCache = {};
    window.__LF_AUTHOR_STATS__ = authorCache;

    function normalizeStats(rawStats) {
      if (!rawStats || typeof rawStats !== 'object') return null;
      return {
        plays: parseInt(rawStats.playCount) || parseInt(rawStats.viewCount) || parseInt(rawStats.vvCount) || 0,
        likes: parseInt(rawStats.diggCount) || parseInt(rawStats.likeCount) || 0,
        comments: parseInt(rawStats.commentCount) || 0,
        shares: parseInt(rawStats.shareCount) || 0,
        saves: parseInt(rawStats.collectCount) || parseInt(rawStats.favoriteCount) || parseInt(rawStats.favouriteCount) || parseInt(rawStats.saveCount) || 0
      };
    }

    function extractItemStats(item) {
      if (!item || typeof item !== 'object') return null;
      const id = item.id || item.videoId || item.itemId || item.aweme_id || item.awemeId;
      if (!id) return null;

      let stats = item.stats || item.statsV2;
      if (!stats && item.itemStruct) {
        stats = item.itemStruct.stats || item.itemStruct.statsV2;
      }
      if (!stats && item.video) {
        stats = item.video.stats || item.video.statsV2;
      }
      if (!stats) return null;

      const normalized = normalizeStats(stats);
      if (!normalized || (normalized.plays === 0 && normalized.likes === 0)) return null;

      return { videoId: String(id), ...normalized };
    }

    /**
     * ★ 从API项中提取作者/达人数据
     * 返回 { uniqueId, nickname, followerCount, totalLikes, videoCount }
     */
    function extractAuthorStats(item) {
      if (!item || typeof item !== 'object') return null;

      // 常见字段路径：item.author, item.itemStruct.author, item.user
      const author = item.author || item.itemStruct?.author || item.user || item.nicknameInfo || null;
      if (!author || typeof author !== 'object') return null;

      const uniqueId = (author.uniqueId || author.unique_id || author.shortId || author.short_id || '').trim().toLowerCase();
      if (!uniqueId) return null;

      // 作者统计：authorStats 最常见；也有 author.stats / stats
      const authorStats = item.authorStats || item.authorStatsV2 || item.authorStatistics ||
                          author.stats || author.statsV2 || author.authorStats || null;

      const followerCount = parseInt(
        authorStats?.followerCount ?? authorStats?.follower_count ?? author.followerCount ?? author.follower_count ?? 0
      );
      const followingCount = parseInt(
        authorStats?.followingCount ?? authorStats?.following_count ?? author.followingCount ?? author.following_count ?? 0
      );
      const totalLikes = parseInt(
        authorStats?.heartCount ?? authorStats?.heart_count ?? authorStats?.diggCount ?? authorStats?.digg_count ??
        author.heartCount ?? author.heart_count ?? author.diggCount ?? author.digg_count ?? 0
      );
      const videoCount = parseInt(
        authorStats?.videoCount ?? authorStats?.video_count ?? author.videoCount ?? author.video_count ?? 0
      );

      const nickname = author.nickname || author.nickName || author.userName || uniqueId;

      const result = {
        uniqueId,
        nickname,
        followerCount,
        followingCount,
        totalLikes,
        videoCount
      };
      return result;
    }

    function processSearchData(data) {
      if (!data || typeof data !== 'object') return;
      let updated = false;
      let authorUpdated = false;

      function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const el of node) walk(el);
          return;
        }
        // 如果当前对象像个视频项
        const s = extractItemStats(node);
        if (s) {
          cache[s.videoId] = s;
          updated = true;

          // ★ 同时提取并缓存该视频作者/达人数据
          const author = extractAuthorStats(node);
          if (author && author.uniqueId && (author.followerCount > 0 || author.totalLikes > 0)) {
            authorCache[author.uniqueId] = author;
            authorUpdated = true;
          }

          return; // 不再递归已识别项内部（避免误存）
        }
        // 优先遍历可能是列表的字段
        const listKeys = ['itemList', 'item_list', 'items', 'data', 'contents', 'videoList', 'video_list', 'searchItemList', 'search_item_list', 'aweme_list', 'awemeList'];
        for (const key of listKeys) {
          if (node[key] && typeof node[key] === 'object') {
            walk(node[key]);
          }
        }
        // 兜底：遍历普通对象属性（但跳过明显非数据的字段）
        for (const key of Object.keys(node)) {
          if (/html|proto|constructor|__proto__/i.test(key)) continue;
          if (listKeys.includes(key)) continue;
          if (typeof node[key] === 'object' && node[key]) {
            walk(node[key]);
          }
        }
      }

      walk(data);

      if (updated) {
        console.log('[LF-injected] 搜索API缓存更新，当前数量:', Object.keys(cache).length);
        window.postMessage({ source: 'lazyfirst-search-api-data', data: cache, timestamp: Date.now() }, '*');
      }

      if (authorUpdated) {
        console.log('[LF-injected] 作者API缓存更新，当前数量:', Object.keys(authorCache).length);
        window.postMessage({ source: 'lazyfirst-author-api-data', data: authorCache, timestamp: Date.now() }, '*');
      }
    }

    function isSearchApiUrl(url) {
      return typeof url === 'string' && /\/api\/(search|recommend|related|explore)/i.test(url);
    }

    // 拦截 fetch
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0] || '';
      const response = await origFetch.apply(this, args);
      if (isSearchApiUrl(url)) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          processSearchData(json);
        } catch (e) {
          // ignore
        }
      }
      return response;
    };

    // 拦截 XHR
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const xhrUrlMap = new WeakMap();
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      xhrUrlMap.set(this, url || '');
      return origOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function(...args) {
      const self = this;
      const url = xhrUrlMap.get(this) || '';
      if (isSearchApiUrl(url)) {
        const onload = function() {
          try {
            const text = self.responseText;
            if (text) {
              const json = JSON.parse(text);
              processSearchData(json);
            }
          } catch (e) {
            // ignore
          }
        };
        this.addEventListener('load', onload);
      }
      return origSend.apply(this, args);
    };

    console.log('[LF-injected] 搜索API拦截器已安装');
  }

  function searchForVideoStats(obj, depth) {
    depth = depth || 0;
    if (!obj || depth > 12 || typeof obj !== 'object') return null;

    var statObj = obj.stats || obj.statsV2;
    if (statObj && (
      statObj.playCount !== undefined ||
      statObj.viewCount !== undefined ||
      statObj.diggCount !== undefined ||
      statObj.commentCount !== undefined
    )) {
      var s = statObj;
      console.log('[LF-inject-fetch] ✅ 找到stats! play=' + (s.playCount || s.viewCount) + ' digg=' + s.diggCount);

      return {
        plays: parseInt(s.playCount) || parseInt(s.viewCount) || 0,
        likes: parseInt(s.diggCount) || parseInt(s.likeCount) || 0,
        comments: parseInt(s.commentCount) || 0,
        shares: parseInt(s.shareCount) || 0,
        saves: parseInt(s.collectCount) || parseInt(s.favoriteCount) || parseInt(s.favouriteCount) || parseInt(s.saveCount) || 0
      };
    }

    if (obj.playCount !== undefined || obj.viewCount !== undefined || obj.diggCount !== undefined) {
      return {
        plays: parseInt(obj.playCount) || parseInt(obj.viewCount) || 0,
        likes: parseInt(obj.diggCount) || parseInt(obj.likeCount) || 0,
        comments: parseInt(obj.commentCount) || 0,
        shares: parseInt(obj.shareCount) || 0,
        saves: parseInt(obj.collectCount) || parseInt(obj.favoriteCount) || 0
      };
    }

    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        var r = searchForVideoStats(obj[i], depth + 1);
        if (r) return r;
      }
      return null;
    }

    var priorityKeys = ['ItemList', 'itemList', 'items', 'data', 'contents', 'state'];
    for (var pk = 0; pk < priorityKeys.length; pk++) {
      if (obj[priorityKeys[pk]] && typeof obj[priorityKeys[pk]] === 'object') {
        var result = searchForVideoStats(obj[priorityKeys[pk]], depth + 1);
        if (result) return result;
      }
    }

    var keys = Object.keys(obj);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (['innerHTML', 'outerHTML', '__proto__', 'constructor'].indexOf(key) > -1) continue;
      if (typeof obj[key] === 'object' && obj[key] !== null && priorityKeys.indexOf(key) === -1) {
        var res = searchForVideoStats(obj[key], depth + 1);
        if (res) return res;
      }
    }

    return null;
  }
})();
