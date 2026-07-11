/**
 * LazyFirst TikTok 数据采集器 - VideoStatsOverlay
 * 搜索页视频卡片右下角紧凑数据标签 + 采集按钮
 * 配色：LazyFirst 商务紫色系
 */

// ── 全局采集状态：已采集的达人ID集合 ──
window.LF_COLLECTED_IDS = window.LF_COLLECTED_IDS || new Set();

// ── 主题色 ──
const LF_COLORS = {
  primary: '#7b1fa2',
  primaryDark: '#4a148c',
  primaryLight: '#9c4dcc',
  bg: '#faf5ff',
  border: '#e8e4ef',
  accent: '#f3e5f5',
  white: '#ffffff',
  textPrimary: '#2d1b4e',
  textSecondary: '#7c6d8f',
  success: '#66bb6a',
  successBg: '#e8f5e9'
};

/**
 * 格式化紧凑数字
 */
function formatCompact(num) {
  if (num === '-' || num === undefined || num === null) return '-';
  if (typeof num === 'string') return num;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

/**
 * 创建右下角紧凑视频数据覆盖层
 * @param {Object} videoData - 视频数据
 * @param {Object} authorData - 达人数据
 * @param {Boolean} loading - 是否为读取中状态（显示 "loading..."）
 * @returns {HTMLElement}
 */
function createVideoCardOverlay(videoData, authorData, loading = false) {
  const plays = videoData?.plays || 0;
  const likes = videoData?.likes || 0;
  const comments = videoData?.comments || 0;
  const shares = videoData?.shares || 0;
  const saves = videoData?.saves || 0;

  // ═══ loading 态：读取中，显示骨架微光 + "loading..." ═══
  if (loading) {
    const container = document.createElement('div');
    container.className = 'lf-compact-overlay lf-loading';
    container.innerHTML = `
      <div class="lf-loading-text">loading...</div>
      <div class="lf-loading-skeleton">
        <span></span><span></span><span></span><span></span>
      </div>
    `;
    return container;
  }

  // ═══ 关键判断：播放量=点赞数？说明是同一数据源（搜索页只有点赞数）═══
  const hasRealPlays = plays > 0 && (likes === 0 || plays !== likes);
  const hasRealLikes = likes > 0;
  const hasRealComments = comments > 0;
  const hasRealSaves = saves > 0;

  // ★ 统计有效数据字段数量
  const dataFieldsCount = (hasRealPlays ? 1 : 0) + (hasRealLikes ? 1 : 0) + 
                          (hasRealComments ? 1 : 0) + (hasRealSaves ? 1 : 0);

  // ★ 根据数据完整度选择布局策略：
  // - 完整数据：2x2网格（播/赞/评/藏）
  // - 只有1个数字：大字高亮居中 + 其他字段用'-'
  // - 有2个以上数字：正常网格

  let statsHtml;

  if (dataFieldsCount >= 3) {
    // 数据较完整，使用标准2x2布局：播、赞、评、藏
    statsHtml = `
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${formatCompact(plays)}</span>
        <span class="lf-compact-label">播</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${formatCompact(likes)}</span>
        <span class="lf-compact-label">赞</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${comments > 0 ? formatCompact(comments) : '-'}</span>
        <span class="lf-compact-label">评</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${saves > 0 ? formatCompact(saves) : '-'}</span>
        <span class="lf-compact-label">藏</span>
      </div>
    `;
  } else if (hasRealLikes && !hasRealPlays) {
    // 只有点赞数据：突出显示点赞数 + 显示其他字段为'-'
    statsHtml = `
      <div class="lf-compact-stat lf-stat-highlight" style="grid-column: span 2;">
        <span class="lf-compact-value lf-value-large">${formatCompact(likes)}</span>
        <span class="lf-compact-label">赞</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${comments > 0 ? formatCompact(comments) : '-'}</span>
        <span class="lf-compact-label">评</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${saves > 0 ? formatCompact(saves) : '-'}</span>
        <span class="lf-compact-label">藏</span>
      </div>
    `;
  } else if (hasRealPlays && !hasRealLikes) {
    // 只有播放数据：突出显示播放量
    statsHtml = `
      <div class="lf-compact-stat lf-stat-highlight" style="grid-column: span 2;">
        <span class="lf-compact-value lf-value-large">${formatCompact(plays)}</span>
        <span class="lf-compact-label">播</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">-</span>
        <span class="lf-compact-label">赞</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${comments > 0 ? formatCompact(comments) : '-'}</span>
        <span class="lf-compact-label">评</span>
      </div>
    `;
  } else {
    // 默认：始终显示所有字段
    statsHtml = `
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${hasRealPlays ? formatCompact(plays) : '-'}</span>
        <span class="lf-compact-label">播</span>
      </div>
      <div class="lf-compact-stat ${hasRealLikes && !hasRealPlays ? 'lf-stat-highlight' : ''}">
        <span class="lf-compact-value ${hasRealLikes && !hasRealPlays ? 'lf-value-large' : ''}">${hasRealLikes ? formatCompact(likes) : '-'}</span>
        <span class="lf-compact-label">赞</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${comments > 0 ? formatCompact(comments) : '-'}</span>
        <span class="lf-compact-label">评</span>
      </div>
      <div class="lf-compact-stat">
        <span class="lf-compact-value">${saves > 0 ? formatCompact(saves) : '-'}</span>
        <span class="lf-compact-label">藏</span>
      </div>
    `;
  }

  const container = document.createElement('div');
  container.className = 'lf-compact-overlay';

  container.innerHTML = `
    <div class="lf-compact-stats lf-search-stats">${statsHtml}</div>
  `;

  // 让容器本身不拦截鼠标事件（穿透到视频卡片）
  container.addEventListener('click', (e) => {
    // 穿透点击到下方视频卡片
    const card = container.closest('[data-lazyfirst-processed]');
    if (card) {
      const videoLink = card.querySelector('a[href*="/video/"]');
      if (videoLink) videoLink.click();
    }
  });

  return container;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createVideoCardOverlay, formatCompact };
}
