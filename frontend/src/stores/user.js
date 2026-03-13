import { defineStore } from 'pinia'
import AuthManager from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: AuthManager.getUser(),
    token: AuthManager.getToken()
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.user?.username || '',
    realName: (state) => state.user?.realName || '',
    role: (state) => state.user?.role?.name || '',
    companyId: (state) => state.user?.company?._id || state.user?.companyId || '',
    userId: (state) => state.user?.id || ''
  },

  actions: {
    setUser(user) {
      this.user = user
      AuthManager.setUser(user)
    },

    setToken(token) {
      this.token = token
      AuthManager.setToken(token)
    },

    logout() {
      this.user = null
      this.token = null
      AuthManager.logout()
    }
  }
})
