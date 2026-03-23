<template>
  <div class="page-container">
    <div class="page-header">
      <h1>个人中心</h1>
    </div>

    <!-- 用户信息 -->
    <div class="user-card">
      <div class="user-avatar">
        {{ userInfo.name?.charAt(0) || 'U' }}
      </div>
      <div class="user-info">
        <div class="user-name">{{ userInfo.name || userInfo.username }}</div>
        <div class="user-role">{{ userInfo.role?.name || '员工' }}</div>
      </div>
    </div>

    <!-- 菜单 -->
    <div class="menu-list">
      <div class="menu-item" @click="goTo('/mobile/influencers')">
        <span class="menu-icon">👥</span>
        <span class="menu-text">我的达人</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="goTo('/mobile/samples')">
        <span class="menu-icon">📦</span>
        <span class="menu-text">样品申请</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="logout">
        <span class="menu-icon">🚪</span>
        <span class="menu-text">退出登录</span>
        <span class="menu-arrow">›</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import AuthManager from '@/utils/auth'

const router = useRouter()
const userInfo = ref({})

const goTo = (path) => {
  router.push(path)
}

const logout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning'
    })
    AuthManager.logout()
    router.push('/login')
  } catch (e) {
    // 用户取消
  }
}

onMounted(() => {
  const user = AuthManager.getUser()
  if (user) {
    userInfo.value = user
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: #4a148c;
  color: #fff;
  padding: 16px;
  text-align: center;
}

.page-header h1 {
  margin: 0;
  font-size: 18px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 24px 16px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.user-role {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

.menu-list {
  background: #fff;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.menu-item:active {
  background: #f9f9f9;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: #333;
}

.menu-arrow {
  font-size: 20px;
  color: #ccc;
}
</style>
