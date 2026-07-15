/**
 * 无操作超时检测 Hook
 * 超过指定时间（默认30分钟）无操作自动退出登录
 */
import { onMounted, onUnmounted, ref } from 'vue'
import AuthManager from '@/utils/auth'

const IDLE_TIMEOUT = 120 * 60 * 1000 // 2小时（毫秒）
const CHECK_INTERVAL = 30000 // 每30秒检查一次

export function useIdleTimeout(timeout = IDLE_TIMEOUT) {
  const lastActivity = ref(Date.now())
  let checkTimer = null
  let _started = false

  // 更新活动时间
  const updateActivity = () => {
    lastActivity.value = Date.now()
  }

  // 检查是否超时
  const checkTimeout = () => {
    const elapsed = Date.now() - lastActivity.value
    if (elapsed >= timeout) {
      console.log('[IdleTimeout] 检测到无操作超时，自动退出登录')
      cleanup()
      AuthManager.logout()
    }
  }

  // 清理事件监听
  const cleanup = () => {
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
    document.removeEventListener('mousemove', updateActivity)
    document.removeEventListener('click', updateActivity)
    document.removeEventListener('keypress', updateActivity)
    document.removeEventListener('scroll', updateActivity)
    document.removeEventListener('touchstart', updateActivity)
    _started = false
  }

  // 启动检测（幂等：重复调用不会重复注册）
  const start = () => {
    if (_started) return
    // 只有已登录才启动检测
    if (!AuthManager.isLoggedIn()) return

    _started = true
    updateActivity()

    // 添加事件监听
    document.addEventListener('mousemove', updateActivity, { passive: true })
    document.addEventListener('click', updateActivity, { passive: true })
    document.addEventListener('keypress', updateActivity, { passive: true })
    document.addEventListener('scroll', updateActivity, { passive: true })
    document.addEventListener('touchstart', updateActivity, { passive: true })

    // 启动定时检测
    checkTimer = setInterval(checkTimeout, CHECK_INTERVAL)
    console.log(`[IdleTimeout] 已启动，${timeout / 1000 / 60}分钟无操作将自动退出`)
  }

  // 停止检测
  const stop = () => {
    cleanup()
    console.log('[IdleTimeout] 已停止')
  }

  return {
    start,
    stop,
    updateActivity
  }
}

// 创建全局单例（方便在App.vue中使用）
let globalIdleHook = null

export function useGlobalIdleTimeout() {
  if (!globalIdleHook) {
    globalIdleHook = useIdleTimeout()
  }
  return globalIdleHook
}
