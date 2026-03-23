<template>
  <div class="mobile-container">
    <router-view />
    <!-- 底部导航 -->
    <div class="mobile-tabbar">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'influencers' }"
        @click="goTo('/mobile/influencers')"
      >
        <div class="tab-icon-wrap">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <span class="tab-label">达人</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'samples' }"
        @click="goTo('/mobile/samples')"
      >
        <div class="tab-icon-wrap">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <span class="tab-label">样品</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'profile' }"
        @click="goTo('/mobile/profile')"
      >
        <div class="tab-icon-wrap">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <span class="tab-label">我的</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const activeTab = ref('influencers')

const goTo = (path) => {
  router.push(path)
}

watch(() => route.path, (path) => {
  if (path.includes('influencers')) activeTab.value = 'influencers'
  else if (path.includes('samples')) activeTab.value = 'samples'
  else if (path.includes('profile')) activeTab.value = 'profile'
}, { immediate: true })
</script>

<style scoped>
.mobile-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.06);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-icon-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.tab-icon {
  width: 24px;
  height: 24px;
  color: #999;
  transition: all 0.2s;
}

.tab-item.active .tab-icon-wrap {
  transform: scale(1.1);
}

.tab-item.active .tab-icon {
  color: #667eea;
}

.tab-item.active .tab-label {
  color: #667eea;
  font-weight: 600;
}

.tab-label {
  font-size: 12px;
  color: #999;
  transition: all 0.2s;
}
</style>
