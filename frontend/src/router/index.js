import { createRouter, createWebHistory } from 'vue-router'
import AuthManager from '@/utils/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
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
        meta: { title: '达人管理' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/products/Index.vue'),
        meta: { title: '合作产品' }
      },
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('@/views/activities/Index.vue'),
        meta: { title: 'TikTok活动' }
      },
      {
        path: 'samples',
        name: 'Samples',
        component: () => import('@/views/samples/Management.vue'),
        meta: { title: '样品申请' }
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
