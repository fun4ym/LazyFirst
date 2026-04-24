<template>
  <div class="commission-rules-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('menu.commissionRules') }}</h3>
          <el-button type="primary" @click="showAddCategory" v-if="hasPermission('commissions:btn-add-category')">
            <el-icon><Plus /></el-icon>
            {{ $t('commission.addCategory') }}
          </el-button>
        </div>
      </template>

      <!-- 部门抽点规则列表 -->
      <div v-for="dept in departmentRules" :key="dept.deptId" class="dept-section">
        <div class="dept-header">
          <h4>{{ dept.deptName }}</h4>
          <el-button link type="primary" @click="addRule(dept.deptId)" v-if="hasPermission('commissions:btn-add-rule')">
            <el-icon><Plus /></el-icon>
            {{ $t('commission.addRule') }}
          </el-button>
        </div>

        <el-table :data="dept.rules" border style="margin-top: 10px">
          <el-table-column prop="rangeStart" :label="$t('commission.rangeStart')" width="130">
            <template #default="{ row }">
              {{ currentDefaultCurrencySymbol }}{{ formatMoney(row.rangeStart) }}
            </template>
          </el-table-column>
          <el-table-column prop="rangeEnd" :label="$t('commission.rangeEnd')" width="130">
            <template #default="{ row }">
              {{ row.rangeEnd ? currentDefaultCurrencySymbol + formatMoney(row.rangeEnd) : $t('commission.above') }}
            </template>
          </el-table-column>
          <el-table-column prop="commissionRate" :label="$t('commission.commissionRate')" width="120">
            <template #default="{ row }">
              {{ (row.commissionRate * 100).toFixed(2) }}%
            </template>
          </el-table-column>
          <el-table-column prop="commissionType" :label="$t('commission.type')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.commissionType === 'fixed' ? 'primary' : 'success'">
                {{ row.commissionType === 'fixed' ? $t('commission.fixed') : $t('commission.tiered') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" :label="$t('common.createTime')" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.actions')" width="100">
            <template #default="{ row }">
              <el-button link type="danger" @click="deleteRule(dept.deptId, row._id)" v-if="hasPermission('commissions:btn-delete')">
                {{ $t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 保存按钮 -->
      <div class="save-actions" style="margin-top: 20px">
        <el-button type="primary" @click="saveAll" :loading="saving" v-if="hasPermission('commissions:btn-save')">
          <el-icon><Check /></el-icon>
          {{ $t('commission.saveConfig') }}
        </el-button>
      </div>
    </el-card>

    <!-- 添加部门类别对话框 -->
    <el-dialog
      v-model="addCategoryDialogVisible"
      title="添加部门类别"
      width="500px"
    >
      <el-form :model="categoryForm" label-width="100px">
        <el-form-item label="部门名称">
          <el-select v-model="categoryForm.deptId" placeholder="选择部门" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept._id"
              :label="dept.name"
              :value="dept._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addCategoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddCategory">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加规则对话框 -->
    <el-dialog
      v-model="addRuleDialogVisible"
      title="添加抽点规则"
      width="600px"
    >
      <el-form :model="ruleForm" :rules="ruleRules" ref="ruleFormRef" label-width="120px">
        <el-form-item label="抽成范围起始" prop="rangeStart">
          <el-input-number
            v-model="ruleForm.rangeStart"
            :min="0"
            :precision="2"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="抽成范围结束" prop="rangeEnd">
          <el-input-number
            v-model="ruleForm.rangeEnd"
            :min="0"
            :precision="2"
            :step="100"
            style="width: 100%"
            placeholder="留空表示无上限"
          />
        </el-form-item>

        <el-form-item label="抽成点数" prop="commissionRate">
          <el-input-number
            v-model="ruleForm.commissionRate"
            :min="0"
            :max="1"
            :precision="4"
            :step="0.01"
            style="width: 100%"
          />
          <span style="margin-left: 10px; color: #999;">(0-1之间的小数，如 0.08 表示 8%)</span>
        </el-form-item>

        <el-form-item label="抽点类型" prop="commissionType">
          <el-radio-group v-model="ruleForm.commissionType">
            <el-radio value="fixed">固定比例</el-radio>
            <el-radio value="tiered">阶梯比例</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addRuleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddRule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Plus, Check } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

const saving = ref(false)
const addCategoryDialogVisible = ref(false)
const addRuleDialogVisible = ref(false)
const ruleFormRef = ref(null)
const departments = ref([])
const departmentRules = ref([])

const categoryForm = reactive({
  deptId: ''
})

const ruleForm = reactive({
  deptId: '',
  rangeStart: 0,
  rangeEnd: null,
  commissionRate: 0,
  commissionType: 'fixed'
})

const ruleRules = {
  rangeStart: [
    { required: true, message: t('commission.rangeStart') + t('common.required'), trigger: 'blur' }
  ],
  commissionRate: [
    { required: true, message: t('commission.commissionRate') + t('common.required'), trigger: 'blur' }
  ]
}

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadDepartments = async () => {
  try {
    const res = await request.get('/departments', { params: { limit: 1000 } })
    departments.value = res.departments
  } catch (error) {
    console.error('Load departments error:', error)
  }
}

const loadRules = async () => {
  try {
    const res = await request.get('/commission-rules')
    departmentRules.value = res.rules || []
  } catch (error) {
    console.error('Load rules error:', error)
  }
}

const showAddCategory = () => {
  Object.assign(categoryForm, { deptId: '' })
  addCategoryDialogVisible.value = true
}

const handleAddCategory = async () => {
  if (!categoryForm.deptId) {
    ElMessage.warning(t('commission.selectDepartment'))
    return
  }

  const dept = departments.value.find(d => d._id === categoryForm.deptId)
  if (departmentRules.value.find(r => r.deptId === categoryForm.deptId)) {
    ElMessage.warning(t('commission.departmentExists'))
    return
  }

  departmentRules.value.push({
    deptId: categoryForm.deptId,
    deptName: dept?.name,
    rules: []
  })

  addCategoryDialogVisible.value = false
  ElMessage.success(t('commission.addSuccess'))
}

const addRule = (deptId) => {
  Object.assign(ruleForm, {
    deptId,
    rangeStart: 0,
    rangeEnd: null,
    commissionRate: 0,
    commissionType: 'fixed'
  })
  addRuleDialogVisible.value = true
}

const handleAddRule = async () => {
  if (!ruleFormRef.value) return

  await ruleFormRef.value.validate(async (valid) => {
    if (!valid) return

    const deptIndex = departmentRules.value.findIndex(r => r.deptId === ruleForm.deptId)
    if (deptIndex === -1) {
      ElMessage.error(t('commission.departmentNotFound'))
      return
    }

    departmentRules.value[deptIndex].rules.push({
      _id: Date.now().toString(),
      rangeStart: ruleForm.rangeStart,
      rangeEnd: ruleForm.rangeEnd,
      commissionRate: ruleForm.commissionRate,
      commissionType: ruleForm.commissionType,
      createdAt: new Date()
    })

    addRuleDialogVisible.value = false
    ElMessage.success(t('commission.addSuccess'))
  })
}

const deleteRule = async (deptId, ruleId) => {
  try {
    await ElMessageBox.confirm(t('commission.confirmDeleteRule'), t('common.confirm'), {
      type: 'warning'
    })

    const deptIndex = departmentRules.value.findIndex(r => r.deptId === deptId)
    if (deptIndex !== -1) {
      const ruleIndex = departmentRules.value[deptIndex].rules.findIndex(r => r._id === ruleId)
      if (ruleIndex !== -1) {
        departmentRules.value[deptIndex].rules.splice(ruleIndex, 1)
        ElMessage.success(t('common.deleteSuccess'))
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

const saveAll = async () => {
  saving.value = true
  try {
    await request.post('/commission-rules/save', {
      rules: departmentRules.value
    })
    ElMessage.success(t('commission.saveSuccess'))
  } catch (error) {
    console.error('Save error:', error)
    ElMessage.error(t('commission.saveFailed'))
  } finally {
    saving.value = false
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
  return defaultCurrency?.symbol || '฿'
})

onMounted(() => {
  loadDepartments()
  loadRules()
  loadCurrencies()
})
</script>

<style scoped>
.commission-rules-page {
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

.dept-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #faf5ff;
  border-radius: 4px;
  border: 1px solid #e8e4ef;
}

.dept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #7b1fa2;
}

.dept-header h4 {
  margin: 0;
  font-size: 16px;
  color: #7b1fa2;
  font-weight: 600;
}

.save-actions {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid #e8e8e8;
}
</style>
