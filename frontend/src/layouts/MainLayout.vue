<template>
  <el-container class="main-layout">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <img src="/logo.png" alt="TAP Logo" class="logo-image" />
      </div>

      <el-menu
        :default-active="activeMenu"
        :default-openeds="['business', 'data-collection', 'reports', 'settings']"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>数据概览</span>
        </el-menu-item>

        <el-sub-menu index="business">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>业务数据</span>
          </template>
          <el-menu-item index="/influencer-managements">
            <span>建联达人</span>
          </el-menu-item>
          <el-menu-item index="/products">
            <span>合作产品</span>
          </el-menu-item>
          <el-menu-item index="/activities">
            <span>TikTok活动</span>
          </el-menu-item>
          <el-menu-item index="/supply-chain">
            <span>供应链</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="data-collection">
          <template #title>
            <el-icon><DocumentCopy /></el-icon>
            <span>数据采集</span>
          </template>
          <el-menu-item index="/samples">
            <span>样品申请</span>
          </el-menu-item>
          <el-menu-item index="/orders">
            <span>TikTok订单</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="reports">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>报表管理</span>
          </template>
          <el-menu-item index="/bd-daily">
            <span>BD每日统计</span>
          </el-menu-item>
          <el-menu-item index="/performance">
            <span>业绩报表</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="settings">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/settings/users">
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/settings/roles">
            <span>角色管理</span>
          </el-menu-item>
          <el-menu-item index="/settings/departments">
            <span>部门管理</span>
          </el-menu-item>
          <el-menu-item index="/settings/commission-rules">
            <span>抽点设置</span>
          </el-menu-item>
          <el-menu-item index="/settings/base-data">
            <span>基础数据</span>
          </el-menu-item>
          <el-menu-item index="/settings/system-models">
            <span>系统模型</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h3>{{ currentTitle }}</h3>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-icon><UserFilled /></el-icon>
              <span>{{ realName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>

      <!-- 修改密码对话框 -->
      <el-dialog v-model="showPasswordDialog" title="修改密码" width="400px">
        <el-form :model="passwordForm" label-width="80px">
          <el-form-item label="旧密码">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="passwordForm.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showPasswordDialog = false">取消</el-button>
          <el-button type="primary" @click="handlePasswordChange">确定</el-button>
        </template>
      </el-dialog>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import AuthManager from '@/utils/auth'
import {
  DataBoard,
  User,
  Box,
  Document,
  DocumentCopy,
  Calendar,
  UserFilled,
  ArrowDown,
  SwitchButton,
  Setting,
  Lock
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || 'TAP系统')
const realName = computed(() => AuthManager.getUser()?.realName || '')

const showPasswordDialog = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleCommand = (command) => {
  if (command === 'logout') {
    AuthManager.logout()
  } else if (command === 'changePassword') {
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    showPasswordDialog.value = true
  }
}

const handlePasswordChange = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  try {
    const response = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AuthManager.getToken()}`
      },
      body: JSON.stringify({
        oldPassword: passwordForm.value.oldPassword,
        newPassword: passwordForm.value.newPassword
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('密码修改成功')
      showPasswordDialog.value = false
    } else {
      ElMessage.error(result.message || '密码修改失败')
    }
  } catch (error) {
    ElMessage.error('密码修改失败')
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background: linear-gradient(180deg, #4a148c 0%, #6a1b9a 50%, #7b1fa2 100%);
  color: rgba(255, 255, 255, 0.85);
  box-shadow: 2px 0 8px rgba(74, 20, 140, 0.2);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(74, 20, 140, 0.3);
  padding: 8px 0;
}

.logo-image {
  width: 128px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.sidebar-menu {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 0;
}

.sidebar-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 4px 12px;
  border-radius: 6px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  color: white;
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%) !important;
  color: white !important;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(123, 31, 162, 0.4);
}

.sidebar-menu :deep(.el-sub-menu__title) {
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 4px 12px;
  border-radius: 6px;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  color: white;
  background: rgba(255, 255, 255, 0.12);
}

/* 内联子菜单样式 */
.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background: rgba(74, 20, 140, 0.4) !important;
  padding: 4px 0;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  color: rgba(255, 255, 255, 0.9) !important;
  background: transparent !important;
  padding-left: 50px !important;
  transition: all 0.3s ease;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%) !important;
  color: white !important;
  font-weight: 600;
}

/* 子菜单弹出样式（侧边栏折叠时） */
.sidebar-menu :deep(.el-menu--popup) {
  background: #4a148c !important;
  border: 1px solid rgba(123, 31, 162, 0.4);
  box-shadow: 0 8px 24px rgba(74, 20, 140, 0.5);
  border-radius: 8px;
  min-width: 160px;
}

.sidebar-menu :deep(.el-menu--popup) .el-menu-item {
  color: rgba(255, 255, 255, 0.9) !important;
  background: transparent !important;
  margin: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.sidebar-menu :deep(.el-menu--popup) .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
  transform: translateX(4px);
}

.sidebar-menu :deep(.el-menu--popup) .el-menu-item.is-active {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%) !important;
  color: white !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(123, 31, 162, 0.4);
}

.header {
  background: white;
  border-bottom: 1px solid #e8e4ef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  box-shadow: 0 2px 8px rgba(74, 20, 140, 0.1);
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  color: #4a148c;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0 16px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #595959;
  font-size: 14px;
  height: 40px;
}

.user-info:hover {
  background: rgba(123, 31, 162, 0.08);
  color: #7b1fa2;
}

.user-info span {
  margin: 0 6px;
  color: inherit;
  font-weight: 500;
}

.main-content {
  background: #faf5ff;
  padding: 20px;
  min-height: calc(100vh - 64px);
}

/* 强制覆盖子菜单所有可能的类名 */
.sidebar :deep(.el-sub-menu .el-menu) {
  background: #3d0e75 !important;
  border: none !important;
}

.sidebar :deep(.el-sub-menu .el-menu-item) {
  color: rgba(255, 255, 255, 0.95) !important;
  background: transparent !important;
  min-height: 50px;
  line-height: 50px;
  padding-left: 60px !important;
}

.sidebar :deep(.el-sub-menu .el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

.sidebar :deep(.el-sub-menu .el-menu-item.is-active) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%) !important;
  color: white !important;
  font-weight: 600;
}

/* 侧边栏内联菜单 */
.el-menu {
  background-color: transparent !important;
  border: none !important;
}
</style>
