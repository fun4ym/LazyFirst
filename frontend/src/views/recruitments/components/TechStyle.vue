<template>
  <div class="tech-style-page">
    <!-- 背景效果 -->
    <div class="tech-bg">
      <div class="orb orb-purple" :style="{ background: themeColor }"></div>
      <div class="orb orb-green"></div>
      <div class="grid-overlay"></div>
      <div class="particles">
        <div v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)"></div>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="tech-content">
      <!-- Header -->
      <header class="tech-header">
        <div class="header-left">
          <img src="/logo.png" alt="Logo" class="header-logo" />
          <span class="header-brand">LazyFirst Co., Ltd.</span>
        </div>
        <div class="header-badge" :style="{ borderColor: themeColor }">
          <span :style="{ color: themeColor }">TAP การรับรอง</span>
        </div>
      </header>

      <!-- Hero -->
      <section class="tech-hero">
        <div class="hero-glow" :style="{ background: `radial-gradient(circle, ${themeColor}40 0%, transparent 70%)` }"></div>
        <div class="hero-badge" :style="{ borderColor: `${themeColor}50`, background: `${themeColor}15` }">
          <span class="badge-dot" :style="{ background: themeColor }"></span>
          <span :style="{ color: themeColor }">รับสมัครจำกัดเวลา</span>
        </div>
        <h1 class="hero-title" :style="{ color: themeColor }">{{ recruitment.name }}</h1>
        <p v-if="recruitment.description" class="hero-desc">{{ recruitment.description }}</p>
      </section>

      <!-- 要求卡片 -->
      <section class="tech-requirements">
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
          <div class="req-card" :style="cardGlowStyle">
            <div class="req-icon" :style="{ background: `${themeColor}20` }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="req-label">GMV</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementGmv > 0 ? recruitment.requirementGmv.toLocaleString() : '-' }}
            </div>
          </div>
          <div class="req-card" :style="cardGlowStyle">
            <div class="req-icon" :style="{ background: `${themeColor}20` }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div class="req-label">จำนวนผู้ติดตาม</div>
            <div class="req-value" :style="{ color: themeColor }">
              {{ recruitment.requirementFollowers > 0 ? recruitment.requirementFollowers + 'K' : '-' }}
            </div>
          </div>
          <div class="req-card" :style="cardGlowStyle">
            <div class="req-icon" :style="{ background: `${themeColor}20` }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
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
          <div class="req-card" :style="cardGlowStyle">
            <div class="req-icon" :style="{ background: `${themeColor}20` }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
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
      <section class="tech-products">
        <div class="products-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="themeColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span>สินค้าที่รวม</span>
          <span class="product-count" v-if="recruitment.products?.length">({{ recruitment.products.length }})</span>
        </div>

        <div v-if="recruitment.products && recruitment.products.length > 0" class="product-list">
          <div v-for="prod in recruitment.products" :key="prod._id" class="product-card" :style="cardGlowStyle">
            <div class="card-glow-border" :style="{ borderColor: `${themeColor}40` }"></div>
            <div class="card-main">
              <div class="product-image" :style="{ background: `${themeColor}15` }">
                <img v-if="prod.images && prod.images.length > 0" :src="prod.images[0]" />
                <div v-else class="img-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
                <div v-if="prod.images && prod.images.length > 1" class="img-badge">{{ prod.images.length }}</div>
              </div>
              <div class="product-info">
                <a v-if="getDefaultActivityLink(prod)" :href="getDefaultActivityLink(prod)" target="_blank" class="product-name" :style="{ color: themeColor }">
                  {{ prod.name }}
                </a>
                <div v-else class="product-name">{{ prod.name }}</div>
                <div class="product-id" :style="{ color: themeColor }">{{ prod.tiktokProductId || prod.sku || '-' }}</div>
              </div>
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
              <div v-if="calcExtra(prod) > 0" class="rate-extra" :style="{ borderColor: `${themeColor}40`, background: `${themeColor}10` }">
                <span class="extra-badge" :style="{ background: themeColor }">+{{ calcExtra(prod) }}%</span>
                <span class="extra-text">โปรโมชั่นเพิ่ม</span>
              </div>
            </div>

            <!-- 申样按钮 -->
            <div class="product-action" v-if="getDefaultActivityLink(prod)">
              <a :href="getDefaultActivityLink(prod)" target="_blank" class="tiktok-btn" :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`, boxShadow: `0 4px 20px ${themeColor}40` }">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.3 0 .59.05.86.12V9.01a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.84a4.84 4.84 0 0 1-1.01-.15z"/>
                </svg>
                <span>สมัครตัวอย่างทันที</span>
              </a>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <p>ไม่มีสินค้าชั่วคราว</p>
        </div>
      </section>

      <!-- Footer -->
      <footer class="tech-footer">
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
import { defineProps, computed } from 'vue'

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

// 卡片发光样式
const cardGlowStyle = computed(() => ({
  background: 'rgba(13, 13, 26, 0.8)',
  border: '1px solid rgba(119, 89, 153, 0.2)',
  boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
}))

// 粒子样式
const particleStyle = (i) => {
  const colors = ['#775999', '#6DAD19', '#E91E63', '#2196F3']
  const color = colors[i % colors.length]
  const left = Math.random() * 100
  const delay = Math.random() * 5
  const duration = 5 + Math.random() * 5
  return {
    left: `${left}%`,
    background: color,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${2 + Math.random() * 4}px`,
    height: `${2 + Math.random() * 4}px`
  }
}

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
.tech-style-page {
  min-height: 100vh;
  background: #0D0D1A;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* 背景效果 */
.tech-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.orb-purple {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.orb-green {
  width: 200px;
  height: 200px;
  bottom: 20%;
  left: -80px;
  background: #6DAD19;
  opacity: 0.3;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(119, 89, 153, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(119, 89, 153, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
}

.particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.particle {
  position: absolute;
  border-radius: 50%;
  animation: float-particle linear infinite;
  opacity: 0.6;
}

@keyframes float-particle {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100px) rotate(720deg);
    opacity: 0;
  }
}

/* 主内容 */
.tech-content {
  position: relative;
  z-index: 1;
  padding-bottom: 40px;
}

/* Header */
.tech-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(13, 13, 26, 0.8);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.header-brand {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.header-badge {
  padding: 4px 12px;
  border: 1px solid;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

/* Hero */
.tech-hero {
  margin: 20px 16px;
  padding: 24px 20px;
  position: relative;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(40px);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid;
  border-radius: 20px;
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 600;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

.hero-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 10px;
  line-height: 1.2;
  text-shadow: 0 0 30px currentColor;
}

.hero-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
}

/* Requirements */
.tech-requirements {
  margin: 16px;
  padding: 20px;
  background: rgba(13, 13, 26, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(119, 89, 153, 0.2);
}

.req-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.req-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.req-card {
  padding: 14px;
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.req-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.req-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.req-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.req-value {
  font-size: 18px;
  font-weight: 800;
}

/* Products */
.tech-products {
  margin: 16px;
  padding: 20px;
  background: rgba(13, 13, 26, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(119, 89, 153, 0.2);
}

.products-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.product-count {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  position: relative;
  border-radius: 16px;
  padding: 14px;
}

.card-glow-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid;
  border-radius: 16px;
  pointer-events: none;
}

.card-main {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.product-image {
  position: relative;
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

.img-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
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
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.product-rates {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.rate-item {
  display: flex;
  flex-direction: column;
}

.rate-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.rate-value {
  font-weight: 700;
  font-size: 14px;
}

.rate-square {
  color: rgba(255, 255, 255, 0.3);
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
  margin-left: auto;
}

.extra-badge {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
}

.extra-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.product-action {
  display: flex;
  justify-content: flex-end;
}

.tiktok-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tiktok-btn:hover {
  transform: translateY(-2px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 0;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state svg {
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Footer */
.tech-footer {
  margin: 20px 16px 0;
  padding: 24px 20px;
  text-align: center;
  background: rgba(13, 13, 26, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(119, 89, 153, 0.1);
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
  color: #fff;
  margin-bottom: 4px;
}

.footer-copy {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
