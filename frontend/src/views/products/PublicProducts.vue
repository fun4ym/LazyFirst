<template>
  <div class="eva-page">
    <!-- Background Effects -->
    <div class="bg-effects">
      <div class="orb orb-purple"></div>
      <div class="orb orb-green"></div>
      <div class="grid-overlay"></div>
      <div class="particles">
        <div v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)"></div>
      </div>
    </div>

    <!-- Floating Glass Header -->
    <header class="eva-header">
      <div class="header-left">
        <img src="/logo.png" alt="Logo" class="header-logo" />
        <span class="header-brand">LazyFirst Co., Ltd.</span>
      </div>
      <div class="header-right">
        <button class="header-icon-btn" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <button class="header-icon-btn" title="Account">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="badge-pulse">
        <div class="badge-glow"></div>
        <span class="badge-text">บริษัท TAP ในประเทศไทยที่ได้รับการรับรองจาก TikTok</span>
      </div>
      <h1 class="hero-title">รับคอมมิชชันสูงขึ้น<br/><span class="title-accent">กับ TikTok ของคุณ</span></h1>
      <p class="hero-sub">รับคอมมิชชันพิเศษผ่านลิงก์ของเรา สูงกว่าหน้าร้านถึง 25%</p>

      <!-- Search -->
      <div class="search-box">
        <input
          v-model="filters.keyword"
          type="text"
          class="search-input"
          placeholder="ค้นหาสินค้า / ร้านค้า..."
          @keyup.enter="onSearch"
        />
        <button class="search-btn" @click="onSearch">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6DAD19" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div class="stat-value">{{ stats.totalProducts }}</div>
          <div class="stat-label">สินค้า</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><span class="baht-symbol">฿</span></div>
          <div class="stat-value">{{ stats.maxCommissionRate }}%</div>
          <div class="stat-label">คอมมิชชันสูงสุด</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6DAD19" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="stat-value">฿{{ stats.maxSellingPrice }}</div>
          <div class="stat-label">ส่วนต่างสูงสุด</div>
        </div>
      </div>
    </section>

    <!-- Filters -->
    <section class="filters-section">
      <div class="filter-scroll">
        <button
          class="filter-chip"
          :class="{ active: !filters.gradeId }"
          @click="selectGrade('')"
        >All Products</button>
        <button
          v-for="g in grades"
          :key="g._id"
          class="filter-chip"
          :class="{ active: filters.gradeId === g._id }"
          @click="selectGrade(g._id)"
        >{{ g.name }}</button>
      </div>
      <div class="filter-row">
        <el-select
          v-model="filters.categoryId"
          placeholder="หมวดหมู่สินค้า"
          clearable
          size="small"
          @change="onFilterChange"
        >
          <el-option v-for="cat in categories" :key="cat._id" :label="cat.name" :value="cat._id" />
        </el-select>
        <el-select
          v-model="filters.shopId"
          placeholder="ร้านค้า"
          clearable
          size="small"
          @change="onFilterChange"
        >
          <el-option v-for="shop in shops" :key="shop._id" :label="shop.shopName" :value="shop._id" />
        </el-select>
      </div>
    </section>

    <!-- Product List -->
    <section class="product-list">
      <div v-for="prod in products" :key="prod._id" class="product-card">
        <!-- Card Border Glow -->
        <div class="card-glow-border"></div>

        <!-- Product Image -->
        <div class="card-image-wrap">
          <img
            v-if="prod.images && prod.images.length > 0"
            :src="prod.images[0]"
            class="card-image"
            loading="lazy"
          />
          <div v-else class="card-image-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
          <!-- Badge -->
          <div v-if="getCommissionDiff(prod) > 10" class="badge-hot">HOT</div>
          <div v-else-if="prod.productGrade === 'new'" class="badge-new">NEW</div>
        </div>

        <!-- Card Info -->
        <div class="card-info">
          <div v-if="prod.shopId && prod.shopId.shopName" class="card-shop">
            <span class="shop-dot"></span>{{ prod.shopId.shopName }}
          </div>
          <div class="card-name">{{ prod.name }}</div>
          <div v-if="prod.tiktokProductId" class="card-tiktok-id">ID: {{ prod.tiktokProductId }}</div>

          <!-- Commission Grid -->
          <div class="comm-grid">
            <div class="comm-cell">
              <span class="comm-label">คอมมิชชันคุณ</span>
              <span class="comm-value influencer-rate">{{ formatRate(getInfluencerRate(prod)) }}</span>
            </div>
            <div class="comm-cell">
              <span class="comm-label">เทียบหน้าร้าน</span>
              <span class="comm-value square-rate">{{ formatRate(prod.squareCommissionRate) }}</span>
            </div>
          </div>

          <!-- Commission Diff Highlight -->
          <div v-if="getCommissionDiff(prod) > 0" class="commission-highlight">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6DAD19" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <span>สูงกว่าหน้าร้าน +{{ formatRate(getCommissionDiff(prod)) }}</span>
          </div>

          <!-- CTA Button -->
          <a
            v-if="getActivityLink(prod)"
            :href="getActivityLink(prod)"
            target="_blank"
            class="cta-btn"
            @click="trackClick(prod._id)"
          >
            <span class="cta-text">เข้า TikTok ขาย</span>
            <svg class="cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            <div class="cta-shine"></div>
          </a>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && products.length === 0" class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <p>ไม่พบสินค้า</p>
      </div>
    </section>

    <!-- Load More -->
    <div v-if="products.length > 0 && products.length < total" class="load-more">
      <button class="load-more-btn" @click="loadMore" :disabled="loadingMore">
        <el-icon v-if="loadingMore" class="is-loading"><Loading /></el-icon>
        <span v-else>โหลดเพิ่มเติม</span>
      </button>
    </div>

    <!-- Footer -->
    <footer class="eva-footer">
      <div class="footer-copy">Copyright 2026 LazyFirst. All Rights Reserved.<br/>Encrypted Digital System / TAP Ecosystem Certified</div>
    </footer>

    <!-- Toast -->
    <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'

