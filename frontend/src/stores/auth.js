import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token && state.token.length > 0,
    isAdmin: (state) => state.user?.role === 'admin',
    realName: (state) => state.user?.realName || ''
  },

  actions: {
    // 设置token和用户信息
    setToken(newToken) {
      this.token = newToken
      localStorage.setItem('token', newToken)
    },

    // 设置用户信息
    setUser(newUser) {
      this.user = newUser
      localStorage.setItem('user', JSON.stringify(newUser))
    },

    // 登录
    async login({ username, password }) {
      const res = await request.post('/auth/login', { username, password })
      this.setToken(res.token)
      this.setUser(res.user)
      return res
    },

    // 登出
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    // 获取用户信息
    async getUserInfo() {
      const res = await request.get('/auth/me')
      this.setUser(res.user)
      return res.user
    }
  }
})
