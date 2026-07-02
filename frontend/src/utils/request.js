import axios from 'axios'
import { ElMessage } from 'element-plus'
import AuthManager from '@/utils/auth'

// 公开页面列表（无需登录）
const publicPages = ['/login', '/terms', '/privacy', '/samples/public', '/recruitments/public', '/products/public']

// 检查当前路由是否为公开页面
const isPublicPage = () => {
  return publicPages.some(page => window.location.pathname.startsWith(page))
}

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 公开页面不添加 Authorization 头
    if (!isPublicPage()) {
      const token = AuthManager.getToken()
      const queryString = config.params ? '?' + new URLSearchParams(config.params).toString() : ''
      console.log('[Request] 发送请求:', config.method?.toUpperCase(), config.url + queryString)
      console.log('[Request] Token长度:', token?.length || 0, token ? '有值' : '无')
      console.log('[Request] Params:', config.params)
      
      // Token为空：直接触发登出并跳转，不抛错误（用户无感知）
      if (!token) {
        console.warn('[Request] Token为空，触发登出:', config.url)
        // 延迟触发登出，避免在拦截器里直接跳转导致递归
        if (!window.__isLoggingOut) {
          window.__isLoggingOut = true
          // 不显示错误消息，直接静默跳转
          setTimeout(() => {
            AuthManager.logout()
            setTimeout(() => { window.__isLoggingOut = false }, 2000)
          }, 0)
        }
        // 返回一个永不 resolve 的 Promise，阻止请求发出
        return new Promise(() => {})
      }
      
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.log('[Request] 公开页面请求，不添加token:', config.method?.toUpperCase(), config.url)
    }
    
    // 防止GET请求被浏览器缓存
    if (config.method?.toLowerCase() === 'get') {
      config.params = config.params || {}
      config.params._t = Date.now()
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

request.interceptors.response.use(
  response => {
    const res = response.data
    
    // 成功响应
    if (res.success) {
      // 如果 res.data 是数组（列表接口），直接返回 data
      if (Array.isArray(res.data)) {
        return res.data
      }
      // 如果 res.data 是对象且有 pagination（分页接口）
      if (res.data && res.data.pagination !== undefined) {
        // 优先使用 res.data.data（基础数据格式）
        if (Array.isArray(res.data.data)) {
          return {
            data: res.data.data,
            pagination: res.data.pagination
          }
        }
        // 否则使用 res.data.products（商品格式）
        if (Array.isArray(res.data.products)) {
          return {
            data: res.data.products,
            pagination: res.data.pagination
          }
        }
      }
      // 否则返回 data 内容
      return res.data || res
    } else {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  error => {
    console.error('[Request] 错误详情:', error)
    if (error.response) {
      const { status, data } = error.response
      console.error('[Request] 错误:', status, data?.message)

      // 公开页面：只显示错误消息，不自动登出
      if (isPublicPage()) {
        ElMessage.error(data?.message || error.message || '请求失败')
        return Promise.reject(error)
      }

      // 401 未授权（仅非公开页面）
      if (status === 401) {
        const originalRequest = error.config
        
        // 如果是刷新token的请求本身返回401，直接登出
        if (originalRequest.url.includes('/auth/refresh')) {
          AuthManager.logout()
          return Promise.reject(error)
        }
        
        // 避免重复弹窗和重复登出：检查是否已经在登出流程中
        if (!window.__isLoggingOut) {
          window.__isLoggingOut = true
          ElMessage.error(data?.message || '登录已过期，请重新登录')
          // 立即登出，不再延迟
          AuthManager.logout()
          // 延迟重置标志，避免短时间内重复触发
          setTimeout(() => {
            window.__isLoggingOut = false
          }, 2000)
        }
      }
      // 403 禁止访问
      else if (status === 403) {
        ElMessage.error('没有权限访问')
      }
      // 404 未找到
      else if (status === 404) {
        ElMessage.error(data?.message || '请求的资源不存在')
      }
      // 500 服务器错误
      else if (status === 500) {
        ElMessage.error('服务器错误，请稍后重试')
      }
      else {
        ElMessage.error(data?.message || error.message || '请求失败')
      }
    } else if (error.message) {
      ElMessage.error(error.message)
    }

    return Promise.reject(error)
  }
)

export { request }
export default request
