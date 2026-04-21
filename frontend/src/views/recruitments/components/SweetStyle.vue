<template>
  <div class="sweet-style-page">
    <!-- 背景装饰 -->
    <div class="sweet-bg">
      <div class="sweet-orb sweet-orb-1"></div>
      <div class="sweet-orb sweet-orb-2"></div>
      <div class="sweet-orb sweet-orb-3"></div>
      <!-- 星星装饰 -->
      <div class="star" v-for="i in 12" :key="i" :class="`star-${i}`">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="sweet-content">
      <!-- Header -->
      <header class="sweet-header">
        <div class="header-inner">
          <div class="header-brand">
            <img src="/logo.png" alt="Logo" class="header-logo" />
            <div class="header-text">
              <div class="brand-name">LazyFirst Co., Ltd.</div>
              <div class="brand-tag">✨ TAP การรับรองไทย</div>
            </div>
          </div>
        </div>
      </header>

      <!-- Hero 区域 -->
      <section class="sweet-hero">
        <div class="hero-badge" :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)` }">
          <span>🌸 รับสมัครจำกัดเวลา</span>
        </div>
        <div class="hero-card" :style="{ borderColor: themeColor }">
          <div class="card-ribbon" :style="{ background: themeColor }"></div>
          <h1 class="hero-title" :style="{ color: themeColor }">{{ recruitment.name }}</h1>
          <p v-if="recruitment.description" class="hero-desc">{{ recruitment.description }}</p>
        </div>
      </section>

      <!-- 达人要求 -->
      <section class="sweet-requirements">
        <div class="section-header">
          <span class="header-decoration">🎀</span>
          <span>ข้อกำหนดมีเดียร์</span>
          <span class="header-decoration">🎀</span>
        </div>
        <div class="req-cards">
          <div class="req-card" v-for="(req, index) in requirementItems" :key="index" :style="{ background: `${themeColor}08` }">
            <div class="req-icon-wrap" :style="{ background: `${themeColor}20` }">
              <component :is="req.icon" :style="{ color: themeColor }" />
            </div>
            <div class="req-info">
              <div class="req-label">{{ req.label }}</div>
              <div class="req-value" :style="{ color: themeColor }">{{ req.value }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 产品列表 -->
      <section class="sweet-products">
        <div class="section-header">
          <span class="header-decoration">🌷</span>
          <span>สินค้าคัดสรร</span>
          <span class="header-decoration">🌷</span>
        </div>

        <div v-if="recruitment.products && recruitment.products.length > 0" class="product-list">
          <div v-for="prod in recruitment.products" :key="prod._id" class="product-card" :style="{ borderColor: `${themeColor}30` }">
            <!-- 卡片顶部装饰 -->
            <div class="card-top-decoration" :style="{ background: themeColor }">
              <div class="deco-dots">
                <span v-for="i in 3" :key="i"></span>
              </div>
            </div>

            <div class="card-body">
              <!-- 产品图 -->
              <div class="product-image-wrap">
                <img v-if="prod.images && prod.images.length > 0" :src="prod.images[0]" class="product-image" />
                <div v-else class="image-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
                <!-- 图片数量标签 -->
                <div v-if="prod.images && prod.images.length > 1" class="image-count">
                  📷 {{ prod.images.length }}
                </div>
              </div>

              <!-- 产品信息 -->
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
              <div class="rate-box rate-square">
                <span class="rate-label">อัตราค่าคอมสแควร์</span>
                <span class="rate-value">{{ formatRate(getProductSquareRate(prod)) }}</span>
              </div>
              <div class="rate-box rate-promo" :style="{ background: `${themeColor}15`, borderColor: `${themeColor}40` }">
                <span class="rate-label">รายได้โปรโมชั่น</span>
                <span class="rate-value" :style="{ color: themeColor }">{{ formatRate(getProductPromoRate(prod)) }}</span>
              </div>
              <div v-if="calcExtra(prod) > 0" class="rate-badge" :style="{ background: themeColor }">
                <span>+{{ calcExtra(prod) }}%</span>
              </div>
            </div>

            <!-- 申样按钮 -->
            <div class="product-action" v-if="getDefaultActivityLink(prod)">
              <a :href="getDefaultActivityLink(prod)" target="_blank" class="apply-btn" :style="{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.3 0 .59.05.86.12V9.01a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.84a4.84 4.84 0 0 1-1.01-.15z"/>
                </svg>
                <span>สมัครตัวอย่างทันที ✨</span>
              </a>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">🌸</span>
          <p>ไม่มีสินค้าชั่วคราว</p>
        </div>
      </section>

      <!-- Footer -->
      <footer class="sweet-footer">
        <router-link to="/products/public" class="footer-link" :style="{ color: themeColor }">
          ดูสินค้าเพิ่มเติม 🌟
        </router-link>
        <div class="footer-divider"></div>
        <div class="footer-brand">LazyFirst Co., Ltd.</div>
        <div class="footer-copy">Made with 💕 · 2026</div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed, h } from 'vue'

const props = defineProps({
  recruitment: {
    type: Object,
    required: true
  },
  themeColor: {
    type: String,
    default: '#E91E63'
  }
})

// 图标组件
const IconGem = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M6 3h12l4 6-10 13L2 9z' }),
  h('path', { d: 'M2 9h20' }),
  h('path', { d: 'M12 22V9' })
])

const IconUsers = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
  h('circle', { cx: 9, cy: 7, r: 4 }),
  h('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
  h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })
])

const IconBox = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
  h('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
  h('line', { x1: 12, y1: 22.08, x2: 12, y2: 12 })
])

const IconPlay = () => h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('polygon', { points: '5 3 19 12 5 21 5 3' })
])

// 计算要求项
const requirementItems = computed(() => [
  { label: 'ข้อกำหนด GMV', value: props.recruitment.requirementGmv > 0 ? props.recruitment.requirementGmv.toLocaleString() : '-', icon: IconGem },
  { label: 'จำนวนผู้ติดตาม', value: props.recruitment.requirementFollowers > 0 ? props.recruitment.requirementFollowers + 'K' : '-', icon: IconUsers },
  { label: 'ยอดขายรายเดือน', value: props.recruitment.requirementMonthlySales > 0 ? props.recruitment.requirementMonthlySales.toLocaleString() : '-', icon: IconBox },
  { label: 'ยอดเข้าชมเฉลี่ย', value: props.recruitment.requirementAvgViews > 0 ? props.recruitment.requirementAvgViews.toLocaleString() : '-', icon: IconPlay }
])

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
.sweet-style-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF0F5 0%, #F5F0FF 50%, #F0FFF0 100%);
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.sweet-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.sweet-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.3;
}

.sweet-orb-1 {
  width: 180px;
  height: 180px;
  background: #FFD0E8;
  top: -40px;
  right: -40px;
}

.sweet-orb-2 {
  width: 140px;
  height: 140px;
  background: #E8D0FF;
  bottom: 20%;
  left: -30px;
}

.sweet-orb-3 {
  width: 160px;
  height: 160px;
  background: #D0FFE8;
  bottom: -20px;
  right: 10%;
}

/* 星星装饰 */
.star {
  position: absolute;
  color: #FFD700;
  opacity: 0.6;
  animation: twinkle 2s ease-in-out infinite;
}

.star-1 { top: 10%; left: 15%; animation-delay: 0s; }
.star-2 { top: 15%; right: 20%; animation-delay: 0.3s; }
.star-3 { top: 25%; left: 8%; animation-delay: 0.6s; }
.star-4 { top: 35%; right: 12%; animation-delay: 0.9s; }
.star-5 { top: 45%; left: 20%; animation-delay: 1.2s; }
.star-6 { top: 55%; right: 18%; animation-delay: 1.5s; }
.star-7 { top: 65%; left: 10%; animation-delay: 0.2s; }
.star-8 { top: 75%; right: 25%; animation-delay: 0.5s; }
.star-9 { top: 85%; left: 15%; animation-delay: 0.8s; }
.star-10 { top: 20%; left: 50%; animation-delay: 1.1s; }
.star-11 { top: 40%; right: 5%; animation-delay: 1.4s; }
.star-12 { top: 60%; left: 5%; animation-delay: 1.7s; }

@keyframes twinkle {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

/* 主内容 */
.sweet-content {
  position: relative;
  z-index: 1;
}

/* Header */
.sweet-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.85);
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
.sweet-hero {
  margin: 16px;
  padding: 20px;
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

.hero-card {
  background: #fff;
  border: 3px solid;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 60px;
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}

.hero-title {
  font-size: 22px;
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
.sweet-requirements {
  margin: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
}

.header-decoration {
  font-size: 14px;
}

.req-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.req-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
}

.req-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.req-info {
  flex: 1;
  min-width: 0;
}

.req-label {
  font-size: 11px;
  color: #666;
}

.req-value {
  font-size: 16px;
  font-weight: 800;
}

/* Products */
.sweet-products {
  margin: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-card {
  background: #fafafa;
  border: 2px solid;
  border-radius: 20px;
  overflow: hidden;
}

.card-top-decoration {
  height: 6px;
}

.deco-dots {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
}

.deco-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}

.card-body {
  display: flex;
  gap: 12px;
  padding: 14px;
}

.product-image-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-count {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
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
  gap: 8px;
  padding: 0 14px 14px;
  flex-wrap: wrap;
}

.rate-box {
  padding: 8px 12px;
  border-radius: 12px;
  background: #f5f5f5;
  text-align: center;
}

.rate-square {
  background: #f0f0f0;
}

.rate-label {
  display: block;
  font-size: 10px;
  color: #999;
  margin-bottom: 2px;
}

.rate-value {
  font-weight: 700;
  font-size: 14px;
  color: #bbb;
  text-decoration: line-through;
}

.rate-promo .rate-value {
  text-decoration: none;
  font-size: 16px;
}

.rate-badge {
  padding: 4px 10px;
  border-radius: 20px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
}

.product-action {
  padding: 0 14px 14px;
}

.apply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border-radius: 16px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.apply-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px 0;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #999;
}

/* Footer */
.sweet-footer {
  margin: 16px;
  padding: 24px 20px;
  text-align: center;
}

.footer-link {
  display: inline-block;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  margin-bottom: 16px;
}

.footer-divider {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ddd, transparent);
  margin: 0 auto 16px;
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
