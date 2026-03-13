<template>
  <div class="commissions-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>分润管理</h3>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">总分润</div>
            <div class="stat-value">฿{{ formatMoney(statistics.totalCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">待结算</div>
            <div class="stat-value pending">฿{{ formatMoney(statistics.pendingCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已支付</div>
            <div class="stat-value paid">฿{{ formatMoney(statistics.paidCommission || 0) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-label">已结算</div>
            <div class="stat-value settled">฿{{ formatMoney(statistics.settledCommission || 0) }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待结算" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="已结算" value="settled" />
          </el-select>
        </el-form-item>

        <el-form-item label="BD">
          <el-select v-model="searchForm.bdId" placeholder="全部BD" clearable filterable>
            <el-option
              v-for="user in users"
              :key="user._id"
              :label="user.realName"
              :value="user._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadCommissions">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="commissions" v-loading="loading" stripe>
        <el-table-column prop="bdId.realName" label="BD姓名" width="100" />
        <el-table-column prop="influencerId.tiktokInfo.displayName" label="达人名称" width="150" />
        <el-table-column prop="orderId.orderNo" label="订单号" width="180" />
        <el-table-column prop="orderAmount" label="订单金额" width="120">
          <template #default="{ row }">
            ¥{{ formatMoney(row.orderAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="commissionRate" label="分润比例" width="100">
          <template #default="{ row }">
            {{ (row.commissionRate * 100).toFixed(0) }}%
          </template>
        </el-table-column>
        <el-table-column prop="commissionAmount" label="分润金额" width="120">
          <template #default="{ row }">
            ฿{{ formatMoney(row.commissionAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="calculatedDate" label="计算日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.calculatedDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
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
import { ref, reactive, onMounted } from 'vue'
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
    pending: '待结算',
    paid: '已支付',
    settled: '已结算'
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

onMounted(() => {
  loadCommissions()
  loadUsers()
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
