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

        <el-form-item :label="$t('user.role')">
          <el-select v-model="searchForm.roleId" :placeholder="$t('user.allRoles')" clearable>
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
              <span v-if="row.settlementType === 'monthly'">{{ $t('user.monthlySettlement') }}{{ row.settlementDay }}{{ $t('user.settlementDay') }}</span>
              <span v-else-if="row.settlementType === 'weekly'">{{ $t('user.weeklySettlement') }}{{ getWeekName(row.settlementDay) }}</span>
            </div>
            <div v-else style="font-size: 11px; color: #E6A23C">{{ $t('user.nocommission') }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="realName" :label="$t('user.realName')" width="120" />
        <el-table-column prop="phone" :label="$t('user.phone')" width="130" />
        <el-table-column prop="email" :label="$t('user.email')" width="180" />
        <el-table-column :label="$t('user.role')" width="120">
          <template #default="{ row }">
            {{ row.roleId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('user.department')" width="120">
          <template #default="{ row }">
            {{ row.deptId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? $t('role.enabled') : $t('role.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('user.createTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('user.operation')" width="240" fixed="right">
          <template #default="{ row }">
            <!-- 超级管理员用户：只有超级管理员可编辑/删除 -->
            <template v-if="isSuperAdminUser(row)">
              <el-tag type="danger" size="small">{{ $t('user.superAdmin') }}</el-tag>
              <template v-if="isCurrentUserSuperAdmin()">
                <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">{{ $t('common.edit') }}</el-button>
                <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">{{ $t('common.delete') }}</el-button>
              </template>
            </template>
            <!-- 普通用户：可编辑/删除 -->
            <template v-else>
              <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('users:update')">{{ $t('common.edit') }}</el-button>
              <el-button link type="warning" @click="showPasswordResetDialog(row)" v-if="hasPermission('users:btn-reset-pwd')">{{ $t('user.resetPassword') }}</el-button>
              <el-button link type="success" @click="showPaymentRecordsDialog(row)" v-if="hasPermission('users:btn-payment-records') || hasPermission('users:read')">{{ $t('user.paymentRecords') }}</el-button>
              <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('users:delete')">{{ $t('common.delete') }}</el-button>
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
      :title="isEdit ? $t('user.editUserTitle') : $t('user.createUserTitle')"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item :label="$t('user.username')" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>

        <el-form-item :label="$t('user.password')" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>

        <el-form-item :label="$t('user.realName')" prop="realName">
          <el-input v-model="form.realName" />
        </el-form-item>

        <el-form-item :label="$t('user.phone')" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>

        <el-form-item :label="$t('user.email')" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item :label="$t('user.role')" prop="roleId">
          <el-select v-model="form.roleId" :placeholder="$t('user.selectRole')" style="width: 100%" :disabled="isEdit && users.value && isSuperAdminUser(users.value.find(u => u._id === form._id))">
            <el-option
              v-for="role in availableRoles"
              :key="role._id"
              :label="role.name"
              :value="role._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('user.department')" prop="deptId">
          <el-select v-model="form.deptId" :placeholder="$t('user.selectDepartment')" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept._id"
              :label="dept.name"
              :value="dept._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('user.bankAccount')">
          <el-input v-model="form.bankAccount" :placeholder="$t('user.bankAccountOptional')" />
        </el-form-item>

        <el-form-item :label="$t('user.employmentStatus')">
          <el-radio-group v-model="form.employmentStatus" @change="onEmploymentStatusChange">
            <el-radio value="fulltime">{{ $t('user.fulltime') }}</el-radio>
            <el-radio value="parttime">{{ $t('user.parttime') }}</el-radio>
            <el-radio value="nocommission">{{ $t('user.nocommission') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('user.settlementMethod')" v-if="form.employmentStatus !== 'nocommission'">
          <el-radio-group v-model="form.settlementType" @change="onSettlementTypeChange">
            <el-radio value="monthly">{{ $t('user.monthlySettlement') }}</el-radio>
            <el-radio value="weekly">{{ $t('user.weeklySettlement') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="$t('user.settlementDay')" v-if="form.employmentStatus !== 'nocommission'">
          <el-select v-model="form.settlementDay" style="width: 100%" :placeholder="form.settlementType === 'monthly' ? $t('user.selectDate') : $t('user.selectWeek')">
            <el-option
              v-if="form.settlementType === 'monthly'"
              v-for="day in 31"
              :key="day"
              :label="$t('user.monthlyDay', { day })"
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

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="passwordResetDialogVisible"
      :title="$t('user.resetPasswordTitle')"
      width="400px"
    >
      <el-alert
        :title="$t('user.resetPasswordTitle') + ' - ' + passwordResetForm.username"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      />
      <el-form :model="passwordResetForm" label-width="100px">
        <el-form-item :label="$t('user.newPassword')">
          <el-input v-model="passwordResetForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :label="$t('user.confirmPwd')">
          <el-input v-model="passwordResetForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordResetDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handlePasswordReset">{{ $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 打款记录对话框 -->
    <el-dialog
      v-model="paymentRecordsDialogVisible"
      :title="(paymentRecordsUser.realName || '') + ' - ' + $t('user.paymentRecordsTitle')"
      width="800px"
    >
      <div class="payment-records-header">
        <el-button type="primary" size="small" @click="showAddPaymentRecordDialog">
          <el-icon><Plus /></el-icon>
          {{ $t('user.addPaymentRecord') }}
        </el-button>
      </div>
      
      <el-table :data="paymentRecords" v-loading="paymentRecordsLoading" border stripe style="margin-top: 12px">
        <el-table-column prop="type" :label="$t('user.type')" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'salary' ? 'warning' : 'success'" size="small">
              {{ row.type === 'salary' ? $t('user.salary') : $t('user.commission') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="billNo" :label="$t('user.bill')" width="120">
          <template #default="{ row }">
            {{ row.billNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="paymentTime" :label="$t('user.paymentTime')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.paymentTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="bdName" :label="$t('user.bdName')" width="100" />
        <el-table-column prop="bankAccount" :label="$t('user.bankAccount')" width="180" />
        <el-table-column prop="bankFlowNo" :label="$t('user.bankFlowNo')" width="150" />
        <el-table-column prop="amount" :label="$t('user.amount')" width="100">
          <template #default="{ row }">
            {{ currentDefaultCurrencySymbol }}{{ (row.amount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="note" :label="$t('user.remark')" min-width="120" />
        <el-table-column :label="$t('user.operation')" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleDeletePaymentRecord(row)">{{ $t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="paymentRecordsDialogVisible = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 新增打款记录对话框 -->
    <el-dialog
      v-model="addPaymentRecordDialogVisible"
      :title="$t('user.addPaymentRecord')"
      width="500px"
    >
      <el-form :model="paymentRecordForm" label-width="100px">
        <el-form-item :label="$t('user.bdName')">
          <el-input v-model="paymentRecordForm.bdName" disabled />
        </el-form-item>
        <el-form-item :label="$t('user.bankAccount')">
          <el-input v-model="paymentRecordForm.bankAccount" :placeholder="$t('user.bankAccountOptional')" />
        </el-form-item>
        <el-form-item :label="$t('user.bankFlowNo')">
          <el-input v-model="paymentRecordForm.bankFlowNo" :placeholder="$t('user.bankFlowNo')" />
        </el-form-item>
        <el-form-item :label="$t('user.amount')">
          <el-input-number v-model="paymentRecordForm.amount" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="$t('user.paymentTime')">
          <el-date-picker
            v-model="paymentRecordForm.paymentTime"
            type="datetime"
            :placeholder="$t('user.selectDate')"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item :label="$t('user.remark')">
          <el-input v-model="paymentRecordForm.note" type="textarea" :rows="2" :placeholder="$t('user.remark')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addPaymentRecordDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleAddPaymentRecord" :loading="addingPaymentRecord">{{ $t('common.confirm') }}</el-button>
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
const weekOptions = computed(() => [
  { value: 1, label: t('user.monday') },
  { value: 2, label: t('user.tuesday') },
  { value: 3, label: t('user.wednesday') },
  { value: 4, label: t('user.thursday') },
  { value: 5, label: t('user.friday') },
  { value: 6, label: t('user.saturday') },
  { value: 7, label: t('user.sunday') }
])

// 获取周几名称
const getWeekName = (day) => {
  const map = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
  return map[day] || day
}

const rules = {
  username: [
    { required: true, message: t('user.inputUsername') || t('common.input') + t('user.username'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('user.inputPassword') || t('common.input') + t('user.password'), trigger: 'blur' },
    { min: 6, message: t('user.pwdMinLength'), trigger: 'blur' }
  ],
  realName: [
    { required: true, message: t('user.inputRealName') || t('common.input') + t('user.realName'), trigger: 'blur' }
  ],
  phone: [
    { required: true, message: t('user.inputPhone') || t('common.input') + t('user.phone'), trigger: 'blur' }
  ],
  roleId: [
    { required: true, message: t('user.selectRole'), trigger: 'change' }
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
    ElMessage.error(t('user.loadFailed'))
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
    ElMessage.warning(t('user.inputBdName') || t('common.input') + t('user.bdName'))
    return
  }
  
  addingPaymentRecord.value = true
  try {
    // 薪水类型，不需要关联账单
    await request.post('/report-orders/bd-payment-records', {
      ...paymentRecordForm,
      type: 'salary'
    })
    ElMessage.success(t('user.addSuccess'))
    addPaymentRecordDialogVisible.value = false
    await loadPaymentRecords(paymentRecordForm.bdName)
  } catch (error) {
    console.error('Add payment record error:', error)
    ElMessage.error(error.response?.data?.message || t('user.addFailed'))
  } finally {
    addingPaymentRecord.value = false
  }
}

// 删除打款记录
const handleDeletePaymentRecord = async (row) => {
  try {
    await ElMessageBox.confirm(t('user.deleteConfirm'), t('user.confirmTitle'), {
      type: 'warning'
    })
    // 找到该记录在数组中的索引
    const idx = paymentRecords.value.findIndex(r => r.billId === row.billId && r.createdAt === row.createdAt)
    if (idx === -1) {
      ElMessage.error(t('user.deleteRecordNotFound'))
      return
    }
    await request.delete(`/report-orders/bd-payment-records/${row.billId}/${idx}`)
    ElMessage.success(t('user.deleteSuccess'))
    await loadPaymentRecords(row.bdName)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete payment record error:', error)
      ElMessage.error(error.response?.data?.message || t('user.deleteFailed'))
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
    ElMessage.error(t('user.pwdMismatch'))
    return
  }

  if (passwordResetForm.value.newPassword.length < 6) {
    ElMessage.error(t('user.pwdMinLength'))
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
      ElMessage.success(t('user.resetSuccess'))
      passwordResetDialogVisible.value = false
    } else {
      ElMessage.error(result.message || t('user.resetFailed'))
    }
  } catch (error) {
    ElMessage.error(t('user.resetFailed'))
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
        ElMessage.success(t('user.updateSuccess'))
      } else {
        await request.post('/users', data)
        ElMessage.success(t('user.createSuccess'))
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
    await ElMessageBox.confirm(t('user.confirmDeleteUser', { name: row.realName }), t('user.confirmTitle'), {
      type: 'warning'
    })
    await request.delete(`/users/${row._id}`)
    ElMessage.success(t('user.deleteSuccess'))
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

// 货币单位列表
const currencyList = ref([])

// 加载货币单位列表
const loadCurrencies = async () => {
  try {
    const res = await request.get('/base-data/list', { params: { type: 'priceUnit', limit: 100 } })
    currencyList.value = res.data || []
  } catch (error) {
    console.error('Load currencies error:', error)
    currencyList.value = []
  }
}

// 获取当前默认货币符号
const currentDefaultCurrencySymbol = computed(() => {
  const defaultCurrency = currencyList.value.find(c => c.isDefault)
  return defaultCurrency?.symbol || '¥'
})

onMounted(() => {
  loadUsers()
  loadRoles()
  loadDepartments()
  loadCurrencies()
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
