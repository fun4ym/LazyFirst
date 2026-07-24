<template>
  <div class="feedback-page">
    <el-card class="feedback-card">
      <template #header>
        <div class="feedback-header">
          <h2>💬 意见反馈 / Feedback</h2>
          <p>LazyFirst 官方 LINE · 达人专属反馈通道</p>
        </div>
      </template>

      <el-alert
        v-if="!token"
        type="error"
        :closable="false"
        title="无效访问"
        description="缺少反馈令牌，请从 LINE 内点击进入。"
      />

      <template v-else>
        <div v-if="submitted" class="feedback-done">
          <el-result icon="success" title="提交成功" sub-title="我们已收到您的反馈，会通过 LINE 回复您。" />
        </div>
        <el-form v-else>
          <el-form-item>
            <el-input
              v-model="content"
              type="textarea"
              :rows="6"
              maxlength="1000"
              show-word-limit
              placeholder="请输入您的意见或问题..."
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="submit">提交反馈 / Send</el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const token = ref('')
const content = ref('')
const loading = ref(false)
const submitted = ref(false)

onMounted(() => {
  token.value = route.query.t || ''
})

const submit = async () => {
  if (!content.value.trim()) {
    ElMessage.warning('请输入反馈内容')
    return
  }
  loading.value = true
  try {
    const res = await request.post('/feedback', { token: token.value, content: content.value })
    if (res.success) {
      submitted.value = true
      ElMessage.success('提交成功')
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch (e) {
    ElMessage.error('提交失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.feedback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3f8;
  padding: 20px;
}
.feedback-card {
  width: 100%;
  max-width: 520px;
}
.feedback-header h2 {
  margin: 0 0 4px;
  color: #775999;
}
.feedback-header p {
  margin: 0;
  color: #999;
  font-size: 13px;
}
.feedback-done {
  padding: 20px 0;
}
</style>
