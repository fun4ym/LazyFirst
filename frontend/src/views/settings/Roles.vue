<template>
  <div class="roles-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('role.title') }}</h3>
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('roles:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('role.createRole') }}
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="roles" v-loading="loading" border>
        <el-table-column prop="name" :label="$t('role.roleName')" width="200" />
        <el-table-column prop="description" :label="$t('role.description')" />
        <el-table-column :label="$t('role.permissionCount')" width="120">
          <template #default="{ row }">
            {{ row.permissions?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('role.dataPermission')" width="300">
          <template #default="{ row }">
            <el-tag v-if="row.name === '超级管理员'" type="success" size="small">{{ $t('role.allPermissions') }}</el-tag>
            <div v-else-if="row.moduleDataScopes && Object.keys(row.moduleDataScopes).length > 0" style="font-size: 12px">
              <el-tag v-for="(scope, module) in row.moduleDataScopes" :key="module" size="small" style="margin-right: 4px; margin-bottom: 2px">
                {{ getModuleName(module) }}: {{ getScopeName(scope) }}
              </el-tag>
            </div>
            <span v-else style="color: #999">{{ $t('role.notConfigured') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? $t('role.enabled') : $t('role.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('role.createTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('role.operation')" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.name === '超级管理员'">
              <el-tag type="danger" size="small">{{ $t('role.superAdmin') }}</el-tag>
            </template>
            <template v-else>
              <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('roles:update')">{{ $t('common.edit') }}</el-button>
              <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('roles:delete')">{{ $t('common.delete') }}</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('role.editRole') : $t('role.createRole')"
      width="1100px"
      top="5vh"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="$t('role.roleName')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>

        <el-form-item :label="$t('role.description')" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <!-- 权限配置 - 新布局：左侧菜单树 + 中间控件 + 右侧数据 -->
        <el-form-item :label="$t('role.permissionConfig')" prop="permissions">
          <div v-if="isSuperAdminRole" class="super-admin-tip">
            <el-alert type="success" :closable="false">
              <template #title>
                {{ $t('role.superAdminTip') }}
              </template>
            </el-alert>
          </div>
          <div v-else class="permission-panel">
            <!-- 左侧：菜单树 -->
            <div class="menu-tree-panel">
              <div class="panel-title">{{ $t('role.menuList') }}</div>
              <el-tree
                :data="translatedMenuTree"
                :props="treeProps"
                node-key="code"
                :expand-on-click-node="false"
                :default-expand-all="true"
                @node-click="handleMenuSelect"
              >
                <template #default="{ node, data }">
                  <span class="menu-tree-node">
                    <span>{{ data.name }}</span>
                    <el-checkbox
                      v-if="data.children && data.children.length > 0"
                      :model-value="isGroupChecked(data)"
                      :indeterminate="isGroupIndeterminate(data)"
                      @change="toggleGroup(data, $event)"
                      @click.stop
                    />
                    <el-checkbox
                      v-else
                      :model-value="isMenuChecked(data.code)"
                      @change="toggleMenu(data.code, $event)"
                      @click.stop
                    />
                  </span>
                </template>
              </el-tree>
            </div>

            <!-- 中间：控件权限 -->
            <div class="control-panel">
              <div class="panel-title">
                {{ $t('role.controlPermission') }}
                <span class="selected-menu">{{ selectedMenu?.name || $t('role.selectMenu') }}</span>
              </div>
              <div v-if="selectedMenu && availableControls.length > 0" class="control-list">
                <div class="controls-table">
                  <el-table :data="translatedAvailableControls" border size="small">
                    <el-table-column prop="name" :label="$t('common.name')" />
                    <el-table-column :label="$t('role.enabled')" width="100" align="center">
                      <template #default="{ row }">
                        <el-switch
                          :model-value="isControlEnabled(row.code)"
                          @change="toggleControl(row.code, $event)"
                        />
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
              <div v-else-if="selectedMenu" class="no-selection">
                {{ $t('role.noControls') }}
              </div>
              <div v-else class="no-selection">
                {{ $t('role.selectMenuLeft') }}
              </div>
            </div>

            <!-- 右侧：数据权限 -->
            <div class="data-scope-panel">
              <div class="panel-title">{{ $t('role.dataScope') }}</div>
              <div v-if="selectedMenu && selectedMenu.code" class="data-scope-config">
                <div class="data-scope-item">
                  <span class="data-scope-label">{{ selectedMenu.name }}</span>
                  <el-radio-group v-model="dataScopeConfig[selectedMenu.code]" size="small">
                    <el-radio-button label="self">{{ $t('role.self') }}</el-radio-button>
                    <el-radio-button label="dept">{{ $t('role.dept') }}</el-radio-button>
                    <el-radio-button label="all">{{ $t('role.all') }}</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="data-scope-tips">
                  <el-alert type="info" :closable="false">
                    <template #title>
                      <span v-if="dataScopeConfig[selectedMenu.code] === 'self'">{{ $t('role.scopeSelfTip') }}</span>
                      <span v-else-if="dataScopeConfig[selectedMenu.code] === 'dept'">{{ $t('role.scopeDeptTip') }}</span>
                      <span v-else>{{ $t('role.scopeAllTip') }}</span>
                    </template>
                  </el-alert>
                </div>
              </div>
              <div v-else class="no-selection">
                {{ $t('role.selectMenuConfig') }}
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item :label="$t('common.status')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">{{ $t('role.enabled') }}</el-radio>
            <el-radio value="inactive">{{ $t('role.disabled') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const { t } = useI18n()
const hasPermission = (perm) => AuthManager.hasPermission(perm)

// 菜单名称翻译映射
const menuNameMap = computed(() => ({
  dashboard: t('menu.dashboard'),
  bdWorkspace: t('menu.bdWorkspace'),
  influencers: t('menu.influencerList'),
  samplesBd: '样品申请(BD)',
  videos: t('menu.videoRegister'),
  supplyChain: t('menu.supplyChain'),
  products: t('menu.products'),
  activities: t('menu.activities'),
  shops: t('menu.shops'),
  dataCollection: t('menu.dataCollection'),
  samples: t('menu.samples'),
  orders: t('menu.orders'),
  reports: t('menu.reports'),
  bdDashboard: t('menu.bdDashboard'),
  bdDaily: t('menu.bdDaily'),
  performance: t('menu.performance'),
  settings: t('menu.settings'),
  users: t('menu.users'),
  roles: t('menu.roles'),
  departments: t('menu.departments'),
  commissions: t('menu.commissionRules'),
  baseData: t('menu.baseData'),
  systemModels: t('menu.systemModels'),
  marketWorkspace: t('menu.marketWorkspace'),
  recruitments: t('menu.recruitmentConfig')
}))

// 控件名称翻译映射
const controlNameMap = computed(() => ({
  'btn-view': t('common.viewDetail'),
  'btn-add': t('common.add'),
  'btn-edit': t('common.edit'),
  'btn-delete': t('common.delete'),
  'btn-batch-claim': t('influencer.batchClaim'),
  'btn-batch-release': t('influencer.batchRelease'),
  'btn-view-orders': t('influencer.viewOrders'),
  'btn-claim': t('influencer.claim'),
  'btn-release': t('influencer.release'),
  'btn-add-blacklist': t('influencer.blacklist'),
  'btn-remove-blacklist': t('influencer.releaseBlacklistSuccess'),
  'btn-view-report': t('product.report'),
  'btn-copy-link': t('shop.copy'),
  'btn-shop-add': t('shop.addShop'),
  'btn-shop-view': t('shop.detail'),
  'btn-shop-edit': t('shop.edit'),
  'btn-shop-delete': t('shop.delete'),
  'btn-refresh-code': t('common.refresh'),
  'btn-match-bd': 'BD匹配',
  'btn-import': t('common.import'),
  'btn-view-influencer': t('influencer.viewOrders'),
  'btn-view-detail': t('common.detail'),
  'btn-edit-status': t('common.edit'),
  'btn-edit-fulfillment': t('common.edit'),
  'btn-edit-promo': t('common.edit'),
  'btn-generate': t('bdDaily.generateStats'),
  'btn-batch-delete': t('common.delete'),
  'btn-export': t('common.export'),
  'btn-reset-pwd': t('common.edit'),
  'btn-add-category': t('commission.addCategory'),
  'btn-add-rule': t('commission.addRule'),
  'btn-save': t('common.save'),
  'btn-refresh-code': t('common.refresh'),
  'btn-copy-link': t('shop.copy'),
  // 操作权限
  'read': t('common.viewDetail'),
  'create': t('common.add'),
  'update': t('common.edit'),
  'delete': t('common.delete')
}))

// 翻译后的菜单树
const translatedMenuTree = computed(() => {
  const translate = (items) => items.map(item => ({
    ...item,
    name: menuNameMap.value[item.code] || item.name,
    children: item.children ? translate(item.children) : undefined,
    controls: item.controls ? item.controls.map(ctrl => ({
      ...ctrl,
      name: controlNameMap.value[ctrl.code] || ctrl.name
    })) : undefined,
    operations: item.operations ? item.operations.map(op => ({
      code: op,
      name: controlNameMap.value[op] || op
    })) : undefined
  }))
  return translate(menuTree.value)
})

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const isSuperAdminRole = ref(false)
const formRef = ref(null)
const roles = ref([])

// 菜单树结构（一级+二级）
const menuTree = ref([
  {
    name: '仪表盘',
    code: 'dashboard',
    children: [],
    operations: [],
    controls: []
  },
  {
    name: 'BD工作台',
    code: 'bdWorkspace',
    children: [
      {
        name: '建联达人',
        code: 'influencers',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-add', name: '新增达人' },
          { code: 'btn-edit', name: '编辑(行内)' },
          { code: 'btn-delete', name: '删除(行内)' },
          { code: 'btn-batch-claim', name: '批量认领' },
          { code: 'btn-batch-release', name: '批量释放' },
          { code: 'btn-view-orders', name: '查看订单(行内)' },
          { code: 'btn-claim', name: '认领(行内)' },
          { code: 'btn-release', name: '释放(行内)' },
          { code: 'btn-add-blacklist', name: '加入黑名单' },
          { code: 'btn-remove-blacklist', name: '解除黑名单' }
        ]
      },
      {
        name: '样品申请(BD)',
        code: 'samplesBd',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-add', name: '新增样品' },
          { code: 'btn-edit', name: '编辑样品' },
          { code: 'btn-delete', name: '删除样品' }
        ]
      },
      {
        name: '视频登记',
        code: 'videos',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-add', name: '新增视频' },
          { code: 'btn-edit', name: '编辑视频' },
          { code: 'btn-delete', name: '删除视频' }
        ]
      }
    ]
  },
  {
    name: '供应链',
    code: 'supplyChain',
    children: [
      {
        name: '产品管理',
        code: 'products',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新建产品' },
          { code: 'btn-view', name: '查看产品' },
          { code: 'btn-view-report', name: '查看报表' },
          { code: 'btn-edit', name: '编辑产品' },
          { code: 'btn-delete', name: '删除产品' },
          { code: 'btn-copy-link', name: '复制样品链接' },
          { code: 'btn-shop-add', name: '新建店铺' },
          { code: 'btn-shop-view', name: '查看店铺' },
          { code: 'btn-shop-edit', name: '编辑店铺' },
          { code: 'btn-shop-delete', name: '删除店铺' },
          { code: 'btn-refresh-code', name: '刷新识别码' }
        ]
      },
      {
        name: '活动管理',
        code: 'activities',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新增活动' },
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-edit', name: '编辑活动' },
          { code: 'btn-delete', name: '删除活动' },
          { code: 'btn-import-products', name: '导入商品' }
        ]
      },
      {
        name: '店铺管理',
        code: 'shops',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新建店铺' },
          { code: 'btn-view', name: '查看店铺' },
          { code: 'btn-edit', name: '编辑店铺' },
          { code: 'btn-delete', name: '删除店铺' }
        ]
      }
      // 合作产品已合并到产品管理中
    ]
  },
  {
    name: '数据采集',
    code: 'dataCollection',
    children: [
      {
        name: '样品管理',
        code: 'samples',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新增样品' },
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-edit', name: '编辑样品' },
          { code: 'btn-view-influencer', name: '查看达人' },
          { code: 'btn-edit-status', name: '编辑状态' },
          { code: 'btn-view-orders', name: '查看订单' },
          { code: 'btn-edit-fulfillment', name: '编辑履约' },
          { code: 'btn-edit-promo', name: '编辑推广' },
          { code: 'btn-delete', name: '删除样品' }
        ]
      },
      {
        name: '订单管理',
        code: 'orders',
        operations: ['read', 'create', 'update', 'delete', 'view'],
        controls: [
          { code: 'btn-match-bd', name: '匹配BD' },
          { code: 'btn-import', name: '导入订单' },
          { code: 'btn-view-influencer', name: '查看达人' },
          { code: 'btn-view-detail', name: '查看详情' }
        ]
      }
    ]
  },
  {
    name: '报表管理',
    code: 'reports',
    children: [
      {
        name: 'BD仪表盘',
        code: 'bdDashboard',
        operations: ['read'],
        controls: []
      },
      {
        name: 'BD日报',
        code: 'bdDaily',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看' },
          { code: 'btn-generate', name: '生成' },
          { code: 'btn-add', name: '新增' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' }
        ]
      },
      {
        name: '业绩报表',
        code: 'performance',
        operations: ['read'],
        controls: []
      }
    ]
  },
  {
    name: '系统设置',
    code: 'settings',
    children: [
      {
        name: '用户管理',
        code: 'users',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看' },
          { code: 'btn-add', name: '新增用户' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' },
          { code: 'btn-reset-pwd', name: '重置密码' },
          { code: 'btn-payment-records', name: '打款记录' }
        ]
      },
      {
        name: '角色管理',
        code: 'roles',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看' },
          { code: 'btn-add', name: '新增角色' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' }
        ]
      },
      {
        name: '部门管理',
        code: 'departments',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-view', name: '查看' },
          { code: 'btn-add', name: '新增部门' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' }
        ]
      },
      {
        name: '分润规则',
        code: 'commissions',
        operations: ['read', 'create', 'update', 'delete', 'calculate'],
        controls: [
          { code: 'btn-add-category', name: '新增分类' },
          { code: 'btn-add-rule', name: '新增规则' },
          { code: 'btn-delete', name: '删除规则' },
          { code: 'btn-save', name: '保存全部' },
          { code: 'btn-calculate', name: '计算佣金' }
        ]
      },
      {
        name: '基础数据',
        code: 'baseData',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新增' },
          { code: 'btn-batch-delete', name: '批量删除' },
          { code: 'btn-export', name: '导出' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' }
        ]
      },
      {
        name: '系统模型',
        code: 'systemModels',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新增' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' }
        ]
      }
    ]
  },
  {
    name: '市场工作台',
    code: 'marketWorkspace',
    children: [
      {
        name: '招募配置',
        code: 'recruitments',
        operations: ['read', 'create', 'update', 'delete'],
        controls: [
          { code: 'btn-add', name: '新增招募' },
          { code: 'btn-view', name: '查看详情' },
          { code: 'btn-edit', name: '编辑' },
          { code: 'btn-delete', name: '删除' },
          { code: 'btn-refresh-code', name: '刷新识别码' },
          { code: 'btn-copy-link', name: '复制链接' }
        ]
      }
    ]
  }
])

