<template>
  <div class="dashboard">
    <!-- BD数据概览 -->
    <template v-if="isBD && bdStats">
      <!-- 统计日期提示 -->
      <div class="stats-date-info">
        <el-icon class="date-icon"><Calendar /></el-icon>
        <span>当前数据统计：{{ formatDate(bdStats.statsDate) }}</span>
      </div>

      <!-- 数据卡片 -->
      <el-row :gutter="20" class="stat-cards-row">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ bdStats.yesterdayStats.sampleCount }}</div>
                <div class="stat-label">申样数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ bdStats.yesterdayStats.orderCount }}</div>
                <div class="stat-label">成交订单数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">฿{{ formatMoney(bdStats.yesterdayCommission?.estimated || 0) }}</div>
                <div class="stat-label">昨日预估佣金</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-item">
              <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">฿{{ formatMoney(bdStats.monthlyCommission.estimated) }}</div>
                <div class="stat-label">本月预估佣金</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 占比饼图 -->
      <el-row :gutter="20" class="pie-charts-row">
        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-title">
                <span>申样数团队占比</span>
              </div>
            </template>
            <div class="pie-chart-container">
              <pie-chart
                :data="samplePieData"
                :percentage="bdStats.percentage.sample"
                label="申样数"
              />
              <div class="team-info">
                <p>个人: {{ bdStats.yesterdayStats.sampleCount }} 条</p>
                <p>团队: {{ bdStats.teamStats.sampleCount }} 条</p>
                <p>占比: {{ bdStats.percentage.sample }}%</p>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-title">
                <span>订单数团队占比</span>
              </div>
            </template>
            <div class="pie-chart-container">
              <pie-chart
                :data="orderPieData"
                :percentage="bdStats.percentage.order"
                label="订单数"
              />
              <div class="team-info">
                <p>个人: {{ bdStats.yesterdayStats.orderCount }} 单</p>
                <p>团队: {{ bdStats.teamStats.orderCount }} 单</p>
                <p>占比: {{ bdStats.percentage.order }}%</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 趋势图表 -->
      <el-row :gutter="20" class="trend-charts-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-controls">
                <div class="card-header-title">
                  <span>申样数趋势</span>
                </div>
                <el-radio-group v-model="sampleTrendRange" size="default">
                  <el-radio-button value="7days">7天</el-radio-button>
                  <el-radio-button value="14days">14天</el-radio-button>
                  <el-radio-button value="monthly">自然月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <trend-chart
              :data="sampleTrendData"
              :dates="sampleTrendDates"
              type="sample"
            />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="trend-charts-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-controls">
                <div class="card-header-title">
                  <span>成交订单数趋势</span>
                </div>
                <el-radio-group v-model="orderTrendRange" size="default">
                  <el-radio-button value="7days">7天</el-radio-button>
                  <el-radio-button value="14days">14天</el-radio-button>
                  <el-radio-button value="monthly">自然月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <trend-chart
              :data="orderTrendData"
              :dates="orderTrendDates"
              type="order"
            />
          </el-card>
        </el-col>
      </el-row>

      <!-- 近一周成单列表 -->
      <el-row :gutter="20" class="recent-orders-row">
        <el-col :span="24">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header-with-tag">
                <div class="card-header-title">
                  <span>近一周成单列表 (共 {{ bdStats.recentOrders.total }} 单)</span>
                </div>
                <el-tag type="success" size="default">{{ bdStats.user.name }}</el-tag>
              </div>
            </template>
            <el-table :data="bdStats.recentOrders.list" border stripe>
              <el-table-column prop="orderId" label="订单ID" width="200" />
              <el-table-column prop="influencer" label="达人" width="180" />
              <el-table-column prop="product" label="商品" />
              <el-table-column label="创建时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="bdStats.recentOrders.list.length === 0" description="暂无数据" />
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 非BD用户提示 -->
    <template v-else>
      <el-card>
        <el-empty description="数据概览仅对BD用户开放" />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h, watch } from 'vue'
