import { createRouter, createWebHistory } from 'vue-router'
import AuthManager from '@/utils/auth'

const routes = [
  // 移动端页面
  {
    path: '/mobile',
    component: () => import('@/views/mobile/Index.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/mobile/influencers'
      },
      {
        path: 'influencers',
        component: () => import('@/views/mobile/Influencers.vue'),
        meta: { title: '达人列表' }
      },
      {
        path: 'samples',
        component: () => import('@/views/mobile/Samples.vue'),
        meta: { title: '样品管理' }
      },
      {
        path: 'profile',
        component: () => import('@/views/mobile/Profile.vue'),
        meta: { title: '个人中心' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  // 公开样品申请页面（通过识别码访问）
  {
    path: '/samples/public',
    name: 'PublicSamples',
    component: () => import('@/views/samples/PublicCollection.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据概览' }
      },
      {
        path: 'influencer-managements',
        name: 'InfluencerManagements',
        component: () => import('@/views/influencer-managements/Index.vue'),
        meta: { title: '' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/products/Index.vue'),
        meta: { title: '合作产品' }
      },
      {
        path: 'shops',
        name: 'Shops',
        component: () => import('@/views/products/Index.vue'),
        meta: { title: '店铺管理', activeTab: 'shops' }
      },
      // 合作产品已合并到产品管理中
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('@/views/activities/Index.vue'),
        meta: { title: '活动' }
      },
      {
        path: 'samples',
        name: 'Samples',
        component: () => import('@/views/samples/Management.vue'),
        meta: { title: '' }
      },
      {
        path: 'samples-bd',
        name: 'SamplesBD',
        component: () => import('@/views/samples/ManagementBDSelf.vue'),
        meta: { title: '' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/report-orders/Index.vue'),
        meta: { title: 'TikTok订单' }
      },
      {
        path: 'supply-chain',
        name: 'SupplyChain',
        component: () => import('@/views/supply-chain/Index.vue'),
        meta: { title: '供应链' }
      },
      {
        path: 'commissions',
        name: 'Commissions',
        component: () => import('@/views/commissions/Index.vue'),
        meta: { title: '分润管理' }
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/views/performance/Index.vue'),
        meta: { title: '业绩报表' }
      },
      {
        path: 'bd-dashboard',
        name: 'BDDashboard',
        component: () => import('@/views/BDDashboard.vue'),
        meta: { title: 'BD仪表盘' }
      },
      {
        path: 'bd-daily',
        name: 'BdDaily',
        component: () => import('@/views/bd-daily/Index.vue'),
        meta: { title: 'BD每日统计' }
      },
      {
        path: 'settings',
        name: 'Settings',
        redirect: '/settings/users'
      },
      {
        path: 'settings/users',
        name: 'Users',
        component: () => import('@/views/settings/Users.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'settings/roles',
        name: 'Roles',
        component: () => import('@/views/settings/Roles.vue'),
        meta: { title: '角色管理' }
      },
      {
        path: 'settings/departments',
        name: 'Departments',
        component: () => import('@/views/settings/Departments.vue'),
        meta: { title: '部门管理' }
      },
      {
        path: 'settings/commission-rules',
        name: 'CommissionRules',
        component: () => import('@/views/settings/CommissionRules.vue'),
        meta: { title: '抽点设置' }
      },
      {
        path: 'settings/base-data',
        name: 'BaseData',
        component: () => import('@/views/settings/BaseData.vue'),
        meta: { title: '基础数据' }
      },
      {
        path: 'settings/system-models',
        name: 'SystemModels',
        component: () => import('@/views/settings/SystemModels.vue'),
        meta: { title: '系统模型' }
      },
      {
        path: 'settings/initialization',
        name: 'Initialization',
        component: () => import('@/views/settings/Initialization.vue'),
        meta: { title: '初始化', requiresAuth: true }
      },
      {
        path: 'settings/init-import',
        name: 'InitImport',
        component: () => import('@/views/settings/InitImport.vue'),
        meta: { title: '初始化导入', requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false
  const isLoggedIn = AuthManager.isLoggedIn()

  if (requiresAuth && !isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
