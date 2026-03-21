<template>
  <div class="bd-daily-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('bdDaily.title') }}</h3>
          <div class="header-actions">
            <el-button type="success" @click="showGenerateDialog" v-if="hasPermission('bd-daily:create')">
              <el-icon><MagicStick /></el-icon>
              {{ $t('bdDaily.generateStats') }}
            </el-button>
            <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('bd-daily:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('bdDaily.addRecord') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('bdDaily.dateRange')">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            :start-placeholder="$t('bdDaily.startDate')"
            :end-placeholder="$t('bdDaily.endDate')"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>

        <el-form-item label="BD">
          <el-input
            v-model="searchForm.salesman"
            :placeholder="$t('bdDaily.bdName')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadData">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        row-key="_id"
        class="bd-daily-table"
      >
        <el-table-column
          :label="$t('common.date')"
          width="120"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ formatDate(row.date) }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="BD"
          width="120"
          prop="salesman"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.salesman || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('bdDaily.sampleStats')"
          width="200"
        >
          <template #default="{ row }">
            <div class="stat-info">
              <div class="stat-value">{{ row.sampleCount || 0 }} {{ $t('bdDaily.items') }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('bdDaily.orderStats')"
          width="200"
        >
          <template #default="{ row }">
            <div class="stat-info">
              <div class="stat-value">{{ row.orderCount || 0 }} {{ $t('bdDaily.orders') }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('order.amount')"
          width="150"
          sortable
          prop="revenue"
        >
          <template #default="{ row }">
            <div class="stat-value highlight">฿{{ formatMoney(row.revenue || 0) }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="预估服务费"
          width="150"
          sortable
          prop="estimatedCommission"
        >
          <template #default="{ row }">
            <div class="stat-value">฿{{ formatMoney(row.estimatedCommission || 0) }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('bdDaily.commission')"
          width="150"
          sortable
          prop="commission"
        >
          <template #default="{ row }">
            <div class="stat-value">฿{{ formatMoney(row.commission || 0) }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="记录ID"
          width="250"
        >
          <template #default="{ row }">
            <el-tooltip v-if="row.sampleIds" :content="row.sampleIds" placement="top">
              <div class="truncate-text">样品: {{ truncateIds(row.sampleIds) }}</div>
            </el-tooltip>
            <div v-else class="truncate-text">样品: --</div>
            <el-tooltip v-if="row.revenueIds" :content="row.revenueIds" placement="top">
              <div class="truncate-text">订单: {{ truncateIds(row.revenueIds) }}</div>
            </el-tooltip>
            <div v-else class="truncate-text">订单: --</div>
          </template>
        </el-table-column>

        <el-table-column
          label="备注"
          width="200"
        >
          <template #default="{ row }">
            <el-tooltip v-if="row.remark" :content="row.remark" placement="top">
              <div class="truncate-text">{{ row.remark }}</div>
            </el-tooltip>
            <div v-else class="truncate-text">--</div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="editRecord(row)" v-if="hasPermission('bd-daily:update')">编辑</el-button>
            <el-button link type="danger" @click="deleteRecord(row)" v-if="hasPermission('bd-daily:delete')">删除</el-button>
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
        @size-change="loadData"
        @current-change="loadData"
        style="margin-top: 20px"
      />
    </el-card>

      <!-- 生成统计对话框 -->
      <el-dialog
        v-model="generateDialogVisible"
        title="生成BD每日统计"
        width="500px"
      >
        <el-form :model="generateForm" label-width="100px">
          <el-form-item label="选择日期">
            <el-date-picker
              v-model="generateForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-alert
            title="提示"
            type="info"
            :closable="false"
            style="margin-top: 10px"
          >
            1. 若无记录则新增，有记录则更新
            <br>
            2. 支持单天或日期范围生成
          </el-alert>
        </el-form>
        <template #footer>
          <el-button @click="generateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleGenerate" :loading="generating">
            生成统计
          </el-button>
        </template>
      </el-dialog>

      <!-- 生成结果对话框 -->
      <el-dialog
        v-model="resultDialogVisible"
        title="生成结果"
        width="600px"
      >
        <div v-if="generateResult">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="总处理天数">{{ generateResult.totalDays }}</el-descriptions-item>
            <el-descriptions-item label="新建记录">{{ generateResult.createdCount }} 条</el-descriptions-item>
            <el-descriptions-item label="更新记录">{{ generateResult.updatedCount }} 条</el-descriptions-item>
            <el-descriptions-item label="涉及BD">{{ generateResult.bdCount }} 个</el-descriptions-item>
          </el-descriptions>

          <div v-if="generateResult.details && generateResult.details.length > 0" style="margin-top: 20px">
            <h4>详细信息：</h4>
            <el-table :data="generateResult.details" max-height="300" border>
              <el-table-column label="BD" prop="salesman" width="120" />
              <el-table-column label="操作" prop="action" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.action === 'created' ? 'success' : 'warning'" size="small">
                    {{ row.action === 'created' ? '新增' : '更新' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="申样数" prop="sampleCount" width="80" />
              <el-table-column label="订单数" prop="orderCount" width="80" />
              <el-table-column label="收入" prop="revenue" width="100">
                <template #default="{ row }">฿{{ formatMoney(row.revenue || 0) }}</template>
              </el-table-column>
              <el-table-column label="预估服务费" prop="estimatedCommission" width="100">
                <template #default="{ row }">฿{{ formatMoney(row.estimatedCommission || 0) }}</template>
              </el-table-column>
              <el-table-column label="结算佣金" prop="commission" width="100">
                <template #default="{ row }">฿{{ formatMoney(row.commission || 0) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <template #footer>
          <el-button type="primary" @click="resultDialogVisible = false">确定</el-button>
        </template>
      </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑记录' : '新增记录'"
      width="600px"
    >
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日期" prop="date">
              <el-date-picker
                v-model="form.date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="BD" prop="salesman">
              <el-input v-model="form.salesman" placeholder="BD姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="申样数">
              <el-input-number v-model="form.sampleCount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订单数">
              <el-input-number v-model="form.orderCount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="成交金额">
              <el-input-number v-model="form.revenue" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预估服务费">
              <el-input-number v-model="form.estimatedCommission" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结算佣金">
              <el-input-number v-model="form.commission" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="申样记录ID">
          <el-input
            v-model="form.sampleIds"
            type="textarea"
            :rows="2"
            placeholder="样品记录ID，逗号分隔"
          />
        </el-form-item>

        <el-form-item label="收入记录ID">
          <el-input
            v-model="form.revenueIds"
            type="textarea"
            :rows="2"
            placeholder="订单记录ID，逗号分隔"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Plus, MagicStick } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

// 权限检查
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const generating = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const generateDialogVisible = ref(false)
const resultDialogVisible = ref(false)
const isEdit = ref(false)
const tableData = ref([])
const formRef = ref(null)
const dateRange = ref([])

const searchForm = reactive({
  salesman: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  _id: '',
  date: '',
  salesman: '',
  sampleCount: 0,
  orderCount: 0,
  revenue: 0,
  estimatedCommission: 0,
  commission: 0,
  sampleSentCount: 0,
  orderGeneratedCount: 0,
  sampleIds: '',
  revenueIds: '',
  remark: ''
})

const generateForm = reactive({
  dateRange: []
})

const generateResult = ref(null)

const rules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  salesman: [{ required: true, message: '请输入BD姓名', trigger: 'blur' }]
}

const formatDate = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatMoney = (value) => {
  if (!value) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const truncateIds = (ids) => {
  if (!ids) return '--'
  const idArray = ids.split(',')
  if (idArray.length <= 2) return ids
  return `${idArray[0]}, ${idArray[1]}... 等 ${idArray.length} 条`
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await request.get('/bd-daily', { params })
    console.log('[BD Daily] API 返回数据:', res.bdDailies.length, '条')
    console.log('[BD Daily] 数据详情:', res.bdDailies)
    console.log('[BD Daily] 数据的_id列表:', res.bdDailies.map(r => r._id))
    tableData.value = res.bdDailies
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { salesman: '' })
  dateRange.value = []
  pagination.page = 1
  loadData()
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(form, {
    _id: '',
    date: '',
    salesman: '',
    sampleCount: 0,
    orderCount: 0,
    revenue: 0,
    commission: 0,
    orderGeneratedCount: 0,
    sampleIds: '',
    revenueIds: '',
    remark: ''
  })
  dialogVisible.value = true
}

const showGenerateDialog = () => {
  Object.assign(generateForm, { dateRange: [] })
  generateDialogVisible.value = true
}

const editRecord = (row) => {
  isEdit.value = true
  Object.assign(form, { ...row })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (isEdit.value) {
        await request.put(`/bd-daily/${form._id}`, form)
        ElMessage.success('更新成功')
      } else {
        await request.post('/bd-daily', form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadData()
    } catch (error) {
      console.error('Submit error:', error)
      ElMessage.error(error.response?.data?.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleGenerate = async () => {
  if (!generateForm.dateRange || generateForm.dateRange.length === 0) {
    ElMessage.warning('请选择日期范围')
    return
  }

  generating.value = true
  try {
    const [startDate, endDate] = generateForm.dateRange

    // 如果是单日，直接调用单日生成
    if (startDate === endDate) {
      const res = await request.post('/bd-daily/generate', { date: startDate })
      generateResult.value = {
        totalDays: 1,
        createdCount: res.results.filter(r => r.action === 'created').length,
        updatedCount: res.results.filter(r => r.action === 'updated').length,
        bdCount: res.results.length,
        details: res.results.map(r => ({
          salesman: r.data.salesman,
          action: r.action,
          sampleCount: r.data.sampleCount,
          orderCount: r.data.orderCount,
          revenue: r.data.revenue,
          commission: r.data.commission
        }))
      }
    } else {
      // 多日生成，循环调用
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = []
      let createdCount = 0
      let updatedCount = 0
      const allDetails = []

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        days.push(dateStr)
        const res = await request.post('/bd-daily/generate', { date: dateStr })
        createdCount += res.results.filter(r => r.action === 'created').length
        updatedCount += res.results.filter(r => r.action === 'updated').length
        allDetails.push(...res.results.map(r => ({
          date: dateStr,
          salesman: r.data.salesman,
          action: r.action,
          sampleCount: r.data.sampleCount,
          orderCount: r.data.orderCount,
          revenue: r.data.revenue,
          commission: r.data.commission
        })))
      }

      generateResult.value = {
        totalDays: days.length,
        createdCount,
        updatedCount,
        bdCount: new Set(allDetails.map(d => d.salesman)).size,
        details: allDetails
      }
    }

    // 根据日期范围更新搜索条件
    if (generateForm.dateRange.length === 2) {
      const [start, end] = generateForm.dateRange
      if (start === end) {
        // 单日，设置当天日期
        dateRange.value = [start, end]
      } else {
        // 范围，设置范围
        dateRange.value = [start, end]
      }
    }

    pagination.page = 1
    await loadData()

    generateDialogVisible.value = false
    resultDialogVisible.value = true
  } catch (error) {
    console.error('Generate error:', error)
    ElMessage.error(error.response?.data?.message || '生成统计失败')
  } finally {
    generating.value = false
  }
}

const deleteRecord = async (row) => {
  await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
    type: 'warning'
  })

  try {
    await request.delete(`/bd-daily/${row._id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    console.error('Delete error:', error)
    ElMessage.error('删除失败')
  }
}

watch(tableData, (newVal) => {
  console.log('[BD Daily] tableData 变化:', newVal.length, '条')
}, { deep: true })

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.bd-daily-page {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background: #faf5ff;
  border-radius: 8px;
  border: 1px solid #e8e4ef;
}

/* 表格样式优化 */
.bd-daily-table {
  border-radius: 8px;
  overflow: hidden;
}

.bd-daily-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
}

.bd-daily-table :deep(.el-table__header th) {
  background: transparent;
  color: #4a148c;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 2px solid #ce93d8;
}

.bd-daily-table :deep(.el-table__body tr:hover > td) {
  background: #f3e5f5 !important;
}

.column-text {
  font-size: 13px;
  color: #303133;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #6a1b9a;
}

.stat-value.highlight {
  font-size: 15px;
  color: #7b1fa2;
}

.stat-detail {
  display: flex;
  gap: 6px;
}

.truncate-text {
  font-size: 12px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.el-button + .el-button {
  margin-left: 8px;
}

/* 对话框样式 */
.el-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%);
  padding: 16px 20px;
}

.el-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

.el-form-item :deep(.el-form-item__label) {
  color: #595959;
  font-weight: 500;
}
</style>
