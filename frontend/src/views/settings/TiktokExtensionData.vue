<template>
  <div class="tiktok-extension-data-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>TikTok扩展数据采集</h3>
          <span class="header-tip">管理Chrome插件采集的TikTok达人数据，并同步到系统</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="TikTok ID/昵称"
            clearable
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item label="同步状态">
          <el-select v-model="searchForm.synced" placeholder="全部" clearable style="width: 120px;">
            <el-option label="未同步" :value="false" />
            <el-option label="已同步" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item label="采集日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button
          type="primary"
          :disabled="selectedIds.length === 0"
          @click="handleBatchSync"
        >
          批量同步 ({{ selectedIds.length }})
        </el-button>
        <el-button
          type="success"
          :disabled="selectedIds.length === 0"
          @click="handleBatchDelete"
        >
          批量删除
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="dataList"
        stripe
        border
        size="small"
        @selection-change="handleSelectionChange"
        style="width: 100%; margin-top: 15px;"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="tiktokId" label="TikTok ID" width="150" />
        <el-table-column prop="tiktokName" label="昵称" width="150" />
        <el-table-column prop="followerCount" label="粉丝数" width="100" align="right" />
        <el-table-column prop="estimatedGmv" label="预估GMV" width="120" align="right" />
        <el-table-column prop="monthlySalesCount" label="月销件数" width="100" align="right" />
        <el-table-column prop="collectedAt" label="采集时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.collectedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="synced" label="同步状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.synced" type="success" size="small">已同步</el-tag>
            <el-tag v-else type="warning" size="small">未同步</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="syncedAt" label="同步时间" width="160">
          <template #default="{ row }">
            {{ row.syncedAt ? formatDateTime(row.syncedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.synced"
              type="primary"
              size="small"
              @click="handleSync(row)"
            >
              同步
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToken } from '@/utils/auth'

// 搜索表单
const searchForm = reactive({
  keyword: '',
  synced: '',
  dateRange: []
})

// 数据列表
const dataList = ref([])
const loading = ref(false)
const selectedIds = ref([])

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取API地址（使用相对路径 /api，本地经vite代理、生产经nginx代理到后端）
const getApiUrl = () => {
  return '/api'
}

// 获取数据列表
const fetchDataList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword || undefined,
      synced: searchForm.synced !== '' ? searchForm.synced : undefined,
      startDate: searchForm.dateRange && searchForm.dateRange[0] ? searchForm.dateRange[0].toISOString() : undefined,
      endDate: searchForm.dateRange && searchForm.dateRange[1] ? searchForm.dateRange[1].toISOString() : undefined
    }

    const response = await fetch(`${getApiUrl()}/tiktok-extension-data?${new URLSearchParams(params)}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })

    const result = await response.json()

    if (result.success) {
      dataList.value = result.data.dataList
      pagination.total = result.data.pagination.total
      pagination.page = result.data.pagination.page
      pagination.limit = result.data.pagination.limit
    } else {
      ElMessage.error(result.message || '获取数据失败')
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    ElMessage.error('获取数据失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchDataList()
}

// 重置搜索
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.synced = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchDataList()
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item._id)
}

// 同步单条数据
const handleSync = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要同步 "${row.tiktokId}" 到达人管理系统吗？`,
      '确认同步',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${row._id}/sync`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('同步成功')
      fetchDataList()
    } else {
      ElMessage.error(result.message || '同步失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('同步失败:', error)
      ElMessage.error('同步失败：' + error.message)
    }
  }
}

// 批量同步
const handleBatchSync = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要同步的数据')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要同步选中的 ${selectedIds.value.length} 条数据吗？`,
      '确认批量同步',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/batch-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: selectedIds.value })
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success(result.message || '批量同步完成')
      selectedIds.value = []
      fetchDataList()
    } else {
      ElMessage.error(result.message || '批量同步失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量同步失败:', error)
      ElMessage.error('批量同步失败：' + error.message)
    }
  }
}

// 删除单条数据
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 "${row.tiktokId}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${row._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('删除成功')
      fetchDataList()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的数据')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 条数据吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 逐条删除
    let successCount = 0
    let failCount = 0

    for (const id of selectedIds.value) {
      try {
        const response = await fetch(`${getApiUrl()}/tiktok-extension-data/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        })

        const result = await response.json()

        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }
    }

    ElMessage.success(`删除完成：成功 ${successCount}，失败 ${failCount}`)
    selectedIds.value = []
    fetchDataList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败：' + error.message)
    }
  }
}

// 分页大小变化
const handleSizeChange = (val) => {
  pagination.limit = val
  pagination.page = 1
  fetchDataList()
}

// 页码变化
const handlePageChange = (val) => {
  pagination.page = val
  fetchDataList()
}

// 初始化
onMounted(() => {
  fetchDataList()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.page-header h3 {
  margin: 0;
  font-size: 18px;
}

.header-tip {
  color: #909399;
  font-size: 14px;
}

.search-form {
  margin-bottom: 15px;
}

.action-bar {
  margin-bottom: 15px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}
</style>
