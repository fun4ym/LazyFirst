<template>
  <div class="commissions-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('commission.commissionManagement') }}</h3>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ $t('commission.totalCommission') }}</div>
            <div class="stat-value">{{ currentDefaultCurrencySymbol }}{{ formatMoney(statistics.totalCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ $t('commission.pendingCommission') }}</div>
            <div class="stat-value pending">{{ currentDefaultCurrencySymbol }}{{ formatMoney(statistics.pendingCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ $t('commission.paidCommission') }}</div>
            <div class="stat-value paid">{{ currentDefaultCurrencySymbol }}{{ formatMoney(statistics.paidCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">{{ $t('commission.settledCommission') }}</div>
            <div class="stat-value settled">{{ currentDefaultCurrencySymbol }}{{ formatMoney(statistics.settledCommission || 0) }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('common.status')">
          <el-select v-model="searchForm.status" :placeholder="$t('common.all')" clearable>
            <el-option :label="$t('commission.pendingCommission')" value="pending" />
            <el-option :label="$t('commission.paidCommission')" value="paid" />
            <el-option :label="$t('commission.settledCommission')" value="settled" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('commission.bd')">
          <el-select v-model="searchForm.bdId" :placeholder="$t('commission.allBD')" clearable filterable>
            <el-option
              v-for="user in users"
              :key="user._id"
              :label="user.realName"
              :value="user._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadCommissions">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="commissions" v-loading="loading" stripe>
        <el-table-column prop="bdId.realName" :label="$t('commission.bdName')" width="100" />
        <el-table-column prop="influencerId.tiktokInfo.displayName" :label="$t('commission.influencerName')" width="150" />
        <el-table-column prop="orderId.orderNo" :label="$t('commission.orderNo')" width="180" />
        <el-table-column prop="orderAmount" :label="$t('commission.orderAmount')" width="120">
          <template #default="{ row }">
            {{ currentDefaultCurrencySymbol }}{{ formatMoney(row.orderAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" :label="$t('commission.commissionRate')" width="100">
          <template #default="{ row }">
            {{ (row.commissionRate * 100).toFixed(0) }}%
          </template>
        </el-table-column>
        <el-table-column prop="commissionAmount" :label="$t('commission.commissionAmount')" width="120">
          <template #default="{ row }">
            {{ currentDefaultCurrencySymbol }}{{ formatMoney(row.commissionAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="calculatedDate" :label="$t('commission.calculatedDate')" width="120">
          <template #default="{ row }">
            {{ formatDate(row.calculatedDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="$t('commission.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
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
        @size-change="loadCommissions"
        @current-change="loadCommissions"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import request from '@/utils/request'

const loading = ref(false)
const commissions = ref([])
const users = ref([])

const statistics = ref({
  totalCommission: 0,
  pendingCommission: 0,
  paidCommission: 0,
  settledCommission: 0
})

const searchForm = reactive({
  status: '',
  bdId: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    paid: 'primary',
    settled: 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: t('commission.statusPending'),
    paid: t('commission.statusPaid'),
    settled: t('commission.statusSettled')
  }
  return texts[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const loadCommissions = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/commissions', { params })
    commissions.value = res.commissions
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load commissions error:', error)
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  if (!AuthManager.hasPermission('users:read')) {
    console.log('无users:read权限，跳过加载用户')
    return
  }
  try {
    const res = await request.get('/users', { params: { limit: 1000 } })
    users.value = res.users
  } catch (error) {
    console.error('Load users error:', error)
  }
}

const resetSearch = () => {
  Object.assign(searchForm, { status: '', bdId: '' })
  pagination.page = 1
  loadCommissions()
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
  loadCommissions()
  loadUsers()
  loadCurrencies()
})
</script>

<style scoped>
.commissions-page {
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

.stat-card {
  background: linear-gradient(135deg, #f67d12 0%, #f99c3f 100%);
  color: white;
  padding: 20px;
  border-radius: 2px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 500;
}

.stat-value.pending { background: #f67d12; }
.stat-value.paid { background: #f99c3f; }
.stat-value.settled { background: #ffb86d; }

.search-form {
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
}
</style>
