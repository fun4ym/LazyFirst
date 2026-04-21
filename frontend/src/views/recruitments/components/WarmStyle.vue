<template>
  <div class="warm-style-page">
    <!-- 背景装饰 -->
    <div class="warm-bg">
      <div class="warm-orb warm-orb-1"></div>
      <div class="warm-orb warm-orb-2"></div>
      <div class="warm-orb warm-orb-3"></div>
    </div>

    <!-- 主内容 -->
    <div class="warm-content">
      <!-- 顶部 Header -->
      <header class="warm-header">
        <div class="header-inner">
          <div class="header-brand">
            <img src="/logo.png" alt="Logo" class="header-logo" />
            <div class="header-text">
              <div class="brand-name">LazyFirst Co., Ltd.</div>
              <div class="brand-tag">TAP การรับรองไทยความร่วมมือองค์กร</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Hero 区域 -->
      <section class="warm-hero" :style="{ background: `linear-gradient(135deg, ${themeColor}22, ${themeColor}44)` }">
        <div class="hero-decoration">
          <div class="deco-circle deco-1"></div>
          <div class="deco-circle deco-2"></div>
        </div>
        <div class="hero-badge" :style="{ background: themeColor }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          <span>รับสมัครจำกัดเวลา</span>
        </div>
        <h1 class="hero-title" :style="{ color: themeColor }">{{ recruitment.name }}</h1>
        <p v-if="recruitment.description" class="hero-desc">{{ recruitment.description }}</p>
      </section>

      <!-- 达人要求卡片 -->
      <section class="warm-requirements">
        <div class="req-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>ข้อกำหนดมีเดียร์</span>
        </div>
        <div class="req-grid">
          <div class="req-card" :style="{ borderColor: themeColor }">
            <div class="req-icon" :style="{ background: `${themeColor}15` }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="req-label">ข้อกำหนด GMV</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementGmv > 0 ? recruitment.requirementGmv.toLocaleString() : '-' }}
            </div>
          </div>
          <div class="req-card" :style="{ borderColor: themeColor }">
            <div class="req-icon" :style="{ background: `${themeColor}15` }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div class="req-label">จำนวนผู้ติดตาม</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementFollowers > 0 ? recruitment.requirementFollowers + 'K' : '-' }}
            </div>
          </div>
          <div class="req-card" :style="{ borderColor: themeColor }">
            <div class="req-icon" :style="{ background: `${themeColor}15` }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div class="req-label">ยอดขายรายเดือน</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementMonthlySales > 0 ? recruitment.requirementMonthlySales.toLocaleString() : '-' }}
            </div>
          </div>
          <div class="req-card" :style="{ borderColor: themeColor }">
            <div class="req-icon" :style="{ background: `${themeColor}15` }">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div class="req-label">ยอดเข้าชมเฉลี่ย</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementAvgViews > 0 ? recruitment.requirementAvgViews.toLocaleString() : '-' }}
            </div>
          </div>
        </div>
      </section>

      <!-- 产品列表 -->
      <section class="warm-products">
        <div class="products-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span>สินค้าที่รวม</span>
          <span class="product-count" v-if="recruitment.products?.length">({{ recruitment.products.length }})</span>
        </div>

        <div v-if="recruitment.products && recruitment.products.length > 0" class="product-list">
          <div v-for="prod in recruitment.products" :key="prod._id" class="product-card" :style="{ borderColor: `${themeColor}40` }">
            <div class="card-main">
              <div class="product-image" :style="{ background: `${themeColor}15` }">
                <img v-if="prod.images && prod.images.length > 0" :src="prod.images[0]" />
                <div v-else class="img-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
              </div>
              <div class="product-info">
                <a v-if="getDefaultActivityLink(prod)" :href="getDefaultActivityLink(prod)" target="_blank" class="product-name" :style="{ color: themeColor }">
                  {{ prod.name }}
                </a>
                <div v-else class="product-name">{{ prod.name }}</div>
                <div class="product-id" :style="{ color: themeColor }">{{ prod.tiktokProductId || prod.sku || '-' }}</div>
              </div>
            </div>

            <!-- 更多图片 -->
            <div v-if="prod.images && prod.images.length > 1" class="product-images">
              <img v-for="(img, idx) in prod.images.slice(1, 4)" :key="idx" :src="img" class="thumb-img" />
              <div v-if="prod.images.length > 4" class="more-badge">+{{ prod.images.length - 4 }}</div>
            </div>

            <!-- 佣金信息 -->
            <div class="product-rates">
              <div class="rate-item">
                <span class="rate-label">อัตราค่าคอมสแควร์</span>
                <span class="rate-value rate-square">{{ formatRate(getProductSquareRate(prod)) }}</span>
              </div>
              <div class="rate-item">
                <span class="rate-label">รายได้โปรโมชั่น</span>
                <span class="rate-value rate-promo" :style="{ color: themeColor }">{{ formatRate(getProductPromoRate(prod)) }}</span>
              </div>
              <div v-if="calcExtra(prod) > 0" class="rate-extra" :style="{ background: `${themeColor}15`, borderColor: `${themeColor}40` }">
                <span class="extra-badge" :style="{ background: themeColor }">+{{ calcExtra(prod) }}%</span>
                <span class="extra-text">โปรโมชั่นเพิ่ม</span>
              </div>
            </div>

            <!-- TikTok 按钮 -->
            <div class="product-action" v-if="getDefaultActivityLink(prod)">
              <a :href="getDefaultActivityLink(prod)" target="_blank" class="tiktok-btn" :style="{ background: themeColor }">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.3 0 .59.05.86.12V9.01a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.84a4.84 4.84 0 0 1-1.01-.15z"/>
                </svg>
                <span>สมัครตัวอย่างทันที</span>
              </a>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>ไม่มีสินค้าชั่วคราว</p>
        </div>
      </section>

      <!-- Footer -->
      <footer class="warm-footer" :style="{ background: `${themeColor}10` }">
        <router-link to="/products/public" class="footer-link" :style="{ color: themeColor }">
          ดูสินค้าเพิ่มเติม >>
        </router-link>
        <div class="footer-info">
          <div class="footer-brand">LazyFirst Co., Ltd.</div>
          <div class="footer-copy">Copyright © 2026 All Rights Reserved</div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  recruitment: {
    type: Object,
    required: true
  },
  themeColor: {
    type: String,
    default: '#775999'
  }
})