const treeProps = {
  children: 'children',
  label: 'name'
}

// 当前选中的菜单
const selectedMenu = ref(null)
const selectedMenuCode = computed(() => selectedMenu.value?.code)

// 当前菜单可用的控件列表
const availableControls = computed(() => {
  if (!selectedMenu.value) return []
  return selectedMenu.value.controls || []
})

// 翻译后的可用控件列表
const translatedAvailableControls = computed(() => {
  if (!selectedMenu.value) return []
  const controls = selectedMenu.value.controls || []
  return controls.map(ctrl => ({
    ...ctrl,
    name: controlNameMap.value[ctrl.code] || ctrl.name
  }))
})

// 数据权限配置
const dataScopeConfig = ref({})

// 控件权限映射
const controlPermissionsMap = ref({})

// 判断控件是否启用
const isControlEnabled = (controlCode) => {
  if (!selectedMenu.value) return false
  const menuCode = selectedMenu.value.code
  const controls = controlPermissionsMap.value[menuCode] || {}
  return controls[controlCode] === true
}

// 切换控件权限
const toggleControl = (controlCode, enabled) => {
  if (!selectedMenu.value) return
  const menuCode = selectedMenu.value.code
  if (!controlPermissionsMap.value[menuCode]) {
    controlPermissionsMap.value[menuCode] = {}
  }
  controlPermissionsMap.value[menuCode][controlCode] = enabled
}

