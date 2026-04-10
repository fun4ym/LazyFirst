import axios from 'axios'
import { ElMessage } from 'element-plus'
import AuthManager from '@/utils/auth'

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = AuthManager.getToken()
    const queryString = config.params ? '?' + new URLSearchParams(config.params).toString() : ''
    console.log('[Request] 发送请求:', config.method?.toUpperCase(), config.url + queryString)
    console.log('[Request] Token长度:', token?.length || 0, token ? '有值' : '无')
    console.log('[Request] Params:', config.params)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
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
      console.error('[Request] 401错误:', status, data?.message)

      // 401 未授权
      if (status === 401) {
        ElMessage.error(data?.message || '登录已过期，请重新登录')
        AuthManager.logout()
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
