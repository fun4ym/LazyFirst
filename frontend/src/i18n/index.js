import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

// 默认使用英文，可切换中文
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  }
})

export default i18n
