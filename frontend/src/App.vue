<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useGlobalIdleTimeout } from '@/composables/useIdleTimeout'

const { start, stop } = useGlobalIdleTimeout()

onMounted(() => {
  start()
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
