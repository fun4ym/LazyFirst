<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGlobalIdleTimeout } from '@/composables/useIdleTimeout'

const route = useRoute()
const { start, stop } = useGlobalIdleTimeout()

// 公开页面列表（无需登录）
const publicPages = ['/login', '/terms', '/privacy', '/samples/public', '/recruitments/public', '/products/public']

// 检查当前路由是否为公开页面
const isPublicPage = (path) => {
  return publicPages.some(page => path.startsWith(page))
}

// 根据页面类型控制空闲超时检测
watch(() => route.path, (newPath) => {
  if (isPublicPage(newPath)) {
    stop()
  } else {
    start()
  }
}, { immediate: true })

onMounted(() => {
  // 初始化时根据当前路由决定是否启动
  if (!isPublicPage(route.path)) {
    start()
  }
})

onUnmounted(() => {
  stop()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
