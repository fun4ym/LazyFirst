/**
 * LazyFirst TikTok 数据采集器 - 常量定义
 */

// API地址（默认开发环境：后端运行在 3000 端口，见 frontend/.env.development / vite.config.js proxy）
// 注意：popup/background 实际优先读取用户在 options 页配置的 apiUrl（chrome.storage），
// 以下常量仅作为最终回退与集中声明，避免端口硬编码散落多处导致联调失败。
const DEFAULT_API_URL = 'http://localhost:3000/api';

// 前端管理页面地址（开发环境 vite 端口，见 frontend/vite.config.js port:5174）
const FRONTEND_BASE_URL_DEV = 'http://localhost:5174';

// 生产环境回退域名（background.js 内另有一份，二者需保持一致；如有变更请主人确认后统一修改）
const PROD_API_FALLBACK = 'https://tap.lazyfirst.com';

// TikTok页面URL模式
const TIKTOK_URL_PATTERNS = {
  SEARCH: /https:\/\/www\.tiktok\.com\/search/,
  PROFILE: /\/@[\w.]+$/,
  VIDEO: /https:\/\/www\.tiktok\.com\/video\/\d+/
};

// DOM选择器（TikTok页面元素）
const TIKTOK_SELECTORS = {
  // 搜索页
  SEARCH_VIDEO_CARD: '[data-e2e="video-card"]',
  SEARCH_AUTHOR_LINK: 'a[href^="/@"]',
  SEARCH_AUTHOR_NAME: '[data-e2e="video-author-uniqueid"]',
  SEARCH_AUTHOR_FOLLOWERS: '[data-e2e="video-author-followers"]',
  
  // 达人主页
  PROFILE_USERNAME: 'h1[data-e2e="user-title"]',
  PROFILE_NICKNAME: 'h2[data-e2e="user-subtitle"]',
  PROFILE_FOLLOWERS: 'strong[data-e2e="followers-count"]',
  PROFILE_FOLLOWING: 'strong[data-e2e="following-count"]',
  PROFILE_LIKES: 'strong[data-e2e="likes-count"]',
  
  // 视频详情页
  VIDEO_TITLE: 'h1[data-e2e="video-title"]',
  VIDEO_PLAYS: 'strong[data-e2e="video-plays"]',
  VIDEO_LIKES: 'strong[data-e2e="video-likes"]',
  VIDEO_COMMENTS: 'strong[data-e2e="video-comments"]',
  VIDEO_SHARES: 'strong[data-e2e="video-shares"]',
  VIDEO_AUTHOR_LINK: 'a[href^="/@"]',
  VIDEO_AUTHOR_NAME: '[data-e2e="video-author-uniqueid"]',
  VIDEO_AUTHOR_FOLLOWERS: '[data-e2e="video-author-followers"]'
};

// 消息类型
const MESSAGE_TYPES = {
  IMPORT_INFLUENCER: 'IMPORT_INFLUENCER',
  FETCH_INFLUENCER: 'FETCH_INFLUENCER',
  CHECK_AUTH: 'CHECK_AUTH'
};

// 存储键
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  API_URL: 'apiUrl',
  USER: 'user',
  LOGIN_TIME: 'loginTime',
  TODAY_SYNC_COUNT: 'todaySyncCount',
  LAST_SYNC_TIME: 'lastSyncTime'
};

// 导出（Chrome Extension环境中，直接定义在全局）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_API_URL,
    TIKTOK_URL_PATTERNS,
    TIKTOK_SELECTORS,
    MESSAGE_TYPES,
    STORAGE_KEYS
  };
}
