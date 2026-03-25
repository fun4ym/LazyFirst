<template>
  <el-container class="main-layout">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <img src="/logo.png" alt="LazyFirst Logo" class="logo-image" />
      </div>

      <el-menu
        :default-active="activeMenu"
        :default-openeds="['bd-workspace', 'supply-chain', 'data-collection', 'reports', 'settings']"
        router
        class="sidebar-menu"
      >
        <!-- 仪表盘 - 所有人可见 -->
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>{{ $t('menu.dashboard') }}</span>
        </el-menu-item>

        <!-- BD工作台 -->
        <el-sub-menu v-if="menuPermissions.bdWorkspace()" index="bd-workspace">
          <template #title>
            <el-icon><User /></el-icon>
            <span>{{ $t('menu.bdWorkspace') }}</span>
          </template>
          <el-menu-item v-if="menuPermissions.influencerList()" index="/influencer-managements">
            <span>{{ $t('menu.influencerList') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.samplesBd()" index="/samples-bd">
            <span>{{ $t('menu.samples') }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 供应链 -->
        <el-sub-menu v-if="menuPermissions.supplyChain()" index="supply-chain">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>{{ $t('menu.supplyChain') }}</span>
          </template>
          <el-menu-item v-if="menuPermissions.products()" index="/products">
            <span>{{ $t('menu.products') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.activities()" index="/activities">
            <span>{{ $t('menu.activities') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.shops()" index="/shops">
            <span>{{ $t('menu.shops') }}</span>
          </el-menu-item>
          <!-- 合作产品已合并到产品管理中 -->
        </el-sub-menu>

        <!-- 数据采集 -->
        <el-sub-menu v-if="menuPermissions.dataCollection()" index="data-collection">
          <template #title>
            <el-icon><DocumentCopy /></el-icon>
            <span>{{ $t('menu.dataCollection') }}</span>
          </template>
          <el-menu-item v-if="menuPermissions.samples()" index="/samples">
            <span>{{ $t('menu.samples') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.orders()" index="/orders">
            <span>{{ $t('menu.orders') }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 报表管理 -->
        <el-sub-menu v-if="menuPermissions.reports()" index="reports">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>{{ $t('menu.reports') }}</span>
          </template>
          <el-menu-item v-if="menuPermissions.bdDashboard()" index="/bd-dashboard">
            <span>{{ $t('menu.bdDashboard') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.bdDaily()" index="/bd-daily">
            <span>{{ $t('menu.bdDaily') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.performance()" index="/performance">
            <span>{{ $t('menu.performance') }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 系统设置 -->
        <el-sub-menu v-if="menuPermissions.settings()" index="settings">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>{{ $t('menu.settings') }}</span>
          </template>
          <el-menu-item v-if="menuPermissions.users()" index="/settings/users">
            <span>{{ $t('menu.users') }}</span>
          </el-menu-item>
          <!-- 角色管理仅超级管理员可见 -->
          <el-menu-item v-if="isSuperAdmin()" index="/settings/roles">
            <span>{{ $t('menu.roles') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.departments()" index="/settings/departments">
            <span>{{ $t('menu.departments') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.commissionRules()" index="/settings/commission-rules">
            <span>{{ $t('menu.commissionRules') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.baseData()" index="/settings/base-data">
            <span>{{ $t('menu.baseData') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.systemModels()" index="/settings/system-models">
            <span>{{ $t('menu.systemModels') }}</span>
          </el-menu-item>
          <el-menu-item v-if="menuPermissions.initImport()" index="/settings/init-import">
            <span>{{ $t('menu.initImport') }}</span>
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
          <LangSwitch style="margin-right: 16px" />
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
                  {{ $t('auth.changePassword') }}
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  {{ $t('auth.logoutSuccess') }}
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
      <el-dialog v-model="showPasswordDialog" :title="$t('auth.changePassword')" width="400px">
        <el-form :model="passwordForm" label-width="80px">
          <el-form-item :label="$t('auth.oldPassword')">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item :label="$t('auth.newPassword')">
            <el-input v-model="passwordForm.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item :label="$t('auth.confirmPassword')">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="showPasswordDialog = false">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handlePasswordChange">{{ $t('common.confirm') }}</el-button>
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
import LangSwitch from '@/components/LangSwitch.vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => 'LazyFirst Co., Ltd.')
const realName = computed(() => AuthManager.getUser()?.realName || '')

// 菜单权限判断
const hasPermission = (permission) => AuthManager.hasPermission(permission)
const hasAnyPermission = (permissions) => AuthManager.hasAnyPermission(permissions)

// 判断是否是超级管理员
const isSuperAdmin = () => {
  const permissions = AuthManager.getPermissions()
  return permissions.includes('*')
}

// 菜单项权限配置 - 直接对应角色权限
const menuPermissions = {
  // 仪表盘 - 所有人可见
  dashboard: () => true,

  // BD工作台 - 需要达人或样品申请(BD)权限
  bdWorkspace: () => hasAnyPermission(['influencers:read', 'influencers:create', 'samples-bd:read', 'samples-bd:create']),
  influencerList: () => hasPermission('influencers:read'),
  samplesBd: () => hasAnyPermission(['samples-bd:read', 'samples-bd:create']),

  // 供应链 - 需要产品或活动或店铺权限
  supplyChain: () => hasAnyPermission(['products:read', 'products:create', 'activities:read', 'activities:create', 'shops:read', 'shops:create']),
  products: () => hasPermission('products:read'),
  activities: () => hasPermission('activities:read'),
  shops: () => hasPermission('shops:read'),
  // 合作产品已合并到产品管理，使用 products 权限

  // 数据采集 - 需要样品管理或订单或店铺权限（样品管理和样品申请是分开的）
  dataCollection: () => hasAnyPermission(['samples:read', 'orders:read', 'shops:read']),
  samples: () => hasPermission('samples:read'),
  orders: () => hasPermission('orders:read'),

  // 报表管理 - 需要BD日报或业绩或产品统计权限
  reports: () => hasAnyPermission(['bd-daily:read', 'performance:read', 'productStats:read']),
  bdDashboard: () => hasAnyPermission(['bd-dashboard:read', 'performance:read']),
  bdDaily: () => hasPermission('bd-daily:read'),
  performance: () => hasPermission('performance:read'),

  // 系统设置 - 需要对应模块的读取权限
  settings: () => hasAnyPermission(['users:read', 'roles:read', 'departments:read', 'baseData:read', 'systemModels:read', 'initImport:read']) || isSuperAdmin(),
  users: () => hasPermission('users:read'),
  roles: () => hasPermission('roles:read'),
  departments: () => hasPermission('departments:read'),
  commissionRules: () => hasPermission('commissions:read'),
  baseData: () => hasPermission('baseData:read'),
  systemModels: () => hasPermission('systemModels:read'),
  initImport: () => {
    // 初始化导入仅超级管理员可见
    const user = AuthManager.getUser()
    return user?.role?.name === '超级管理员'
  }
}

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
