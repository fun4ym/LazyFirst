/**
 * LazyFirst TikTok 数据采集器 - partner.tiktokshop.com 内容脚本
 * 覆盖 TikTok Shop 联盟达人后台（/affiliate-cmp/creator 列表页与详情页），
 * 解析 GMV / MSS(Units sold) / APV(Avg. video views) 并注入「采集到系统」按钮，
 * 复用既有 SAVE_COLLECTED_DATA 消息通道上报，后端零改动。
 */
(function () {
  'use strict';

  // 与现有 content.js 共用同一全局已采集集合
  window.LF_COLLECTED_IDS = window.LF_COLLECTED_IDS || new Set();

  console.log('[LF-Partner] content script loaded');

  // 徽标短语（可能多词，如 "Fast growing" / "快速成长榜"），统一小写用于匹配
  const BADGE_PHRASES = [
    'fast growing', 'rising', 'top creator', 'new creator', 'star', 'official', 'new',
    '快速成长榜', 'top', '热门'
  ];

  // 常见表头文字，用于排除表头行
  const HEADER_TEXTS = [
    'creator', '达人', '视频', 'gmv',
    'units sold', 'units', '成交件数', '成交', '销量',
    'avg. video views', 'average video views', '平均视频播放量', '播放量',
    'engagement rate', 'engagement', '互动率',
    'action', '操作', '邀请'
  ];

  // ── 轻量 toast ──
  function showToast(msg, type) {
    let t = document.getElementById('lf-partner-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lf-partner-toast';
      (document.body || document.documentElement).appendChild(t);
    }
    t.textContent = msg;
    t.className = 'lf-show ' + (type === 'ok' ? 'lf-ok' : type === 'err' ? 'lf-err' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = t.className.replace('lf-show', '').trim(); }, 2400);
  }

  // ── 按钮工厂 ──
  function createCollectButton(handle, isDetail) {
    const btn = document.createElement('button');
    btn.className = 'lf-partner-btn' + (isDetail ? ' lf-detail' : '');
    if (window.LF_COLLECTED_IDS.has(handle)) {
      btn.textContent = '✓ 已采集';
      btn.classList.add('lf-collected');
      btn.disabled = true;
    } else {
      btn.textContent = '采集到系统';
    }
    return btn;
  }

  // ── 发送采集数据（复用 SAVE_COLLECTED_DATA） ──
  function sendCollect(data, btn) {
    const handle = data.tiktokId;
    if (window.LF_COLLECTED_IDS.has(handle)) {
      if (btn) { btn.textContent = '✓ 已采集'; btn.classList.add('lf-collected'); btn.disabled = true; }
      return;
    }
    if (btn) { btn.classList.add('lf-collecting'); btn.textContent = '采集中…'; btn.disabled = true; }

    chrome.runtime.sendMessage({ type: 'SAVE_COLLECTED_DATA', data: data }, response => {
      if (btn) btn.classList.remove('lf-collecting');
      if (response && response.success) {
        window.LF_COLLECTED_IDS.add(handle);
        if (btn) { btn.classList.add('lf-collected'); btn.textContent = '✓ 已采集'; btn.disabled = true; }
        showToast('已采集：' + handle, 'ok');
      } else {
        if (btn) { btn.disabled = false; btn.textContent = '采集失败重试'; }
        showToast('采集失败：' + ((response && response.message) || '未知错误'), 'err');
      }
    });
  }

  // 判断某行文本是否为徽标（如单独成行的 "Fast growing"）
  function isBadgeLine(line) {
    const t = (line || '').trim().toLowerCase();
    if (!t) return false;
    return BADGE_PHRASES.some(b => t === b);
  }

  // 判断某行是否为表头行（首单元格内容是表头文字）
  function isHeaderRow(row) {
    const first = row.querySelector('td, th');
    if (!first) return true;
    const text = (first.innerText || '').trim().toLowerCase();
    return HEADER_TEXTS.some(h => text === h || text.includes(h));
  }

  // ── 列表 Creator 单元格整体解析 ──
  // 单元格 innerText 按行分布：第0行=handle，第1行=徽标(可选)，第2行=昵称，其后为分类与粉丝统计
  function parseCreatorCell(cell) {
    const fullText = (cell.innerText || '').replace(/\r/g, '');
    const lines = fullText.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return { handle: '', nickname: '', followerCount: 0 };

    const handle = lines[0].replace(/^@/, '');

    let nickIndex = 1;
    if (lines.length > 1 && isBadgeLine(lines[1])) nickIndex = 2;
    const nickname = lines[nickIndex] ? lines[nickIndex] : '';

    let followerCount = 0;
    const demoLine = lines.find(l => /Female|Male|女性|男性|女|男/i.test(l));
    if (demoLine) {
      const m = demoLine.match(/([\d.,]+)\s*(K|M)?/i);
      if (m) {
        let v = parseFloat(m[1].replace(/,/g, ''));
        if (/K/i.test(m[2] || '')) v *= 1000;
        else if (/M/i.test(m[2] || '')) v *= 1000000;
        followerCount = v;
      }
    }
    return { handle: handle, nickname: nickname, followerCount: followerCount };
  }

  // ── 定位数据表并建立列索引映射 ──
  // 说明：partner 后台常把「表头」与「数据行」拆成两个独立 <table>（表头表无 tbody），
  // 因此这里先从任意一张含 GMV/Units sold 表头的表读出列序，再去找真正含数据行的表。
  function findDataTable() {
    const tables = Array.from(document.querySelectorAll('table'));

    // 1) 从表头读出列索引映射（兼容中英文）
    let map = null;
    for (const table of tables) {
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) continue;
      const headers = Array.from(headerRow.querySelectorAll('th, td'));
      const texts = headers.map(h => (h.innerText || '').trim().toLowerCase());

      const hasGmv = texts.some(t => t === 'gmv' || t.includes('gmv'));
      const hasUnits = texts.some(t =>
        t.includes('units sold') || t === 'units' ||
        t.includes('成交') || t.includes('销量') || t.includes('sold')
      );
      if (!hasGmv || !hasUnits) continue;

      map = {};
      texts.forEach((t, i) => {
        if (t.includes('creator') || t.includes('达人') || t.includes('creator')) map.creator = i;
        else if (t === 'gmv' || t.includes('gmv')) map.gmv = i;
        else if (t.includes('units sold') || t === 'units' || t.includes('成交') || t.includes('销量') || t.includes('sold')) map.mss = i;
        else if (t.includes('video views') || t.includes('avg') || t.includes('平均视频播放') || t.includes('播放量')) map.apv = i;
      });
      if (map.creator === undefined) map.creator = 0;
      break;
    }
    if (!map) return null;

    // 2) 找到真正含数据行的表（排除表头行，首单元格非空）
    for (const table of tables) {
      const tbody = table.querySelector('tbody') || table;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const dataRows = rows.filter(r => {
        const c = r.querySelectorAll('td, th');
        if (c.length === 0) return false;
        const firstText = (c[0].innerText || '').trim();
        return /\S/.test(firstText) && !isHeaderRow(r);
      });
      if (dataRows.length > 0) {
        return { table: table, map: map, dataRows: dataRows };
      }
    }
    // 表头已匹配但数据尚未加载
    return { table: null, map: map, dataRows: [] };
  }

  // ── 列表页：为每行第一列（达人列）最左侧注入采集按钮 ──
  function injectListButtons(result) {
    if (!result || !result.table) return;
    const { table, map, dataRows } = result;
    const rows = (dataRows && dataRows.length > 0)
      ? dataRows
      : Array.from((table.querySelector('tbody') || table).querySelectorAll('tr')).filter(r => !isHeaderRow(r));
    rows.forEach(row => {
      if (row.querySelector('.lf-partner-btn')) return; // 已注入则跳过
      const cells = row.querySelectorAll('td, th');
      if (cells.length === 0) return;
      const creatorCell = cells[map.creator];
      if (!creatorCell) return;
      const { handle } = parseCreatorCell(creatorCell);
      if (!handle) return;

      const btn = createCollectButton(handle, false);
      btn.classList.add('lf-list-front');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        collectFromRow(row, map, handle, btn);
      });

      // 把按钮放到达人头像左侧，与达人信息并排
      if (!creatorCell.querySelector('.lf-creator-info')) {
        const info = document.createElement('div');
        info.className = 'lf-creator-info';
        while (creatorCell.firstChild) {
          info.appendChild(creatorCell.firstChild);
        }
        creatorCell.appendChild(info);
      }
      creatorCell.classList.add('lf-has-collect-btn');
      creatorCell.insertBefore(btn, creatorCell.firstChild);
    });
  }

  function collectFromRow(row, map, handle, btn) {
    const cells = row.querySelectorAll('td, th');
    const creatorCell = cells[map.creator];
    const { nickname, followerCount } = parseCreatorCell(creatorCell);
    const gmv = parsePartnerMetric(cells[map.gmv] ? cells[map.gmv].innerText : '');
    const mss = parsePartnerMetric(cells[map.mss] ? cells[map.mss].innerText : '');
    const apv = parsePartnerMetric(cells[map.apv] ? cells[map.apv].innerText : '');

    const data = {
      tiktokId: handle,
      nickname: nickname,
      followerCount: followerCount,
      estimatedGmv: gmv.value,
      monthlySalesCount: mss.value,
      avgVideoViews: apv.value,
      collectedAt: new Date().toISOString(),
      source: 'partner'
    };
    console.log('[LF-Partner] 列表采集:', data);
    sendCollect(data, btn);
  }

  // ── 详情页：在指标区块附近按 label 找 value ──
  function findLabelLeaf(labels) {
    const leaves = Array.from(document.querySelectorAll('*')).filter(el => el.childElementCount === 0);
    return leaves.find(el => {
      const t = el.textContent.trim().toLowerCase();
      return labels.some(l => t === l.toLowerCase());
    });
  }

  // 从 label 叶节点起，沿文档顺序向后扫描，取第一个含数字且非其它已知标签的文本。
  // 兼容 partner 详情页「标签与数值不在同一父节点」的布局（实测 Revenue/Units sold/APV 均适用）。
  const METRIC_STOPS = /^(Revenue|Units sold|Avg\. video views|GPM|Engagement|Followers|Orders|Video|Sales|Likes|Comments|Shares|Views|收入|营收|成交件数|销量|平均视频播放量|粉丝|粉絲)$/i;

  function findValueNear(labelEl) {
    const leaves = Array.from(document.querySelectorAll('*')).filter(el => el.childElementCount === 0);
    const idx = leaves.indexOf(labelEl);
    if (idx === -1) return null;
    for (let j = idx + 1; j < leaves.length; j++) {
      const t = (leaves[j].textContent || '').trim();
      if (/\d/.test(t)) {
        if (METRIC_STOPS.test(t)) break; // 遇到下一个指标标签则停止
        return t;
      }
    }
    return null;
  }

  function findMetricValue(labels) {
    const el = findLabelLeaf(labels);
    if (el) {
      const v = findValueNear(el);
      if (v) return parsePartnerMetric(v).value;
    }
    return 0;
  }

  function parseDetail() {
    const followerEl = Array.from(document.querySelectorAll('*'))
      .find(el => el.childElementCount === 0 && /^(Followers|粉丝|粉絲)/i.test((el.textContent || '').trim()));
    if (!followerEl) return null;

    let followerCount = 0;
    const fv = findValueNear(followerEl);
    if (fv) followerCount = parsePartnerMetric(fv).value;

    // 头部容器：向上回溯若干层，拿首行 handle / nickname
    let headerContainer = followerEl;
    for (let i = 0; i < 6; i++) {
      headerContainer = headerContainer.parentElement;
      if (!headerContainer) break;
    }
    const headerLines = ((headerContainer && headerContainer.innerText) || '')
      .replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
    // 头部按行分布：第0行=handle，第1行=徽标(可选)，第2行=昵称
    const handle = (headerLines[0] || '').replace(/^@/, '');
    let nickIndex = 1;
    if (headerLines.length > 1 && isBadgeLine(headerLines[1])) nickIndex = 2;
    const nickname = headerLines[nickIndex] ? headerLines[nickIndex] : '';
    if (!handle) return null;

    const estimatedGmv = findMetricValue(['Revenue', '收入', '营收', 'GMV']);
    const monthlySalesCount = findMetricValue(['Units sold', '成交件数', '销量', '成交']);
    const avgVideoViews = findMetricValue(['Avg. video views', 'Average video views', '平均视频播放量', '平均播放']);

    return {
      handle: handle,
      nickname: nickname,
      followerCount: followerCount,
      estimatedGmv: estimatedGmv,
      monthlySalesCount: monthlySalesCount,
      avgVideoViews: avgVideoViews
    };
  }

  // ── 详情页：注入采集按钮，返回是否成功注入 ──
  function injectDetailButton() {
    if (document.getElementById('lf-partner-detail-btn')) return true;
    const data = parseDetail();
    if (!data || !data.handle) return false;

    // 锚点：优先插在 Invite 按钮之后，否则插在 Followers 容器之后
    const inviteBtn = Array.from(document.querySelectorAll('button'))
      .find(b => /invite|邀请/i.test(b.textContent || ''));
    let anchor = inviteBtn || null;
    if (!anchor) {
      const fEl = Array.from(document.querySelectorAll('*'))
        .find(el => el.childElementCount === 0 && /^(Followers|粉丝|粉絲)/i.test((el.textContent || '').trim()));
      anchor = fEl ? fEl.parentElement : null;
    }
    if (!anchor || !anchor.parentElement) return false;

    const btn = createCollectButton(data.handle, true);
    btn.id = 'lf-partner-detail-btn';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const d = parseDetail();
      if (!d) return;
      const payload = Object.assign({}, d, {
        tiktokId: d.handle,
        collectedAt: new Date().toISOString(),
        source: 'partner'
      });
      console.log('[LF-Partner] 详情采集:', payload);
      sendCollect(payload, btn);
    });
    anchor.parentElement.insertBefore(btn, anchor.nextSibling);
    return true;
  }

  // ── 主循环：适配 SPA 路由与异步加载 ──
  let listObserver = null;
  let detailObserver = null;
  let currentPageKey = '';

  function mainLoop() {
    const url = location.href;
    const isDetail = url.indexOf('/affiliate-cmp/creator/detail') !== -1;
    const isList = url.indexOf('/affiliate-cmp/creator') !== -1;
    const pageKey = isDetail ? 'detail' : (isList ? 'list' : 'other');

    if (pageKey !== currentPageKey) {
      if (listObserver) { listObserver.disconnect(); listObserver = null; }
      if (detailObserver) { detailObserver.disconnect(); detailObserver = null; }
      currentPageKey = pageKey;
    }

    if (isList) {
      const r = findDataTable();
      if (r && r.table) {
        injectListButtons(r);
        if (!listObserver) {
          const tbody = r.table.querySelector('tbody') || r.table;
          listObserver = new MutationObserver(() => injectListButtons(findDataTable()));
          listObserver.observe(tbody, { childList: true, subtree: true });
        }
      }
    } else if (isDetail) {
      if (!detailObserver && injectDetailButton()) {
        detailObserver = new MutationObserver(() => injectDetailButton());
        detailObserver.observe(document.body, { childList: true, subtree: true });
      }
    }
  }

  setInterval(mainLoop, 1000);
  mainLoop();
})();
