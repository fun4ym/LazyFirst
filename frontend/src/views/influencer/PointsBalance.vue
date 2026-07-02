<template>
  <div class="points-balance-page">
    <div class="page-header">
      <h2>{{ $t('ai_maker.points_balance') }}</h2>
    </div>

    <!-- 点数余额卡片 -->
    <el-card class="points-card">
      <div class="points-display">
        <div class="points-number">{{ pointsBalance }}</div>
        <div class="points-label">{{ $t('ai_maker.points') }}</div>
      </div>
    </el-card>

    <!-- 购买点数 -->
    <el-card class="purchase-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.purchase_points') }}</span>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="package-card" @click="purchasePoints('A')">
            <div class="package-name">{{ $t('ai_maker.package_a') }}</div>
            <div class="package-points">500 {{ $t('ai_maker.points') }}</div>
            <div class="package-price">฿ 500</div>
            <el-button type="primary" block>{{ $t('ai_maker.purchase') }}</el-button>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="package-card" @click="purchasePoints('B')">
            <div class="package-name">{{ $t('ai_maker.package_b') }}</div>
            <div class="package-points">2000 {{ $t('ai_maker.points') }}</div>
            <div class="package-price">฿ 1,800</div>
            <el-button type="primary" block>{{ $t('ai_maker.purchase') }}</el-button>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="package-card" @click="purchasePoints('C')">
            <div class="package-name">{{ $t('ai_maker.package_c') }}</div>
            <div class="package-points">5000 {{ $t('ai_maker.points') }}</div>
            <div class="package-price">฿ 4,000</div>
            <el-button type="primary" block>{{ $t('ai_maker.purchase') }}</el-button>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 交易记录 -->
    <el-card class="transactions-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.transaction_history') }}</span>
        </div>
      </template>
      
      <el-table :data="transactions" style="width: 100%">
        <el-table-column prop="type" :label="$t('ai_maker.type')">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'earn' ? 'success' : scope.row.type === 'consume' ? 'warning' : 'info'">
              {{ $t(`ai_maker.${scope.row.type}`) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="amount" :label="$t('ai_maker.amount')" width="120">
          <template #default="scope">
            <span :class="scope.row.amount > 0 ? 'positive' : 'negative'">
              {{ scope.row.amount > 0 ? '+' : '' }}{{ scope.row.amount }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="balance" :label="$t('ai_maker.balance')" width="120" />
        
        <el-table-column prop="source" :label="$t('ai_maker.source')">
          <template #default="scope">
            {{ $t(`ai_maker.${scope.row.source}`) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="description" :label="$t('ai_maker.description')" />
        
        <el-table-column prop="createdAt" :label="$t('ai_maker.created_at')" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/utils/request';

export default {
  name: 'PointsBalance',
  setup() {
    const { t } = useI18n();
    const pointsBalance = ref(0);
    const transactions = ref([]);

    // 获取点数余额
    const fetchPointsBalance = async () => {
      try {
        const response = await axios.get('/api/ai-maker/points-balance');
        if (response.data.success) {
          pointsBalance.value = response.data.data.pointsBalance;
          transactions.value = response.data.data.transactions;
        }
      } catch (error) {
        console.error('获取点数余额失败:', error);
      }
    };

    // 购买点数
    const purchasePoints = async (packageType) => {
      try {
        const response = await axios.post('/api/ai-maker/purchase-points', {
          package: packageType
        });
        
        if (response.data.success) {
          pointsBalance.value = response.data.data.pointsBalance;
          fetchPointsBalance(); // 刷新交易记录
        }
      } catch (error) {
        console.error('购买点数失败:', error);
      }
    };

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '-';
      return new Date(date).toLocaleString();
    };

    onMounted(() => {
      fetchPointsBalance();
    });

    return {
      pointsBalance,
      transactions,
      purchasePoints,
      formatDate
    };
  }
};
</script>

<style scoped>
.points-balance-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.points-card {
  margin-bottom: 20px;
  text-align: center;
}

.points-display {
  padding: 40px;
}

.points-number {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
}

.points-label {
  font-size: 18px;
  color: #909399;
  margin-top: 10px;
}

.purchase-card {
  margin-bottom: 20px;
}

.package-card {
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.package-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.package-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.package-points {
  font-size: 24px;
  color: #409eff;
  margin-bottom: 10px;
}

.package-price {
  font-size: 20px;
  color: #f56c6c;
  margin-bottom: 20px;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}
</style>
