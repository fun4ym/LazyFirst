<template>
  <el-tooltip :content="tooltipText" placement="top">
    <el-icon class="copy-button" :size="size" :color="color" @click.stop="handleCopy" :title="title">
      <CopyDocument />
    </el-icon>
  </el-tooltip>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'

const props = defineProps({
  // 要复制的文本
  text: {
    type: String,
    required: true
  },
  // 成功提示消息
  successMessage: {
    type: String,
    default: '已复制到剪贴板'
  },
  // 失败提示消息
  errorMessage: {
    type: String,
    default: '复制失败'
  },
  // 按钮大小
  size: {
    type: [String, Number],
    default: 16
  },
  // 按钮颜色
  color: {
    type: String,
    default: '#9C27B0'
  },
  // 鼠标悬停提示
  title: {
    type: String,
    default: '复制'
  }
})

const emit = defineEmits(['copied', 'error'])

const isCopied = ref(false)

const tooltipText = computed(() => {
  if (isCopied.value) {
    return '已复制'
  }
  return props.title
})

const handleCopy = async () => {
  if (!props.text) {
    ElMessage.warning('无内容可复制')
    emit('error', new Error('无内容可复制'))
    return
  }
  try {
    await navigator.clipboard.writeText(props.text)
    ElMessage.success(props.successMessage)
    isCopied.value = true
    emit('copied', props.text)
    
    // 2秒后重置复制状态
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error(props.errorMessage)
    emit('error', error)
  }
}
</script>

<style scoped>
.copy-button {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
}

.copy-button:hover {
  opacity: 1;
  transform: scale(1.1);
}
</style>