// Tree选择处理
const handleMenuSelect = (data) => {
  selectedMenu.value = data
}

// 初始化所有权限（超级管理员用）
const initAllPermissions = () => {
  menuTree.value.forEach(group => {
    if (group.children && group.children.length > 0) {
      group.children.forEach(menu => {
        if (!controlPermissionsMap.value[menu.code]) {
          controlPermissionsMap.value[menu.code] = {}
        }
        if (menu.operations) {
          menu.operations.forEach(op => {
            controlPermissionsMap.value[menu.code][op] = true
          })
        }
        if (menu.controls) {
          menu.controls.forEach(ctrl => {
            controlPermissionsMap.value[menu.code][ctrl.code] = true
          })
        }
        dataScopeConfig.value[menu.code] = 'all'
      })
    } else {
      if (!controlPermissionsMap.value[group.code]) {
        controlPermissionsMap.value[group.code] = {}
      }
      if (group.operations) {
        group.operations.forEach(op => {
          controlPermissionsMap.value[group.code][op] = true
        })
      }
      if (group.controls) {
        group.controls.forEach(ctrl => {
          controlPermissionsMap.value[group.code][ctrl.code] = true
        })
      }
    }
  })
}

// 判断菜单是否被选中
const isMenuChecked = (code) => {
  const controls = controlPermissionsMap.value[code]
  if (!controls) return false
  return Object.values(controls).some(v => v === true)
}

