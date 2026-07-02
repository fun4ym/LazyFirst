// 简单的认证管理器 - 使用 localStorage 存储
import router from '@/router'

const AuthManager = {
  // 获取 token
  getToken() {
    // 先检查URL参数，如果有则保存到localStorage（恢复token）
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')

    if (urlToken) {
      console.log('[AuthManager] URL中发现token，保存到localStorage')
      localStorage.setItem('token', urlToken)
      // 清除URL中的token参数（避免泄露）
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', url.toString())
      return urlToken
    }

    // 从 localStorage 获取
    const token = localStorage.getItem('token') || ''
    console.log('[AuthManager] getToken 从localStorage:', token ? '有值' : '空')
    return token
  },

  // 获取用户信息
  getUser() {
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      console.log('[AuthManager] getUser:', user ? '有值' : '空')
      return user
    } catch (e) {
      console.error('[AuthManager] getUser 解析失败:', e)
      return null
    }
  },

  // 获取用户权限列表
  getPermissions() {
    const user = this.getUser()
    if (!user) return []
    // 用户权限可能在 role.permissions 中
    const role = user.role
    if (!role) return []
    // 如果是超级管理员（role.name === '超级管理员' 或 'admin' 或权限包含 *）
    if (role.name === '超级管理员' || role.name === 'admin' || role.permissions?.includes('*')) {
      return ['*']
    }
    return role.permissions || []
  },

  // 检查用户是否有指定权限
  hasPermission(permission) {
    const permissions = this.getPermissions()
    // 超级管理员拥有所有权限
    if (permissions.includes('*')) return true
    return permissions.includes(permission)
  },

  // 检查用户是否有指定权限（支持多个权限，只要有一个即可）
  hasAnyPermission(permissions) {
    const userPermissions = this.getPermissions()
    if (userPermissions.includes('*')) return true
    return permissions.some(p => userPermissions.includes(p))
  },

  // 获取用户对指定模块的数据权限
  // 返回值: 'self' | 'dept' | 'all'
  getUserDataScope(module) {
    const user = this.getUser()
    if (!user) return 'all'
    // 超级管理员拥有全部权限
    const role = user.role
    if (!role) return 'all'
    if (role.name === '超级管理员' || role.name === 'admin' || role.permissions?.includes('*')) {
      return 'all'
    }
    // 从 moduleDataScopes 获取指定模块的数据权限
    const moduleDataScopes = role.moduleDataScopes || {}
    return moduleDataScopes[module] || role.dataScope || 'self'
  },

  // 检查是否已登录
  isLoggedIn() {
    const token = this.getToken()
    const logged = !!token && token.length > 0
    console.log('[AuthManager] isLoggedIn:', logged, 'token length:', token?.length || 0, 'token prefix:', token ? token.substring(0, 10) + '...' : 'none')
    return logged
  },

  // 设置 token
  setToken(token) {
    console.log('[AuthManager] setToken 保存:', token.substring(0, 30) + '...')
    localStorage.setItem('token', token)
    // 验证保存
    const saved = localStorage.getItem('token')
    console.log('[AuthManager] setToken 验证:', saved ? '成功' : '失败')
  },

  // 设置用户信息
  setUser(user) {
    console.log('[AuthManager] setUser 保存:', user?.username)
    localStorage.setItem('user', JSON.stringify(user))
    // 验证保存
    const saved = localStorage.getItem('user')
    console.log('[AuthManager] setUser 验证:', saved ? '成功' : '失败')
  },

  // 解析JWT token的过期时间
  getTokenExpiry() {
    const token = this.getToken()
    if (!token) return null
    
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const { exp } = JSON.parse(jsonPayload)
      return exp * 1000 // 转换为毫秒
    } catch (e) {
      console.error('[AuthManager] 解析token过期时间失败:', e)
      return null
    }
  },

  // 检查token是否即将过期（剩余时间小于指定天数）
  isTokenExpiringSoon(days = 1) {
    const expiry = this.getTokenExpiry()
    if (!expiry) return false
    
    const now = Date.now()
    const timeLeft = expiry - now
    const oneDay = days * 24 * 60 * 60 * 1000
    
    return timeLeft < oneDay
  },

  // 获取token剩余有效时间（毫秒）
  getTokenTimeLeft() {
    const expiry = this.getTokenExpiry()
    if (!expiry) return 0
    
    const now = Date.now()
    return Math.max(0, expiry - now)
  },

  // 登录
  async login(username, password) {
    console.log('[AuthManager] ========== 开始登录 ==========')
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })

    console.log('[AuthManager] 响应状态:', response.status, response.statusText)

    // 检查响应是否为空
    const text = await response.text()
    console.log('[AuthManager] 响应内容:', text)

    if (!text.trim()) {
      throw new Error('服务器未返回数据')
    }

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('[AuthManager] JSON解析失败:', e)
      throw new Error('响应格式错误')
    }

    console.log('[AuthManager] 登录结果:', data)

    if (data.success) {
      this.setToken(data.data.token)
      this.setUser(data.data.user)
      console.log('[AuthManager] 登录后检查 isLoggedIn:', this.isLoggedIn())
      return { success: true, ...data.data }
    } else {
      throw new Error(data.message || '登录失败')
    }
  },

  // 登出
  logout() {
    console.log('[AuthManager] 登出，清除 localStorage')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }
}

export default AuthManager
