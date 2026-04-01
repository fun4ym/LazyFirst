<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.users') }}</h3>
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('users:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('user.addUser') }}
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('common.search')">
          <el-input
            v-model="searchForm.search"
            :placeholder="$t('user.searchPlaceholder')"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item :label="$t('common.status')">
          <el-select v-model="searchForm.status" :placeholder="$t('common.all')" clearable>
            <el-option :label="$t('status.active')" value="active" />
            <el-option :label="$t('status.inactive')" value="inactive" />
          </el-select>
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="searchForm.roleId" placeholder="全部角色" clearable>
            <el-option
              v-for="role in roles"
              :key="role._id"
              :label="role.name"
              :value="role._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadUsers">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="users" v-loading="loading" border>
        <el-table-column prop="username" :label="$t('user.username')" width="180">
          <template #default="{ row }">
            <div>{{ row.username }}</div>
            <div v-if="row.employmentStatus !== 'nocommission'" style="font-size: 11px; color: #909399">
              <span v-if="row.settlementType === 'monthly'">每月{{ row.settlementDay }}日结算</span>
              <span v-else-if="row.settlementType === 'weekly'">每周{{ getWeekName(row.settlementDay) }}结算</span>
            </div>
            <div v-else style="font-size: 11px; color: #E6A23C">无底薪</div>
          </template>
        </el-table-column>
        <el-table-column prop="realName" label="真实姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            {{ row.roleId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="部门" width="120">
          <template #default="{ row }">
            {{ row.deptId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <!-- 超级管理员用户：只有超级管理员可编辑/删除 -->
            <template v-if="isSuperAdminUser(row)">
              <el-tag type="danger" size="small">超级管理员</el-tag>
              <template v-if="isCurrentUserSuperAdmin()">
                <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">删除</el-button>
              </template>
            </template>
            <!-- 普通用户：可编辑/删除 -->
            <template v-else>
              <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">编辑</el-button>
              <el-button link type="warning" @click="showPasswordResetDialog(row)" v-if="hasPermission('users:btn-reset-pwd')">重置密码</el-button>
              <el-button link type="success" @click="showPaymentRecordsDialog(row)" v-if="hasPermission('users:btn-payment-records') || hasPermission('users:read')">打款记录</el-button>
              <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadUsers"
        @current-change="loadUsers"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>

        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>

        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="选择角色" style="width: 100%" :disabled="isEdit && users.value && isSuperAdminUser(users.value.find(u => u._id === form._id))">
            <el-option
              v-for="role in availableRoles"
              :key="role._id"
              :label="role.name"
              :value="role._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="部门" prop="deptId">
          <el-select v-model="form.deptId" placeholder="选择部门" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept._id"
              :label="dept.name"
              :value="dept._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="银行账号">
          <el-input v-model="form.bankAccount" placeholder="请输入银行账号（非必填）" />
        </el-form-item>

        <el-form-item label="任职状态">
          <el-radio-group v-model="form.employmentStatus" @change="onEmploymentStatusChange">
            <el-radio label="fulltime">全职</el-radio>
            <el-radio label="parttime">兼职</el-radio>
            <el-radio label="nocommission">无底薪</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="结算方式" v-if="form.employmentStatus !== 'nocommission'">
          <el-radio-group v-model="form.settlementType" @change="onSettlementTypeChange">
            <el-radio label="monthly">月结</el-radio>
            <el-radio label="weekly">周结</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="结算日" v-if="form.employmentStatus !== 'nocommission'">
          <el-select v-model="form.settlementDay" style="width: 100%" :placeholder="form.settlementType === 'monthly' ? '选择日期' : '选择星期'">
            <el-option
              v-if="form.settlementType === 'monthly'"
              v-for="day in 31"
              :key="day"
              :label="`每月${day}日`"
              :value="day"
            />
            <el-option
              v-if="form.settlementType === 'weekly'"
              v-for="day in weekOptions"
              :key="day.value"
              :label="day.label"
              :value="day.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="passwordResetDialogVisible"
      title="重置密码"
      width="400px"
    >
      <el-alert
        :title="`为用户 ${passwordResetForm.username} 重置密码`"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      />
      <el-form :model="passwordResetForm" label-width="100px">
        <el-form-item label="新密码">
          <el-input v-model="passwordResetForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordResetForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordResetDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePasswordReset">确定</el-button>
      </template>
    </el-dialog>

    <!-- 打款记录对话框 -->
    <el-dialog
      v-model="paymentRecordsDialogVisible"
      :title="`${paymentRecordsUser.realName || ''} - 打款记录`"
      width="800px"
    >
      <div class="payment-records-header">
        <el-button type="primary" size="small" @click="showAddPaymentRecordDialog">
          <el-icon><Plus /></el-icon>
          新增打款记录
        </el-button>
      </div>
      
      <el-table :data="paymentRecords" v-loading="paymentRecordsLoading" border stripe style="margin-top: 12px">
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'salary' ? 'warning' : 'success'" size="small">
              {{ row.type === 'salary' ? '薪水' : '提成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="billNo" label="账单" width="120">
          <template #default="{ row }">
            {{ row.billNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="paymentTime" label="打款时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.paymentTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="bdName" label="BD" width="100" />
        <el-table-column prop="bankAccount" label="银行账号" width="180" />
        <el-table-column prop="bankFlowNo" label="银行流水号" width="150" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            ¥{{ (row.amount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="120" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleDeletePaymentRecord(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="paymentRecordsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增打款记录对话框 -->
    <el-dialog
      v-model="addPaymentRecordDialogVisible"
      title="新增打款记录"
      width="500px"
    >
      <el-form :model="paymentRecordForm" label-width="100px">
        <el-form-item label="BD名称">
          <el-input v-model="paymentRecordForm.bdName" disabled />
        </el-form-item>
        <el-form-item label="银行账号">
          <el-input v-model="paymentRecordForm.bankAccount" placeholder="请输入银行账号" />
        </el-form-item>
        <el-form-item label="银行流水号">
          <el-input v-model="paymentRecordForm.bankFlowNo" placeholder="请输入银行流水号" />
        </el-form-item>
        <el-form-item label="打款金额">
          <el-input-number v-model="paymentRecordForm.amount" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="打款时间">
          <el-date-picker
            v-model="paymentRecordForm.paymentTime"
            type="datetime"
            placeholder="选择打款时间"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="paymentRecordForm.note" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPaymentRecordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddPaymentRecord" :loading="addingPaymentRecord">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

// 判断用户是否是超级管理员
const isSuperAdminUser = (user) => {
  if (!user) return false
  const role = user.role || user.roleId
  if (!role) return false
  // 检查role对象或role名称
  if (typeof role === 'object') {
    return role.name === '超级管理员' || role.permissions?.includes('*')
  }
  return role === '超级管理员' || role === 'admin'
}

// 判断当前登录用户是否是超级管理员
const isCurrentUserSuperAdmin = () => {
  const currentUser = AuthManager.getUser()
  if (!currentUser) return false
  return isSuperAdminUser(currentUser)
}

// 可选择的角色列表（排除超级管理员角色）
const availableRoles = computed(() => {
  return roles.value.filter(role => role.name !== '超级管理员')
})

const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const users = ref([])
const roles = ref([])
const departments = ref([])
const passwordResetDialogVisible = ref(false)
const passwordResetForm = ref({
  userId: '',
  username: '',
  newPassword: '',
  confirmPassword: ''
})

// 打款记录相关
const paymentRecordsDialogVisible = ref(false)
const addPaymentRecordDialogVisible = ref(false)
const paymentRecordsLoading = ref(false)
const addingPaymentRecord = ref(false)
const paymentRecordsUser = ref({})
const paymentRecords = ref([])
const paymentRecordForm = reactive({
  userId: '',
  bdName: '',
  bankAccount: '',
  bankFlowNo: '',
  amount: 0,
  paymentTime: '',
  note: ''
})

const searchForm = reactive({
  search: '',
  status: '',
  roleId: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: '',
  roleId: '',
  deptId: '',
  status: 'active',
  bankAccount: '',
  employmentStatus: 'fulltime',
  settlementType: 'monthly',
  settlementDay: 15
})

// 任职状态改变时重置结算方式
const onEmploymentStatusChange = () => {
  if (form.employmentStatus === 'nocommission') {
    form.settlementType = 'monthly'
    form.settlementDay = 15
  }
}

// 结算类型改变时重置结算日
const onSettlementTypeChange = () => {
  if (form.settlementType === 'monthly') {
    form.settlementDay = 15
  } else {
    form.settlementDay = 1
  }
}

// 周选项
const weekOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' }
]

// 获取周几名称
const getWeekName = (day) => {
  const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
  return map[day] || day
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' }
  ],
  roleId: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/users', { params })
    users.value = res.users
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load users error:', error)
  } finally {
    loading.value = false
  }
}

const loadRoles = async () => {
  try {
    const res = await request.get('/roles', { params: { limit: 1000 } })
    roles.value = res.roles
  } catch (error) {
    console.error('Load roles error:', error)
  }
}

const loadDepartments = async () => {
  try {
    const res = await request.get('/departments', { params: { limit: 1000 } })
    departments.value = res.departments
  } catch (error) {
    console.error('Load departments error:', error)
  }
}

// 显示打款记录对话框
const showPaymentRecordsDialog = async (row) => {
  paymentRecordsUser.value = row
  paymentRecordsDialogVisible.value = true
  // 加载该BD的所有打款记录（薪水类型）
  const bdName = row.realName || row.username
  await loadPaymentRecords(bdName)
}

// 加载打款记录
const loadPaymentRecords = async (bdName) => {
  paymentRecordsLoading.value = true
  try {
    const res = await request.get(`/report-orders/bd-payment-records/${encodeURIComponent(bdName)}`)
    paymentRecords.value = res.records || []
  } catch (error) {
    console.error('Load payment records error:', error)
    ElMessage.error('加载打款记录失败')
  } finally {
    paymentRecordsLoading.value = false
  }
}

// 显示新增打款记录对话框
const showAddPaymentRecordDialog = () => {
  // 默认打款时间为当前系统时间
  const now = new Date()
  const paymentTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  
  Object.assign(paymentRecordForm, {
    userId: paymentRecordsUser.value._id,
    bdName: paymentRecordsUser.value.realName || paymentRecordsUser.value.username,
    bankAccount: paymentRecordsUser.value.bankAccount || '',
    bankFlowNo: '',
    amount: 0,
    paymentTime: paymentTime,
    note: ''
  })
  addPaymentRecordDialogVisible.value = true
}

// 新增打款记录（薪水类型）
const handleAddPaymentRecord = async () => {
  if (!paymentRecordForm.bdName) {
    ElMessage.warning('请填写BD名称')
    return
  }
  
  addingPaymentRecord.value = true
  try {
    // 薪水类型，不需要关联账单
    await request.post('/report-orders/bd-payment-records', {
      ...paymentRecordForm,
      type: 'salary'
    })
    ElMessage.success('添加成功')
    addPaymentRecordDialogVisible.value = false
    await loadPaymentRecords(paymentRecordForm.bdName)
  } catch (error) {
    console.error('Add payment record error:', error)
    ElMessage.error(error.response?.data?.message || '添加失败')
  } finally {
    addingPaymentRecord.value = false
  }
}

// 删除打款记录
const handleDeletePaymentRecord = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条打款记录吗？', '提示', {
      type: 'warning'
    })
    // 找到该记录在数组中的索引
    const idx = paymentRecords.value.findIndex(r => r.billId === row.billId && r.createdAt === row.createdAt)
    if (idx === -1) {
      ElMessage.error('记录不存在')
      return
    }
    await request.delete(`/report-orders/bd-payment-records/${row.billId}/${idx}`)
    ElMessage.success('删除成功')
    await loadPaymentRecords(row.bdName)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete payment record error:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
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
  Object.assign(form, {
    _id: row._id,
    username: row.username,
    realName: row.realName,
    phone: row.phone,
    email: row.email,
    roleId: row.roleId?._id || row.roleId,
    deptId: row.deptId?._id || row.deptId,
    status: row.status,
    bankAccount: row.bankAccount || '',
    employmentStatus: row.employmentStatus || 'fulltime',
    settlementType: row.settlementType || 'monthly',
    settlementDay: row.settlementDay || 15
  })
}

const showPasswordResetDialog = (row) => {
  passwordResetForm.value = {
    userId: row._id,
    username: row.username,
    newPassword: '',
    confirmPassword: ''
  }
  passwordResetDialogVisible.value = true
}

const handlePasswordReset = async () => {
  if (passwordResetForm.value.newPassword !== passwordResetForm.value.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致')
    return
  }

  if (passwordResetForm.value.newPassword.length < 6) {
    ElMessage.error('密码至少6位')
    return
  }

  try {
    const response = await fetch(`/api/users/${passwordResetForm.value.userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        newPassword: passwordResetForm.value.newPassword
      })
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('密码重置成功')
      passwordResetDialogVisible.value = false
    } else {
      ElMessage.error(result.message || '密码重置失败')
    }
  } catch (error) {
    ElMessage.error('密码重置失败')
  }
}

const resetForm = () => {
  Object.assign(form, {
    username: '',
    password: '',
    realName: '',
    phone: '',
    email: '',
    roleId: '',
    deptId: '',
    status: 'active',
    bankAccount: '',
    employmentStatus: 'fulltime',
    settlementType: 'monthly',
    settlementDay: 15
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { search: '', status: '' })
  loadUsers()
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = { ...form }
      if (isEdit.value) {
        await request.put(`/users/${data._id}`, data)
        ElMessage.success('更新成功')
      } else {
        await request.post('/users', data)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 ${row.realName} 吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/users/${row._id}`)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

onMounted(() => {
  loadUsers()
  loadRoles()
  loadDepartments()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
  margin: 0;
}

.search-form {
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
}

.el-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

/* 表格操作按钮 */
.el-button + .el-button {
  margin-left: 8px;
}

/* 对话框表单 */
.el-form {
  padding: 0;
}

/* 打款记录 */
.payment-records-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.el-form-item {
  margin-bottom: 18px;
}
</style>
