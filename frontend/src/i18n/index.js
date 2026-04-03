import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'
import th from './th'

// 从localStorage读取保存的语言设置，默认泰文
const savedLocale = localStorage.getItem('locale') || 'th'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
    th
  }
})

export default i18n