const route = useRoute()
const API_BASE = '/api/public/products'

const products = ref([])
const categories = ref([])
const grades = ref([])
const shops = ref([])
const total = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 20

const stats = ref({
  totalProducts: 256,
  maxCommissionRate: 25,
  maxCommissionDiff: 0,
  maxSellingPrice: 999
})

const filters = ref({
  keyword: '',
  gradeId: '',
  categoryId: '',
  shopId: ''
})

const toastVisible = ref(false)
const toastMessage = ref('')
const refUser = ref('')

const hasActiveFilters = computed(() => {
  return filters.value.keyword || filters.value.gradeId || filters.value.categoryId || filters.value.shopId
})

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2500)
}

function particleStyle(i) {
  const left = Math.random() * 100
  const delay = Math.random() * 6
  const duration = 4 + Math.random() * 4
  const size = 1 + Math.random() * 2
  return {
    left: left + '%',
    width: size + 'px',
    height: size + 'px',
    animationDelay: delay + 's',
    animationDuration: duration + 's'
  }
}

onMounted(async () => {
  if (route.query.ref) {
    refUser.value = route.query.ref
    localStorage.setItem('ref_user', route.query.ref)
  } else {
    const stored = localStorage.getItem('ref_user')
    if (stored) refUser.value = stored
  }
  await Promise.all([loadFilters(), loadProducts(), loadStats()])
})

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`)
    const data = await res.json()
    if (data.success) {
      stats.value = data.data
    }
  } catch (e) {
    console.error('Load stats error:', e)
  }
}

async function loadFilters() {
  try {
    const res = await fetch(`${API_BASE}/filters`)
    const data = await res.json()
    if (data.success) {
      categories.value = data.data.categories
      grades.value = data.data.grades
      shops.value = data.data.shops
    }
  } catch (e) {
    console.error('Load filters error:', e)
  }
}

async function loadProducts(append = false) {
  if (!append) loading.value = true
  else loadingMore.value = true

  try {
    const params = new URLSearchParams({
      page: page.value,
      limit: pageSize
    })
    if (filters.value.keyword) params.set('keyword', filters.value.keyword)
    if (filters.value.gradeId) params.set('gradeId', filters.value.gradeId)
    if (filters.value.categoryId) params.set('categoryId', filters.value.categoryId)
    if (filters.value.shopId) params.set('shopId', filters.value.shopId)
    if (refUser.value) params.set('ref', refUser.value)

    const res = await fetch(`${API_BASE}?${params}`)
    const data = await res.json()

    if (data.success) {
      if (append) {
        products.value = [...products.value, ...data.data.products]
      } else {
        products.value = data.data.products
      }
      total.value = data.data.pagination.total
    }
  } catch (e) {
    console.error('Load products error:', e)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onSearch() {
  page.value = 1
  loadProducts()
}

function selectGrade(id) {
  filters.value.gradeId = id
  page.value = 1
  loadProducts()
}

function onFilterChange() {
  page.value = 1
  loadProducts()
}

function clearFilters() {
  filters.value = { keyword: '', gradeId: '', categoryId: '', shopId: '' }
  page.value = 1
  loadProducts()
}

function loadMore() {
  page.value++
  loadProducts(true)
}

function getInfluencerRate(prod) {
  if (prod.activityConfigs && prod.activityConfigs.length > 0) {
    const defaultConfig = prod.activityConfigs.find(c => c.isDefault) || prod.activityConfigs[0]
    if (defaultConfig && defaultConfig.promotionInfluencerRate > 0) {
      return defaultConfig.promotionInfluencerRate
    }
  }
  return prod.commissionRate || 0
}

function getCommissionDiff(prod) {
  return getInfluencerRate(prod) - (prod.squareCommissionRate || 0)
}

function getActivityLink(prod) {
  if (prod.activityConfigs && prod.activityConfigs.length > 0) {
    const defaultConfig = prod.activityConfigs.find(c => c.isDefault) || prod.activityConfigs[0]
    return defaultConfig?.activityLink || ''
  }
  return ''
}

function formatRate(rate) {
  if (!rate && rate !== 0) return '-'
  return (rate * 100).toFixed(1) + '%'
}

async function trackClick(productId) {
  if (!refUser.value) return
  try {
    await fetch(`${API_BASE}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: refUser.value,
        action: 'click_tiktok',
        productId
      })
    })
    showToast('คัดลอกลิงก์แล้ว! แชร์บน TikTok เลย!')
  } catch (e) {
    // 追踪失败不影响体验
  }
}
</script>

