<template>
  <el-icon :size="size" :color="iconColor" :title="title">
    <component :is="iconComponent" />
  </el-icon>
</template>

<script setup>
import { computed } from 'vue'
import {
  CircleCheck,
  Clock,
  Warning,
  Close,
  Check,
  QuestionFilled,
  InfoFilled,
  Loading
} from '@element-plus/icons-vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => [
      'completed', 'success', 'done', 'finished',
      'pending', 'processing', 'in_progress', 'active',
      'failed', 'error', 'rejected',
      'cancelled', 'expired',
      'unknown', 'warning', 'info'
    ].includes(value)
  },
  size: {
    type: [String, Number],
    default: 16
  },
  // 自定义颜色，如果不传则根据状态自动选择
  color: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  }
})

const statusConfig = {
  // 完成状态
  completed: { icon: CircleCheck, color: '#67C23A' },
  success: { icon: CircleCheck, color: '#67C23A' },
  done: { icon: Check, color: '#67C23A' },
  finished: { icon: CircleCheck, color: '#67C23A' },
  
  // 进行中状态
  pending: { icon: Clock, color: '#409EFF' },
  processing: { icon: Loading, color: '#409EFF' },
  in_progress: { icon: Clock, color: '#409EFF' },
  active: { icon: Clock, color: '#409EFF' },
  
  // 失败状态
  failed: { icon: Close, color: '#F56C6C' },
  error: { icon: Close, color: '#F56C6C' },
  rejected: { icon: Close, color: '#F56C6C' },
  
  // 取消/过期状态
  cancelled: { icon: Warning, color: '#E6A23C' },
  expired: { icon: Warning, color: '#E6A23C' },
  
  // 未知/警告/信息状态
  unknown: { icon: QuestionFilled, color: '#909399' },
  warning: { icon: Warning, color: '#E6A23C' },
  info: { icon: InfoFilled, color: '#409EFF' }
}

const iconConfig = computed(() => {
  const lowerStatus = props.status.toLowerCase()
  return statusConfig[lowerStatus] || statusConfig.unknown
})

const iconComponent = computed(() => iconConfig.value.icon)
const iconColor = computed(() => props.color || iconConfig.value.color)
</script>

<style scoped>
/* 无额外样式，仅使用Element Plus图标 */
</style>