// 切换菜单选中状态
const toggleMenu = (code, checked) => {
  let menuDef = null
  for (const group of menuTree.value) {
    if (group.code === code) {
      menuDef = group
      break
    }
    if (group.children) {
      menuDef = group.children.find(c => c.code === code)
      if (menuDef) break
    }
  }

  controlPermissionsMap.value[code] = {}

  if (!checked) {
    return
  }

  if (menuDef) {
    if (menuDef.operations && menuDef.operations.length > 0) {
      menuDef.operations.forEach(op => {
        controlPermissionsMap.value[code][op] = true
      })
    }
    if (menuDef.controls && menuDef.controls.length > 0) {
      menuDef.controls.forEach(ctrl => {
        controlPermissionsMap.value[code][ctrl.code] = true
      })
    }
    if ((!menuDef.operations || menuDef.operations.length === 0) && (!menuDef.controls || menuDef.controls.length === 0)) {
      controlPermissionsMap.value[code]['_enabled'] = true
    }
  }
}

// 判断分组是否全选
const isGroupChecked = (group) => {
  if (!group.children || group.children.length === 0) return false
  return group.children.every(child => isMenuChecked(child.code))
}

// 判断分组是否半选
const isGroupIndeterminate = (group) => {
  if (!group.children || group.children.length === 0) return false
  const checkedCount = group.children.filter(child => isMenuChecked(child.code)).length
  return checkedCount > 0 && checkedCount < group.children.length
}

