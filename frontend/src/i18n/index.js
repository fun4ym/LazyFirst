import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

// 强制默认使用中文
const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages: {
    zh,
    en
  }
})

export default i18n
