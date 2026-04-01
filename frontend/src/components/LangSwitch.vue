<template>
  <el-dropdown @command="handleCommand" trigger="click">
    <el-button text>
      <span class="lang-text">{{ currentLang }}</span>
      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="zh">中文</el-dropdown-item>
        <el-dropdown-item command="en">English</el-dropdown-item>
        <el-dropdown-item command="th">ภาษาไทย</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown } from '@element-plus/icons-vue'

const { locale } = useI18n()

const currentLang = computed(() => {
  const langMap = { zh: '中文', en: 'English', th: 'ภาษาไทย' }
  return langMap[locale.value] || 'English'
})

const handleCommand = (lang) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>

<style scoped>
.lang-text {
  font-size: 14px;
}
</style>
