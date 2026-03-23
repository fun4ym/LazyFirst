<template>
  <div class="mobile-container">
    <router-view />
    <div class="mobile-tabbar">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'influencers' }"
        @click="goTo('/mobile/influencers')"
      >
        <span class="tab-icon">👥</span>
        <span class="tab-label">达人</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'samples' }"
        @click="goTo('/mobile/samples')"
      >
        <span class="tab-icon">📦</span>
        <span class="tab-label">样品</span>
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'profile' }"
        @click="goTo('/mobile/profile')"
      >
        <span class="tab-icon">👤</span>
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
  padding-bottom: 60px;
}

.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  cursor: pointer;
}

.tab-item.active .tab-icon,
.tab-item.active .tab-label {
  color: #4a148c;
}

.tab-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 12px;
  color: #999;
}
</style>
