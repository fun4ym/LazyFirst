import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'
import th from './th'

// 默认使用英文，可切换中文/泰文
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
    th
  }
})

export default i18n
