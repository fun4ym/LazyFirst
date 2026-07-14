// 样品寄样状态：枚举与展示映射（集中管理，消除各页面重复定义）
// 须与后端 server/models/SampleManagement.js 的 sampleStatus enum 保持一致：
//   enum: ['pending', 'shipping', 'sent', 'refused']

// 权威状态枚举（供 el-select options 等使用，labelKey 由各页面按自身 i18n 命名空间映射）
export const SAMPLE_STATUS_OPTIONS = [
  { value: 'pending', labelKey: 'pending' },
  { value: 'shipping', labelKey: 'shipping' },
  { value: 'sent', labelKey: 'sent' },
  { value: 'refused', labelKey: 'refused' }
]

// 状态 -> Element Plus tag type（颜色）
const SAMPLE_STATUS_TYPE_MAP = {
  pending: 'warning', // 待审核 - 黄色
  shipping: 'primary', // 寄样中 - 蓝色
  sent: 'success', // 已寄样 - 绿色
  refused: 'danger' // 不合作 - 红色
}

// 样品状态 -> tag 颜色类型；未知状态回退 'info'
export function getSampleStatusType(status) {
  return SAMPLE_STATUS_TYPE_MAP[status] || 'info'
}