import request from '@/utils/request'
import { Box, ShoppingCart, Money, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AuthManager from '@/utils/auth'

const isBD = ref(false)
const bdStats = ref(null)
const sampleTrendRange = ref('7days')
const orderTrendRange = ref('7days')

// 调试日志
const debugInfo = computed(() => {
  return {
    isBD: isBD.value,
    bdStats: bdStats.value ? '有值' : '无值',
    yesterdayStats: bdStats.value?.yesterdayStats || null
  }
})

// 在控制台输出调试信息
const logDebugInfo = () => {
  console.log('[Dashboard Debug]', JSON.stringify(debugInfo.value, null, 2))
  console.log('[Dashboard] isBD.value:', isBD.value)
  console.log('[Dashboard] bdStats.value:', bdStats.value)
  console.log('[Dashboard] template 条件:', isBD.value && bdStats.value)
}

const sampleTrendData = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = sampleTrendRange.value
  const dataKey = key === '7days' ? 'samples7Days' : key === '14days' ? 'samples14Days' : 'samplesMonthly'
  const trendData = bdStats.value.trendStats[dataKey]
  console.log('[sampleTrendData] key:', key, 'dataKey:', dataKey, 'trendData:', trendData)
  return [
    { name: '个人', data: trendData?.user || [], type: 'line', itemStyle: { color: '#7b1fa2' } },
    { name: '团队', data: trendData?.team || [], type: 'bar', itemStyle: { color: '#e8e4ef' } }
  ]
})

const sampleTrendDates = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = sampleTrendRange.value
  const dataKey = key === '7days' ? 'samples7Days' : key === '14days' ? 'samples14Days' : 'samplesMonthly'
  console.log('[sampleTrendDates] dataKey:', dataKey, 'dates:', bdStats.value.trendStats[dataKey]?.dates)
  return bdStats.value.trendStats[dataKey]?.dates || []
})

const orderTrendData = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = orderTrendRange.value
  const dataKey = key === '7days' ? 'orders7Days' : key === '14days' ? 'orders14Days' : 'ordersMonthly'
  const trendData = bdStats.value.trendStats[dataKey]
  console.log('[orderTrendData] key:', key, 'dataKey:', dataKey, 'trendData:', trendData)
  return [
    { name: '个人', data: trendData?.user || [], type: 'line', itemStyle: { color: '#0288d1' } },
    { name: '团队', data: trendData?.team || [], type: 'bar', itemStyle: { color: '#e3f2fd' } }
  ]
})

const orderTrendDates = computed(() => {
  if (!bdStats.value?.trendStats) return []
  const key = orderTrendRange.value
  const dataKey = key === '7days' ? 'orders7Days' : key === '14days' ? 'orders14Days' : 'ordersMonthly'
  console.log('[orderTrendDates] dataKey:', dataKey, 'dates:', bdStats.value.trendStats[dataKey]?.dates)
  return bdStats.value.trendStats[dataKey]?.dates || []
})

const samplePieData = computed(() => {
  if (!bdStats.value) return []
  const user = bdStats.value.yesterdayStats.sampleCount
  const team = bdStats.value.teamStats.sampleCount
  const others = Math.max(0, team - user)
  return [
    { name: '个人', value: user, itemStyle: { color: '#7b1fa2' } },
    { name: '团队其他', value: others, itemStyle: { color: '#e8e4ef' } }
  ]
})

const orderPieData = computed(() => {
  if (!bdStats.value) return []
  const user = bdStats.value.yesterdayStats.orderCount
  const team = bdStats.value.teamStats.orderCount
  const others = Math.max(0, team - user)
  return [
    { name: '个人', value: user, itemStyle: { color: '#0288d1' } },
    { name: '团队其他', value: others, itemStyle: { color: '#e8e4ef' } }
  ]
})

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

const getYesterdayDate = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