<style scoped>
/* === CSS Variables === */
.eva-page {
  --eva-purple: #775999;
  --eva-purple-light: #9579B2;
  --eva-purple-dark: #5A4573;
  --eva-green: #6DAD19;
  --eva-green-light: #8BC736;
  --eva-green-dark: #528612;
  --eva-bg-deep: #050505;
  --eva-bg: #0A0A0A;
  --eva-bg-card: #111111;
  --eva-bg-elevated: #1E1E1E;
  --eva-text: #FFFFFF;
  --eva-text-secondary: #B0B0B0;
  --eva-text-muted: #666666;
  --eva-red: #FF2D55;
}

.eva-page {
  min-height: 100vh;
  background: var(--eva-bg-deep);
  color: var(--eva-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Noto Sans Thai', sans-serif;
  -webkit-font-smoothing: antialiased;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  overflow-x: hidden;
}

/* === Background Effects === */
.bg-effects {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  max-width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}
.orb-purple {
  width: 300px;
  height: 300px;
  background: var(--eva-purple);
  top: -80px;
  right: -100px;
  animation: orbFloat 8s ease-in-out infinite;
}
.orb-green {
  width: 200px;
  height: 200px;
  background: var(--eva-green);
  top: 200px;
  left: -60px;
  animation: orbFloat 8s ease-in-out infinite reverse;
  animation-delay: -4s;
}
@keyframes orbFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-40px) scale(1.1); }
}
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(119,89,153,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(119,89,153,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60%;
}
.particle {
  position: absolute;
  bottom: 0;
  background: var(--eva-purple);
  border-radius: 50%;
  opacity: 0;
  animation: particleFloat linear infinite;
}
@keyframes particleFloat {
  0% { opacity: 0; transform: translateY(0); }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-300px); }
}

