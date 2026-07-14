/**
 * LazyFirst TikTok 数据采集器 - InfluencerMetricsOverlay
 * 搜索页视频卡片达人信息覆盖层：粉丝数、被点赞总数 + scrape / send message 按钮
 */

// 依赖 VideoStatsOverlay.js 提供的 formatCompact；
// 若未加载，提供本地兜底实现
function ensureFormatCompact(num) {
  if (typeof formatCompact === 'function') return formatCompact(num);
  if (num === '-' || num === undefined || num === null) return '-';
  if (typeof num === 'string') return num;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

/**
 * 创建右下角达人信息覆盖层
 * @param {Object} metrics - { followers, totalLikes }（后端返回，可为空）
 * @param {Object} authorData - { tiktokId, nickname, followerCount }
 * @param {Boolean} loading - 是否读取中（显示 loading...）
 * @returns {HTMLElement}
 */
function createInfluencerMetricsOverlay(metrics, authorData, loading = false) {
  const tiktokId = authorData?.tiktokId || '';
  const collected = window.LF_COLLECTED_IDS && window.LF_COLLECTED_IDS.has(tiktokId);

  // loading 态：读取中
  if (loading) {
    const container = document.createElement('div');
    container.className = 'lf-influencer-metrics-overlay lf-loading';
    container.dataset.tiktokId = tiktokId;
    container.innerHTML = `
      <div class="lf-loading-text">loading...</div>
      <div class="lf-loading-skeleton">
        <span></span><span></span>
      </div>
    `;
    return container;
  }

  // 粉丝数：后端优先，DOM 兜底
  const followers = (metrics && metrics.followers) || authorData?.followerCount || 0;
  const totalLikes = (metrics && metrics.totalLikes) || 0;

  const container = document.createElement('div');
  container.className = 'lf-influencer-metrics-overlay';
  container.dataset.tiktokId = tiktokId;

  container.innerHTML = `
    <div class="lf-influencer-metrics-grid">
      <div class="lf-influencer-metric">
        <span class="lf-influencer-metric-value">${ensureFormatCompact(followers)}</span>
        <span class="lf-influencer-metric-label">粉丝数</span>
      </div>
      <div class="lf-influencer-metric">
        <span class="lf-influencer-metric-value">${ensureFormatCompact(totalLikes)}</span>
        <span class="lf-influencer-metric-label">被赞总数</span>
      </div>
    </div>
    <div class="lf-influencer-actions">
      <button class="lf-scrape-btn ${collected ? 'lf-collected' : ''}"
              data-tiktok-id="${tiktokId}"
              data-nickname="${authorData?.nickname || ''}"
              ${collected ? 'disabled' : ''}>
        ${collected ? '✓ scraped' : 'scrape'}
      </button>
      <button class="lf-msg-btn"
              data-tiktok-id="${tiktokId}"
              data-nickname="${authorData?.nickname || ''}">
        send message
      </button>
    </div>
  `;

  // 绑定 scrape 按钮
  const scrapeBtn = container.querySelector('.lf-scrape-btn');
  scrapeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleScrapeClick(scrapeBtn, authorData);
  });

  // 绑定 send message 按钮
  const msgBtn = container.querySelector('.lf-msg-btn');
  msgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleSendMessageClick(msgBtn, authorData);
  });

  // 让容器本身不拦截鼠标事件（穿透到视频卡片）
  container.addEventListener('click', (e) => {
    if (e.target === scrapeBtn || e.target === msgBtn) return;
    const card = container.closest('[data-lazyfirst-processed]');
    if (card) {
      const videoLink = card.querySelector('a[href*="/video/"]');
      if (videoLink) videoLink.click();
    }
  });

  return container;
}

/**
 * 更新已存在的达人信息覆盖层
 */
function updateInfluencerMetricsOverlay(existingOverlay, metrics, authorData) {
  const newOverlay = createInfluencerMetricsOverlay(metrics, authorData, false);
  newOverlay.style.opacity = '0';
  newOverlay.style.transition = 'opacity 0.3s ease';
  existingOverlay.replaceWith(newOverlay);
  requestAnimationFrame(() => {
    newOverlay.style.opacity = '1';
  });
  return newOverlay;
}

/**
 * scrape 按钮点击：采集达人数据写入数据库
 */
function handleScrapeClick(btn, authorData) {
  const tiktokId = btn.dataset.tiktokId;
  if (!tiktokId || (window.LF_COLLECTED_IDS && window.LF_COLLECTED_IDS.has(tiktokId))) return;

  btn.classList.add('lf-collecting');
  btn.textContent = '...';
  btn.disabled = true;

  chrome.runtime.sendMessage({
    type: 'SAVE_COLLECTED_DATA',
    data: {
      ...authorData,
      collectedAt: new Date().toISOString()
    }
  }, response => {
    if (response && response.success) {
      if (window.LF_COLLECTED_IDS) window.LF_COLLECTED_IDS.add(tiktokId);
      btn.classList.remove('lf-collecting');
      btn.classList.add('lf-collected');
      btn.textContent = '✓ scraped';
      btn.disabled = true;
      console.log('[LF] ✅ scrape 成功:', tiktokId);
    } else {
      btn.classList.remove('lf-collecting');
      btn.textContent = 'scrape';
      btn.disabled = false;
      console.error('[LF] ❌ scrape 失败:', tiktokId, response);
    }
  });
}

/**
 * send message 按钮点击：拉取当前 BD 模板 → 渲染占位符 → 打开 TikTok 私信框填值
 */
function handleSendMessageClick(btn, authorData) {
  const tiktokId = btn.dataset.tiktokId;
  if (!tiktokId) return;

  const username = String(tiktokId).replace(/^\/+/, '').replace(/^@/, '');
  btn.classList.add('lf-collecting');
  btn.textContent = '...';

  chrome.runtime.sendMessage({ type: 'GET_MESSAGE_TEMPLATE' }, (response) => {
    btn.classList.remove('lf-collecting');
    btn.textContent = 'send message';

    // 三语模板，默认使用泰文
    const templates = (response && response.success && response.templates) || {};
    const template = templates.th || templates.en || templates.zh || 'Hi {昵称}, nice to connect!';
    const rendered = renderMessageTemplate(template, authorData);

    // 打开 TikTok 私信页（由 BD 手动发送）
    const dmUrl = `https://www.tiktok.com/message/@${username}`;
    window.open(dmUrl, '_blank');

    // 把渲染后的文案暂存到全局，供私信页 content script 注入填值
    window.__LF_PENDING_DM__ = { username, text: rendered };
    console.log('[LF] 打开私信框并预填文案:', username, rendered);
  });
}

/**
 * 渲染消息模板占位符（白名单：{昵称} {粉丝数}）
 */
function renderMessageTemplate(template, authorData) {
  if (!template) return '';
  const nickname = authorData?.nickname || authorData?.tiktokId || '';
  const followers = authorData?.followerCount || 0;
  return template
    .replace(/\{昵称\}/g, nickname)
    .replace(/\{粉丝数\}/g, ensureFormatCompact(followers));
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createInfluencerMetricsOverlay,
    updateInfluencerMetricsOverlay,
    renderMessageTemplate
  };
}