// 格式化佣金率
const formatRate = (rate) => {
  if (!rate && rate !== 0) return '-'
  return (rate * 100).toFixed(1) + '%'
}

// 获取默认活动配置
const getDefaultActivityConfig = (prod) => {
  if (prod.activityConfigs && prod.activityConfigs.length > 0) {
    const defaultConfig = prod.activityConfigs.find(ac => ac.isDefault)
    return defaultConfig || prod.activityConfigs[0]
  }
  return null
}

// 获取默认活动的activityLink
const getDefaultActivityLink = (prod) => {
  const config = getDefaultActivityConfig(prod)
  return config?.activityLink || ''
}

// 获取推广佣金率
const getProductPromoRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.promotionInfluencerRate) return config.promotionInfluencerRate
  return prod.promotionInfluencerRate || 0
}

// 获取广场佣金率
const getProductSquareRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (config && config.squareCommissionRate !== undefined) return config.squareCommissionRate
  return prod.squareCommissionRate || 0
}

// 计算额外推广
const calcExtra = (prod) => {
  const promo = getProductPromoRate(prod)
  const square = getProductSquareRate(prod)
  const diff = (promo - square) * 100
  return diff > 0 ? diff.toFixed(1) : 0
}
</script>

<style scoped>
.warm-style-page {
  min-height: 100vh;
  background: #FFF8F0;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.warm-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.warm-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
}

.warm-orb-1 {
  width: 200px;
  height: 200px;
  background: #FFE4D0;
  top: -50px;
  right: -50px;
}

.warm-orb-2 {
  width: 150px;
  height: 150px;
  background: #FFD0B8;
  bottom: 30%;
  left: -40px;
}

.warm-orb-3 {
  width: 180px;
  height: 180px;
  background: #FFF0E0;
  bottom: -30px;
  right: 20%;
}

/* 主内容 */
.warm-content {
  position: relative;
  z-index: 1;
}

/* Header */
.warm-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.brand-tag {
  font-size: 11px;
  color: #999;
}

/* Hero */
.warm-hero {
  margin: 16px;
  padding: 24px 20px;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.hero-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(119, 89, 153, 0.1);
}

.deco-1 {
  width: 80px;
  height: 80px;
  top: -20px;
  right: -20px;
}

.deco-2 {
  width: 50px;
  height: 50px;
  top: 10px;
  right: 30px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
}

.hero-title {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 8px;
  line-height: 1.3;
}

.hero-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

/* Requirements */
.warm-requirements {
  margin: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.req-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
}

.req-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.req-card {
  background: #fafafa;
  border: 2px solid;
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  transition: transform 0.2s;
}

.req-card:hover {
  transform: translateY(-2px);
}

.req-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}

.req-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.req-value {
  font-size: 18px;
  font-weight: 800;
}

/* Products */
.warm-products {
  margin: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.products-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
}

.product-count {
  font-size: 14px;
  color: #999;
  font-weight: 500;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  background: #fafafa;
  border: 2px solid;
  border-radius: 16px;
  padding: 14px;
}

.card-main {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.product-image {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-decoration: none;
  transition: opacity 0.2s;
}

.product-name:hover {
  opacity: 0.8;
}

.product-id {
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.product-images {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.thumb-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
}

.more-badge {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.product-rates {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.rate-item {
  display: flex;
  flex-direction: column;
}

.rate-label {
  font-size: 11px;
  color: #999;
}

.rate-value {
  font-weight: 700;
  font-size: 14px;
}

.rate-square {
  color: #bbb;
  text-decoration: line-through;
}

.rate-promo {
  font-size: 16px;
}

.rate-extra {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid;
  border-radius: 20px;
}

.extra-badge {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
}

.extra-text {
  font-size: 11px;
  color: #666;
}

.product-action {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.tiktok-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tiktok-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 0;
  color: #ccc;
}

.empty-state svg {
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Footer */
.warm-footer {
  margin: 16px;
  padding: 24px 20px;
  border-radius: 20px;
  text-align: center;
}

.footer-link {
  display: inline-block;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 16px;
}

.footer-brand {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.footer-copy {
  font-size: 11px;
  color: #999;
}
</style>