const getCurrentMonth = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}`
}

const loadBDStats = async () => {
  try {
    console.log('[loadBDStats] Starting request...')
    const res = await request.get('/dashboard/bd-stats')
    console.log('[loadBDStats] Response:', res)
    bdStats.value = res
    isBD.value = true
    console.log('[loadBDStats] bdStats set:', bdStats.value)
    console.log('[loadBDStats] isBD.value:', isBD.value)
    console.log('[loadBDStats] bdStats.value?.yesterdayStats:', bdStats.value?.yesterdayStats)
    console.log('[loadBDStats] bdStats.value?.trendStats:', bdStats.value?.trendStats)
    console.log('[loadBDStats] 完整trendStats:', JSON.stringify(bdStats.value?.trendStats, null, 2))
    logDebugInfo()
  } catch (error) {
    console.error('Load BD stats error:', error)
    if (error.response?.status === 403) {
      isBD.value = false
    } else {
      ElMessage.error('加载数据概览失败')
    }
  }
}

// 饼图组件
const PieChart = defineComponent({
  name: 'PieChart',
  props: {
    data: {
      type: Array,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      default: '占比'
    }
  },
  setup(props) {
    const chartRef = ref(null)

    onMounted(() => {
      import('echarts').then(echarts => {
        if (chartRef.value) {
          const chart = echarts.init(chartRef.value)
          chart.setOption({
            series: [
              {
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                label: {
                  show: true,
                  position: 'center',
                  formatter: '{b}\n{d}%',
                  fontSize: 16,
                  fontWeight: 'bold'
                },
                emphasis: {
                  label: {
                    show: true
                  }
                },
                labelLine: {
                  show: false
                },
                data: props.data
              }
            ]
          })
        }
      })
    })

    return () => h('div', { ref: chartRef, style: { width: '200px', height: '200px' } })
  }
})

// 趋势图组件
const TrendChart = defineComponent({
  name: 'TrendChart',
  props: {
    data: {
      type: Array,
      required: true
    },
    dates: {
      type: Array,
      required: true
    },
    type: {
      type: String,
      default: 'sample'
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chartInstance = null

    const updateChart = (echarts) => {
      if (!chartRef.value) return

      if (!chartInstance) {
        chartInstance = echarts.init(chartRef.value)
      }

      const color = props.type === 'sample' ? '#7b1fa2' : '#0288d1'

      const series = props.data.map(item => ({
        name: item.name,
        type: item.type,
        data: item.data,
        itemStyle: { color: item.itemStyle?.color || color },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 6
      }))

      console.log('[TrendChart] updateChart type:', props.type, 'data:', props.data, 'dates:', props.dates)

      chartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: props.data.map(d => d.name),
          top: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '50px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: props.dates,
          axisLabel: {
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          name: props.type === 'sample' ? '申样数' : '订单数'
        },
        series: series
      }, { notMerge: false })

      console.log('[TrendChart] chart setOption completed')
    }

    onMounted(() => {
      import('echarts').then(echarts => {
        updateChart(echarts)
      })
    })

    watch([() => props.data, () => props.dates], () => {
      import('echarts').then(echarts => {
        updateChart(echarts)
      })
    }, { deep: true })

    return () => h('div', { ref: chartRef, style: { width: '100%', height: '400px' } })
  }
})

onMounted(() => {
  const user = AuthManager.getUser()
  console.log('[Dashboard] User info:', user)
  if (user) {
    const role = user.role
    console.log('[Dashboard] Role:', role, 'Type:', typeof role, 'IsArray:', Array.isArray(role))
    let hasBDRole = false
    if (Array.isArray(role)) {
      hasBDRole = role.some(r => {
        const roleName = typeof r === 'string' ? r : (r?.name || '')
        return roleName.toLowerCase() === 'bd'
      })
    } else if (typeof role === 'string') {
      hasBDRole = role.toLowerCase() === 'bd'
    } else if (typeof role === 'object' && role !== null) {
      // role 是对象，包含 name 字段
      hasBDRole = (role.name || '').toLowerCase() === 'bd'
    }
    console.log('[Dashboard] hasBDRole:', hasBDRole)
    if (hasBDRole) {
      loadBDStats()
    } else {
      isBD.value = false
    }
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-date-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #e8ecef 0%, #d4d8e0 100%);
  border-radius: 12px;
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid #d0d4dc;
}

.date-icon {
  font-size: 18px;
  color: #546e7a;
}

.stat-card {
  border-radius: 12px;
  border: 1px solid #e8ecef;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.12);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stat-label {
  font-size: 13px;
  color: #6c757d;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.pie-chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 28px 20px;
}

.team-info {
  text-align: left;
  min-width: 160px;
}

.team-info p {
  margin: 12px 0;
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.team-info p:last-child {
  font-size: 22px;
  font-weight: 700;
  color: #667eea;
  margin-top: 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #e8ecef;
  padding: 18px 22px;
  font-weight: 600;
  color: #2c3e50;
}

:deep(.el-card__body) {
  padding: 0;
}

.stat-cards-row, .pie-charts-row, .trend-charts-row, .recent-orders-row {
  margin-bottom: 20px;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.card-header-with-controls, .card-header-with-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 4px;
}

:deep(.el-radio-button__inner) {
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
}

:deep(.el-tag) {
  font-weight: 600;
  font-size: 13px;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-table th) {
  font-weight: 600;
  color: #2c3e50;
}
</style>
