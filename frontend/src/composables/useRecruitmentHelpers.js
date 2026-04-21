/**
 * 招募页面公共逻辑 Hook
 * 被 WarmStyle、SweetStyle、TechStyle 三个组件共享
 */

import { computed } from 'vue'

/**
 * 格式化佣金率
 * @param {number} rate - 佣金率（小数形式，如 0.15）
 * @returns {string} 格式化后的字符串（如 '15%'）
 */
export const formatRate = (rate) => {
  if (rate === null || rate === undefined || rate === '') return '-'
  const percent = parseFloat(rate) * 100
  if (isNaN(percent)) return '-'
  return `${percent.toFixed(2)}%`
}

/**
 * 获取产品的默认活动配置
 * @param {Object} prod - 产品对象
 * @returns {Object|null} 默认活动配置
 */
export const getDefaultActivityConfig = (prod) => {
  if (!prod || !prod.activityConfigs || prod.activityConfigs.length === 0) {
    return null
  }
  const defaultConfig = prod.activityConfigs.find(ac => ac.isDefault)
  return defaultConfig || prod.activityConfigs[0]
}

/**
 * 获取产品的申样链接
 * @param {Object} prod - 产品对象
 * @returns {string|null} 申样链接
 */
export const getDefaultActivityLink = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (!config) return null
  return config.applicationLink || null
}

/**
 * 获取产品的推广佣金率
 * @param {Object} prod - 产品对象
 * @returns {number} 推广佣金率
 */
export const getProductPromoRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (!config) return 0
  return config.promoRate || 0
}

/**
 * 获取产品的平方佣金率
 * @param {Object} prod - 产品对象
 * @returns {number} 平方佣金率
 */
export const getProductSquareRate = (prod) => {
  const config = getDefaultActivityConfig(prod)
  if (!config) return 0
  return config.squareRate || 0
}

/**
 * 计算额外佣金百分比
 * @param {Object} prod - 产品对象
 * @returns {number} 额外佣金百分比
 */
export const calcExtra = (prod) => {
  const promo = getProductPromoRate(prod)
  const square = getProductSquareRate(prod)
  const diff = (promo - square) * 100
  return Math.max(0, Math.round(diff * 100) / 100)
}

/**
 * 招募页面公共 Hook
 * @param {Object} recruitment - 招募数据对象
 * @returns {Object} 公共方法和计算属性
 */
export const useRecruitmentHelpers = (recruitment) => {
  // 格式化GMV显示
  const formattedGmv = computed(() => {
    if (!recruitment?.requirementGmv) return '-'
    return recruitment.requirementGmv.toLocaleString()
  })

  // 格式化粉丝数显示
  const formattedFollowers = computed(() => {
    if (!recruitment?.requirementFollowers) return '-'
    return recruitment.requirementFollowers + 'K'
  })

  // 格式化月销量显示
  const formattedMonthlySales = computed(() => {
    if (!recruitment?.requirementMonthlySales) return '-'
    return recruitment.requirementMonthlySales.toLocaleString()
  })

  // 格式化平均观看显示
  const formattedAvgViews = computed(() => {
    if (!recruitment?.requirementAvgViews) return '-'
    return recruitment.requirementAvgViews.toLocaleString()
  })

  return {
    // 工具函数
    formatRate,
    getDefaultActivityConfig,
    getDefaultActivityLink,
    getProductPromoRate,
    getProductSquareRate,
    calcExtra,
    // 计算属性
    formattedGmv,
    formattedFollowers,
    formattedMonthlySales,
    formattedAvgViews
  }
}

export default useRecruitmentHelpers