/* === Header === */
.eva-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(5,5,5,0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(119,89,153,0.2);
  box-shadow: 0 0 20px rgba(119,89,153,0.1);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
.header-brand {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--eva-purple-light), var(--eva-green-light));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
}
.header-right {
  display: flex;
  gap: 8px;
}
.header-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(119,89,153,0.2);
  background: rgba(30,30,30,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.header-icon-btn:hover {
  border-color: var(--eva-purple);
  box-shadow: 0 0 12px rgba(119,89,153,0.3);
}

/* === Hero Section === */
.hero {
  position: relative;
  z-index: 1;
  padding: 32px 20px 24px;
  text-align: center;
}
.badge-pulse {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 8px 18px;
  border-radius: 50px;
  background: rgba(119,89,153,0.15);
  border: 1px solid rgba(119,89,153,0.3);
  margin-bottom: 20px;
}
.badge-glow {
  position: absolute;
  inset: -2px;
  border-radius: 50px;
  background: linear-gradient(135deg, var(--eva-purple), var(--eva-green));
  opacity: 0.3;
  filter: blur(8px);
  animation: badgePulse 2s ease-in-out infinite;
}
@keyframes badgePulse {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.05); }
}
.badge-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--eva-purple-light);
  position: relative;
  z-index: 1;
  letter-spacing: 0.3px;
}
.hero-title {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #fff 0%, var(--eva-purple-light) 50%, var(--eva-green-light) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.title-accent {
  background: linear-gradient(135deg, var(--eva-green-light), var(--eva-green));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-sub {
  font-size: 14px;
  color: var(--eva-text-secondary);
  margin: 0 0 24px;
  line-height: 1.5;
}

/* === Search === */
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}
.search-input {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(119,89,153,0.3);
  background: var(--eva-bg-card);
  color: #fff;
  padding: 0 16px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.search-input::placeholder { color: #555; }
.search-input:focus {
  border-color: var(--eva-purple);
  box-shadow: 0 0 0 3px rgba(119,89,153,0.2), 0 0 20px rgba(119,89,153,0.15);
  transform: scale(1.01);
}
.search-btn {
  width: 48px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--eva-purple), var(--eva-purple-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  flex-shrink: 0;
}
.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(119,89,153,0.4);
}
.search-btn:active { transform: scale(0.96); }

/* === Stats Cards === */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.stat-card {
  background: var(--eva-bg-card);
  border-radius: 14px;
  padding: 14px 10px;
  border: 1px solid rgba(119,89,153,0.12);
  text-align: center;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.stat-card:hover {
  border-color: rgba(119,89,153,0.3);
  box-shadow: 0 0 16px rgba(119,89,153,0.15);
}
.stat-icon {
  margin-bottom: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.baht-symbol {
  font-size: 18px;
  font-weight: 800;
  color: var(--eva-purple-light);
}
.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}
.stat-label {
  font-size: 11px;
  color: var(--eva-text-muted);
  margin-top: 4px;
}

/* === Filters === */
.filters-section {
  position: relative;
  z-index: 1;
  padding: 0 16px 12px;
}
.filter-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 0 12px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-chip {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 50px;
  border: 1px solid rgba(119,89,153,0.2);
  background: rgba(17,17,17,0.8);
  color: var(--eva-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
}
.filter-chip:hover {
  border-color: var(--eva-purple);
  color: var(--eva-text);
}
.filter-chip.active {
  background: linear-gradient(135deg, var(--eva-purple), var(--eva-green));
  border-color: transparent;
  color: white;
  box-shadow: 0 0 20px rgba(119,89,153,0.35);
}
.filter-row {
  display: flex;
  gap: 10px;
}
.filter-row :deep(.el-select) {
  flex: 1;
}
.filter-row :deep(.el-input__wrapper) {
  background: var(--eva-bg-card) !important;
  border-color: rgba(119,89,153,0.2) !important;
  box-shadow: none !important;
  border-radius: 10px;
}
.filter-row :deep(.el-input__inner) {
  color: var(--eva-text-secondary) !important;
}

/* === Product Cards === */
.product-list {
  position: relative;
  z-index: 1;
  padding: 0 16px 16px;
}
.product-card {
  position: relative;
  background: var(--eva-bg-card);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 14px;
  border: 1px solid rgba(119,89,153,0.08);
  transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.product-card:hover {
  transform: translateY(-8px);
  border-color: rgba(119,89,153,0.3);
  box-shadow: 0 12px 32px rgba(119,89,153,0.2), 0 0 0 1px rgba(119,89,153,0.1);
}
.card-glow-border {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, transparent, rgba(119,89,153,0.15), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.product-card:hover .card-glow-border {
  opacity: 1;
}

/* Image */
.card-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--eva-bg);
}
.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.product-card:hover .card-image {
  transform: scale(1.1);
}
.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--eva-bg);
}
.badge-hot {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 12px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--eva-green), var(--eva-green-dark));
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(109,173,25,0.4);
}
.badge-new {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 12px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--eva-purple), var(--eva-purple-dark));
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(119,89,153,0.4);
}

