<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('line.bindingDialogTitle')"
    width="460px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <div v-loading="loading" class="line-binding-body">
      <div class="target-name">
        <span class="label">{{ roleLabel }}：</span>
        <strong>{{ targetName }}</strong>
      </div>

      <el-tag v-if="status.bound" type="success" effect="light" class="status-tag">
        {{ $t('line.bound') }}
      </el-tag>
      <el-tag v-else type="info" effect="light" class="status-tag">
        {{ $t('line.unbound') }}
      </el-tag>

      <div v-if="token" class="code-box">
        <div class="code-title">{{ $t('line.yourCode') }}</div>
        <div class="code-value">{{ token }}</div>
        <el-button size="small" type="primary" plain @click="copyCode">{{ $t('line.copyCode') }}</el-button>
      </div>

      <!-- 邀请文案卡片：一键复制给达人/卖家 -->
      <div v-if="token" class="invite-card">
        <div class="invite-header">
          <el-icon><Promotion /></el-icon>
          <span>Invite via Chat</span>
        </div>
        <div class="invite-preview">{{ inviteText }}</div>
        <el-button size="small" type="success" @click="copyInviteText">
          <el-icon><CopyDocument /></el-icon>
          Copy Invite Text
        </el-button>
      </div>

      <el-alert type="info" :closable="false" show-icon class="tips">
        <template #default>
          <div>{{ $t('line.bindingStep1') }}</div>
          <div>{{ $t('line.bindingStep2') }}</div>
        </template>
      </el-alert>

      <div v-if="addFriendUrl" class="friend-link">
        <el-button size="small" @click="copyFriendLink">{{ $t('line.copyFriendLink') }}</el-button>
        <a :href="addFriendUrl" target="_blank" class="link-text">{{ addFriendUrl }}</a>
      </div>
    </div>

    <template #footer>
      <el-button v-if="status.bound" type="danger" plain @click="handleUnbind">{{ $t('line.unbind') }}</el-button>
      <el-button type="primary" :loading="generating" @click="handleGenerate">
        {{ token ? $t('line.regenerate') : $t('line.generateCode') }}
      </el-button>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Promotion } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  role: { type: String, default: 'influencer' }, // influencer | shopContact
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'bound-changed'])

const { t } = useI18n()

const loading = ref(false)
const generating = ref(false)
const token = ref('')
const addFriendUrl = ref('')
const status = reactive({ bound: false, lineBindingToken: '' })

const roleLabel = computed(() => props.role === 'influencer' ? t('line.roleInfluencer') : t('line.roleSeller'))

const inviteText = computed(() => {
  const friendLink = addFriendUrl.value || 'https://line.me/R/ti/p/@380xfxno'
  const namePart = props.targetName ? `Hi ${props.targetName},\n` : ''
  const roleHint = props.role === 'influencer'
    ? 'As a creator, you can browse products and request samples.'
    : 'As a seller, you can review sample requests and manage products.'
  return [
    '📲 Join LazyFirst on LINE!',
    '',
    namePart + 'Add our LINE OA and send your binding code to get started:',
    '',
    '👉 ' + friendLink,
    '',
    'Your binding code: ' + token.value,
    '(Copy and paste it in LINE chat after adding)',
    '',
    roleHint
  ].filter(Boolean).join('\n')
})

const handleOpen = async () => {
  token.value = ''
  await fetchStatus()
}

const fetchStatus = async () => {
  if (!props.targetId) return
  loading.value = true
  try {
    const res = await request.get('/line/binding-status', {
      params: { role: props.role, id: props.targetId }
    })
    status.bound = !!res.bound
    status.lineBindingToken = res.lineBindingToken || ''
    if (res.lineBindingToken) token.value = res.lineBindingToken
  } catch (e) {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const handleGenerate = async () => {
  generating.value = true
  try {
    const res = await request.post('/line/binding-code', {
      role: props.role,
      id: props.targetId
    })
    token.value = res.token || ''
    addFriendUrl.value = (res.link && res.link.addFriendUrl) || ''
    ElMessage.success(t('line.codeGenerated'))
  } catch (e) {
    // 拦截器已提示
  } finally {
    generating.value = false
  }
}

const handleUnbind = async () => {
  try {
    await ElMessageBox.confirm(t('line.unbindConfirm'), t('line.tip'), { type: 'warning' })
  } catch (e) {
    return
  }
  try {
    await request.post('/line/unbind', { role: props.role, id: props.targetId })
    ElMessage.success(t('line.unbindSuccess'))
    status.bound = false
    token.value = ''
    emit('bound-changed')
  } catch (e) {
    // 拦截器已提示
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(token.value)
    ElMessage.success(t('line.copied'))
  } catch (e) {
    ElMessage.warning(token.value)
  }
}

const copyFriendLink = async () => {
  try {
    await navigator.clipboard.writeText(addFriendUrl.value)
    ElMessage.success(t('line.copied'))
  } catch (e) {
    ElMessage.warning(addFriendUrl.value)
  }
}

const copyInviteText = async () => {
  try {
    await navigator.clipboard.writeText(inviteText.value)
    ElMessage.success('Invite text copied! You can now paste it in WhatsApp / Messenger / TikTok DM.')
  } catch (e) {
    ElMessage.warning('Copy failed, please select and copy manually')
  }
}
</script>

<style scoped>
.line-binding-body {
  min-height: 120px;
}
.target-name {
  margin-bottom: 12px;
  font-size: 14px;
  color: #303133;
}
.target-name .label {
  color: #909399;
}
.status-tag {
  margin-bottom: 12px;
}
.code-box {
  background: #faf5ff;
  border: 1px dashed #b9a0d6;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
}
.code-title {
  font-size: 12px;
  color: #7c6d8f;
  margin-bottom: 6px;
}
.code-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #5e417e;
  margin-bottom: 10px;
  font-family: Monaco, Menlo, monospace;
}
.tips {
  margin-bottom: 12px;
}
.friend-link {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.link-text {
  font-size: 12px;
  color: #775999;
  word-break: break-all;
}
.invite-card {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}
.invite-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #2e7d32;
  margin-bottom: 10px;
}
.invite-preview {
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  color: #333;
  white-space: pre-wrap;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  margin-bottom: 10px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px dashed #c8e6c9;
}
</style>
