/**
 * 招募公开页面样式配置
 * 包含预设配色方案和风格相关配置
 */

// 预设配色方案
export const presetColors = [
  { label: '浪漫紫', i18nKey: 'recruitment.colorRomanticPurple', value: '#775999', gradient: 'linear-gradient(135deg, #775999, #9b6db5)' },
  { label: '活力橙', i18nKey: 'recruitment.colorVibrantOrange', value: '#FF6B35', gradient: 'linear-gradient(135deg, #FF6B35, #ff8f5a)' },
  { label: '清新绿', i18nKey: 'recruitment.colorFreshGreen', value: '#4CAF50', gradient: 'linear-gradient(135deg, #4CAF50, #66bb6a)' },
  { label: '少女粉', i18nKey: 'recruitment.colorGirlPink', value: '#E91E63', gradient: 'linear-gradient(135deg, #E91E63, #f06292)' },
  { label: '天空蓝', i18nKey: 'recruitment.colorSkyBlue', value: '#2196F3', gradient: 'linear-gradient(135deg, #2196F3, #42a5f5)' },
  { label: '玫瑰金', i18nKey: 'recruitment.colorRoseGold', value: '#D4A574', gradient: 'linear-gradient(135deg, #D4A574, #e0b88a)' },
  { label: '薄荷绿', i18nKey: 'recruitment.colorMintGreen', value: '#00BCD4', gradient: 'linear-gradient(135deg, #00BCD4, #26c6da)' },
  { label: '日落橙', i18nKey: 'recruitment.colorSunsetOrange', value: '#FF5722', gradient: 'linear-gradient(135deg, #FF5722, #ff7043)' }
]

// 风格选项
export const styleOptions = [
  { label: '温暖风', i18nKey: 'recruitment.styleWarm', value: 'warm', description: '柔和暖色渐变，温馨亲切感' },
  { label: '甜美风', i18nKey: 'recruitment.styleSweet', value: 'sweet', description: '马卡龙色系，少女感' },
  { label: '科技风', i18nKey: 'recruitment.styleTech', value: 'tech', description: '深色背景，酷炫科技感' }
]

// 默认主题色
export const defaultThemeColor = '#775999'

// 风格对应的背景配置
export const styleBackgrounds = {
  warm: {
    gradient: 'linear-gradient(180deg, #FFF8F0 0%, #FFE4D0 100%)',
    solid: '#FFF8F0'
  },
  sweet: {
    gradient: 'linear-gradient(180deg, #FFF0F5 0%, #F5F0FF 50%, #F0FFF0 100%)',
    solid: '#FFF0F5'
  },
  tech: {
    gradient: 'linear-gradient(180deg, #0D0D1A 0%, #1A1A2E 100%)',
    solid: '#0D0D1A'
  }
}

// 获取稀释后的颜色（用于背景）
export const getLightColor = (hex, alpha = 0.1) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 获取深色变体（用于文字）
export const getDarkColor = (hex, alpha = 0.7) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