/* Card Info */
.card-info {
  padding: 14px 16px 16px;
}
.card-shop {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--eva-purple-light);
  font-weight: 500;
  margin-bottom: 6px;
}
.shop-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--eva-purple);
  flex-shrink: 0;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}
.card-tiktok-id {
  font-size: 12px;
  color: var(--eva-text-muted);
  margin-bottom: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Commission Grid */
.comm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.comm-cell {
  background: var(--eva-bg-elevated);
  border-radius: 10px;
  padding: 10px;
}
.comm-label {
  display: block;
  font-size: 11px;
  color: var(--eva-text-muted);
  margin-bottom: 4px;
}
.comm-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.influencer-rate {
  color: var(--eva-green-light);
  text-shadow: 0 0 12px rgba(109,173,25,0.3);
}
.square-rate {
  color: var(--eva-text-muted);
  text-decoration: line-through;
  font-size: 14px;
  font-weight: 600;
}

/* Commission Highlight */
.commission-highlight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(109,173,25,0.08);
  border: 1px solid rgba(109,173,25,0.2);
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--eva-green-light);
}

/* CTA Button */
.cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--eva-purple), var(--eva-purple-dark));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}
.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(119,89,153,0.45);
}
.cta-btn:active { transform: scale(0.98); }
.cta-text { position: relative; z-index: 1; }
.cta-arrow { position: relative; z-index: 1; }
.cta-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  transform: skewX(-20deg);
  transition: left 0.6s;
}
.cta-btn:hover .cta-shine {
  left: 150%;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: var(--eva-text-muted);
}
.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* === Load More === */
.load-more {
  text-align: center;
  padding: 16px;
  position: relative;
  z-index: 1;
}
.load-more-btn {
  padding: 12px 32px;
  border-radius: 50px;
  border: 1px solid rgba(119,89,153,0.3);
  background: var(--eva-bg-card);
  color: var(--eva-purple-light);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}
.load-more-btn:hover {
  background: var(--eva-purple);
  border-color: var(--eva-purple);
  color: #fff;
  box-shadow: 0 4px 16px rgba(119,89,153,0.35);
  transform: translateY(-2px);
}
.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* === Footer === */
.eva-footer {
  position: relative;
  z-index: 1;
  padding: 32px 20px;
  text-align: center;
  background: linear-gradient(180deg, transparent 0%, rgba(119,89,153,0.06) 100%);
  margin-top: 20px;
}
.footer-copy {
  font-size: 11px;
  color: var(--eva-text-muted);
  line-height: 1.8;
}

/* === Toast === */
.toast {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(109,173,25,0.9);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(109,173,25,0.4);
  animation: toastIn 0.3s ease-out;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Loading spinner color fix */
:deep(.el-loading-spinner .el-icon) {
  color: var(--eva-purple-light);
}
</style>
