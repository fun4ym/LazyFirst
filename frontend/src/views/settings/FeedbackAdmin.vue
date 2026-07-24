<template>
  <div class="feedback-admin">
    <el-card>
      <template #header>
        <div class="header">
          <span>意见反馈 / Feedback</span>
          <el-radio-group v-model="statusFilter" @change="load">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="pending">待回复</el-radio-button>
            <el-radio-button value="replied">已回复</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="达人" width="170">
          <template #default="{ row }">
            <div>{{ row.influencerId?.nickname || '-' }}</div>
            <div style="color: #999; font-size: 12px">{{ row.influencerId?.ttId || '' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="反馈内容" min-width="240" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'replied' ? 'success' : 'warning'">
              {{ row.status === 'replied' ? '已回复' : '待回复' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openReply(row)">回复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="(p) => { page = p; load() }"
        style="margin-top: 16px; justify-content: flex-end"
      />
    </el-card>

    <el-dialog v-model="replyVisible" title="回复反馈" width="520px">
      <div v-if="current" class="reply-origin">
        <div class="reply-label">原反馈：</div>
        <div class="reply-content">{{ current.content }}</div>
        <div v-if="current.reply" class="reply-old">历史回复：{{ current.reply }}</div>
      </div>
      <el-input v-model="replyText" type="textarea" :rows="4" placeholder="输入回复内容..." />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="replying" @click="submitReply">发送并推送 LINE</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const statusFilter = ref('all')

const replyVisible = ref(false)
const current = ref(null)
const replyText = ref('')
const replying = ref(false)

const load = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    const res = await request.get('/feedback', { params })
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const openReply = (row) => {
  current.value = row
  replyText.value = row.reply || ''
  replyVisible.value = true
}

const submitReply = async () => {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  replying.value = true
  try {
    const res = await request.put(`/feedback/${current.value._id}/reply`, { reply: replyText.value })
    if (res.success) {
      ElMessage.success('已回复并推送 LINE')
      replyVisible.value = false
      load()
    } else {
      ElMessage.error(res.message || '回复失败')
    }
  } catch (e) {
    ElMessage.error('回复失败')
  } finally {
    replying.value = false
  }
}

const formatTime = (t) => {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(load)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.reply-origin {
  background: #f7f4fb;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.reply-label {
  color: #999;
  font-size: 12px;
  margin-bottom: 4px;
}
.reply-content {
  white-space: pre-wrap;
}
.reply-old {
  margin-top: 8px;
  color: #775999;
  font-size: 13px;
}
</style>