// 切换分组
const toggleGroup = (group, checked) => {
  if (!group.children || group.children.length === 0) return
  group.children.forEach(child => {
    toggleMenu(child.code, checked)
  })
}

const form = reactive({
  name: '',
  description: '',
  permissions: [],
  moduleDataScopes: {},
  status: 'active'
})

const rules = {
  name: [
    { required: true, message: t('role.inputRoleName'), trigger: 'blur' }
  ],
  description: [
    { required: true, message: t('role.inputRoleDesc'), trigger: 'blur' }
  ]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const getModuleName = (code) => {
  for (const group of menuTree.value) {
    if (group.code === code) return group.name
    if (group.children) {
      const child = group.children.find(c => c.code === code)
      if (child) return child.name
    }
  }
  return code
}

const getScopeName = (scope) => {
  const map = { self: '自己', dept: '部门', all: '全部' }
  return map[scope] || scope
}

const loadRoles = async () => {
  loading.value = true
  try {
    const res = await request.get('/roles', { params: { limit: 1000 } })
    roles.value = res.roles
  } catch (error) {
    console.error('Load roles error:', error)
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}

const showEditDialog = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  
  isSuperAdminRole.value = row.name === '超级管理员'
  
  Object.assign(form, {
    _id: row._id,
    name: row.name,
    description: row.description,
    status: row.status
  })

  controlPermissionsMap.value = {}
  dataScopeConfig.value = {}
  selectedMenu.value = null

  // 注意：超级管理员角色也应该从数据库读取保存的权限
  // 而不是使用 initAllPermissions() 全部初始化为true
  // 否则编辑保存后重新打开会丢失自定义权限
  // initAllPermissions() 仅用于创建新角色时初始化所有权限
  if (isSuperAdminRole.value && !isEdit.value) {
    initAllPermissions()
  } else {
    // 读取权限：直接使用（现在是驼峰格式）
    // 同时读取控件权限（btn-开头）和操作权限
    if (row.permissions && row.permissions.length > 0) {
      row.permissions.forEach(perm => {
        if (perm.includes(':')) {
          const [menuCode, action] = perm.split(':')
          if (menuCode && action) {
            if (!controlPermissionsMap.value[menuCode]) {
              controlPermissionsMap.value[menuCode] = {}
            }
            controlPermissionsMap.value[menuCode][action] = true
          }
        }
      })
    }
  }

  // 解析数据权限 - 优先从moduleDataScopes读取键（确保即使没有控件权限也能显示数据权限）
  const dataScopeKeys = row.moduleDataScopes ? Object.keys(row.moduleDataScopes) : []
  const controlKeys = Object.keys(controlPermissionsMap.value)
  
  // 合并两个来源的键
  const allKeys = new Set([...dataScopeKeys, ...controlKeys])
  
  allKeys.forEach(code => {
    const controls = controlPermissionsMap.value[code]
    const hasAnyControl = controls && Object.values(controls).some(v => v === true)
    // 如果有控件权限，或者是已保存的数据权限键
    if (hasAnyControl || dataScopeKeys.includes(code)) {
      // 读取已保存的数据权限，如果没有保存过或值为空，默认设置为 'all'
      const savedScope = row.moduleDataScopes?.[code]
      dataScopeConfig.value[code] = savedScope || 'all'
    }
  })
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    description: '',
    permissions: [],
    moduleDataScopes: {},
    status: 'active'
  })
  controlPermissionsMap.value = {}
  dataScopeConfig.value = {}
  selectedMenu.value = null
  isSuperAdminRole.value = false
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true

    try {
      const permissionsSet = new Set()
      const controlToOperationMap = {
        'btn-add': 'create',
        'btn-view': 'read',
        'btn-edit': 'update',
        'btn-delete': 'delete',
        'btn-add-blacklist': 'create',
        'btn-remove-blacklist': 'delete',
        'btn-batch-claim': 'update',
        'btn-batch-release': 'update',
        'btn-claim': 'update',
        'btn-release': 'update',
        'btn-view-orders': 'read',
        'btn-view-influencer': 'read',
        'btn-edit-status': 'update',
        'btn-edit-fulfillment': 'update',
        'btn-edit-promo': 'update',
        'btn-view-detail': 'read',
        'btn-copy-link': 'read',
        'btn-shop-add': 'create',
        'btn-shop-view': 'read',
        'btn-shop-edit': 'update',
        'btn-shop-delete': 'delete',
        'btn-refresh-code': 'update',
        'btn-match-bd': 'update',
        'btn-import': 'create',
        'btn-view-detail': 'read',
        'btn-generate': 'create',
        'btn-batch-delete': 'delete',
        'btn-export': 'read',
        'btn-reset-pwd': 'update',
        'btn-payment-records': 'read',
        'btn-add-category': 'create',
        'btn-add-rule': 'create',
        'btn-save': 'update',
        'btn-calculate': 'calculate',
        'btn-import-products': 'create'
      }

      // 保存用户实际勾选的所有权限
      // 如果勾选了控件，同时映射保存对应的操作权限（供页面权限检查用）
      Object.keys(controlPermissionsMap.value).forEach(menuCode => {
        const controls = controlPermissionsMap.value[menuCode]

        Object.keys(controls).forEach(action => {
          if (controls[action] === true && action !== '_enabled') {
            // 保存用户勾选的内容（使用驼峰格式）
            permissionsSet.add(`${menuCode}:${action}`)

            // 如果是控件权限，映射到操作权限并保存
            if (controlToOperationMap[action]) {
              const operation = controlToOperationMap[action]
              permissionsSet.add(`${menuCode}:${operation}`)
            }
          }
        })
      })

      // 收集模块数据权限 - 只保存用户实际选择的
      const moduleDataScopes = {}
      Object.keys(controlPermissionsMap.value).forEach(menuCode => {
        const controls = controlPermissionsMap.value[menuCode]
        const hasAnyControl = Object.values(controls).some(v => v === true)
        if (hasAnyControl && dataScopeConfig.value[menuCode]) {
          moduleDataScopes[menuCode] = dataScopeConfig.value[menuCode]
        }
        console.log('[保存权限] menuCode:', menuCode, 'hasAnyControl:', hasAnyControl, 'dataScopeConfig:', dataScopeConfig.value[menuCode])
      })

      const data = {
        name: form.name,
        description: form.description,
        permissions: Array.from(permissionsSet),
        moduleDataScopes,
        status: form.status
      }

      console.log('[保存数据权限] moduleDataScopes:', JSON.stringify(moduleDataScopes))

      if (isEdit.value) {
        await request.put(`/roles/${form._id}`, data)
        ElMessage.success(t('role.updateSuccess'))
      } else {
        await request.post('/roles', data)
        ElMessage.success(t('role.createSuccess'))
      }

      dialogVisible.value = false
      loadRoles()
    } catch (error) {
      console.error('Submit error:', error)
      ElMessage.error(error.response?.data?.message || t('role.operateFailed'))
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(t('role.confirmDelete'), t('role.confirmTitle'), {
      type: 'warning'
    })

    await request.delete(`/roles/${row._id}`)
    ElMessage.success(t('role.deleteSuccess'))
    loadRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<style scoped>
.roles-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-panel {
  display: flex;
  gap: 16px;
  min-height: 400px;
}

.menu-tree-panel {
  width: 220px;
  border-right: 1px solid #eee;
  padding-right: 16px;
}

.control-panel {
  flex: 1;
  border-right: 1px solid #eee;
  padding-right: 16px;
}

.data-scope-panel {
  width: 220px;
}

.panel-title {
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-menu {
  font-weight: normal;
  font-size: 12px;
  color: #666;
}

.menu-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 8px;
}

.control-list {
  max-height: 350px;
  overflow-y: auto;
}

.controls-table {
  margin-top: 8px;
  max-height: 500px;
  overflow-y: auto;
}

.controls-table :deep(.el-table) {
  max-height: none;
}

.no-selection {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.data-scope-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-scope-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.data-scope-label {
  font-size: 13px;
  color: #333;
}

.data-scope-tips {
  margin-top: 8px;
}

.super-admin-tip {
  padding: 20px;
  text-align: center;
}
</style>
