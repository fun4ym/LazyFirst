<template>
  <div class="ai-maker-page">
    <div class="page-header">
      <h2>{{ $t('ai_maker.title') }}</h2>
      <div class="points-display">
        <span class="points-label">{{ $t('ai_maker.points') }}: </span>
        <span class="points-number">{{ pointsBalance }}</span>
      </div>
    </div>

    <!-- 商品选择 -->
    <el-card class="product-selection-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.select_product') }}</span>
        </div>
      </template>
      
      <el-form :model="formData">
        <el-form-item :label="$t('ai_maker.product')">
          <el-select v-model="formData.productId" :placeholder="$t('ai_maker.select_product')" filterable>
            <el-option
              v-for="product in products"
              :key="product._id"
              :label="product.name"
              :value="product._id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 配置区 -->
    <el-row :gutter="20" class="config-row">
      <!-- 左侧：展示模式和风格选择 -->
      <el-col :span="12">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('ai_maker.config') }}</span>
            </div>
          </template>
          
          <el-form :model="formData" label-position="top">
            <!-- 展示模式 -->
            <el-form-item :label="$t('ai_maker.display_mode')">
              <el-radio-group v-model="formData.displayMode">
                <el-radio label="human">{{ $t('ai_maker.human') }}</el-radio>
                <el-radio label="animated_human">{{ $t('ai_maker.animated_human') }}</el-radio>
                <el-radio label="product_only">{{ $t('ai_maker.product_only') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <!-- 风格 -->
            <el-form-item :label="$t('ai_maker.style')">
              <el-radio-group v-model="formData.style">
                <el-radio label="normal">{{ $t('ai_maker.normal') }}</el-radio>
                <el-radio label="crazy">{{ $t('ai_maker.crazy') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <!-- 数字人选择 -->
            <el-form-item :label="$t('ai_maker.digital_human')">
              <el-select v-model="formData.digitalHumanId" :placeholder="$t('ai_maker.select_digital_human')">
                <el-option
                  v-for="dh in digitalHumans"
                  :key="dh._id"
                  :label="dh.name"
                  :value="dh._id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <!-- 右侧：提示词预览和视频时长选择 -->
      <el-col :span="12">
        <el-card class="preview-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('ai_maker.preview') }}</span>
            </div>
          </template>
          
          <!-- 提示词预览 -->
          <div class="prompt-preview">
            <h4>{{ $t('ai_maker.prompt_preview') }}</h4>
            <el-input
              v-model="previewPrompt"
              type="textarea"
              :rows="6"
              readonly
            />
          </div>
          
          <!-- 视频时长选择 -->
          <div class="duration-selection">
            <h4>{{ $t('ai_maker.duration') }}</h4>
            <el-radio-group v-model="formData.duration">
              <el-radio :label="5">
                5 {{ $t('ai_maker.seconds') }} (100 {{ $t('ai_maker.points') }})
              </el-radio>
              <el-radio :label="10">
                10 {{ $t('ai_maker.seconds') }} (200 {{ $t('ai_maker.points') }})
              </el-radio>
            </el-radio-group>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 生成按钮 -->
    <div class="generate-actions">
      <el-button type="primary" size="large" @click="generateVideo" :loading="generating">
        {{ $t('ai_maker.generate_video') }}
      </el-button>
    </div>

    <!-- 任务状态 -->
    <el-card v-if="currentTask" class="task-status-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('ai_maker.task_status') }}</span>
        </div>
      </template>
      
      <el-steps :active="taskStep" finish-status="success">
        <el-step :title="$t('ai_maker.pending')" />
        <el-step :title="$t('ai_maker.processing')" />
        <el-step :title="$t('ai_maker.completed')" />
      </el-steps>
      
      <div v-if="currentTask.status === 'completed'" class="video-result">
        <video :src="currentTask.videoUrl" controls />
      </div>
      
      <div v-if="currentTask.status === 'failed'" class="error-message">
        <el-alert type="error" :title="currentTask.errorMessage" />
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from '@/utils/request';
import { ElMessage } from 'element-plus';

export default {
  name: 'AiMaker',
  setup() {
    const { t } = useI18n();
    const formData = reactive({
      productId: '',
      displayMode: 'human',
      style: 'normal',
      digitalHumanId: '',
      duration: 5
    });
    const pointsBalance = ref(0);
    const products = ref([]);
    const digitalHumans = ref([]);
    const currentTask = ref(null);
    const generating = ref(false);
    const pollInterval = ref(null);

    // 预览提示词
    const previewPrompt = computed(() => {
      // TODO: 根据产品类型、展示模式、风格获取提示词模板
      return `生成${formData.displayMode === 'human' ? '数字人出场' : formData.displayMode === 'animated_human' ? '动画数字人出场' : '仅产品展示'}的${formData.style === 'normal' ? '普通' : '疯狂'}风格视频`;
    });

    // 任务步骤
    const taskStep = computed(() => {
      if (!currentTask.value) return 0;
      switch (currentTask.value.status) {
        case 'pending': return 0;
        case 'processing': return 1;
        case 'completed': return 3;
        case 'failed': return 2;
        default: return 0;
      }
    });

    // 获取点数余额
    const fetchPointsBalance = async () => {
      try {
        const response = await axios.get('/api/ai-maker/points-balance');
        if (response.data.success) {
          pointsBalance.value = response.data.data.pointsBalance;
        }
      } catch (error) {
        console.error('获取点数余额失败:', error);
      }
    };

    // 获取商品列表
    const fetchProducts = async () => {
      try {
        const response = await axios.get('/api/products', {
          params: { page: 1, limit: 100 }
        });
        if (response.data.success) {
          products.value = response.data.data;
        }
      } catch (error) {
        console.error('获取商品列表失败:', error);
      }
    };

    // 获取数字人列表
    const fetchDigitalHumans = async () => {
      try {
        const response = await axios.get('/api/digital-humans', {
          params: { page: 1, limit: 100 }
        });
        if (response.data.success) {
          digitalHumans.value = response.data.data;
        }
      } catch (error) {
        console.error('获取数字人列表失败:', error);
      }
    };

    // 生成视频
    const generateVideo = async () => {
      if (!formData.productId) {
        ElMessage.warning(t('ai_maker.please_select_product'));
        return;
      }

      generating.value = true;
      try {
        const response = await axios.post('/api/ai-maker/generate-video', {
          influencerId: '', // TODO: 获取当前达人ID
          productId: formData.productId,
          displayMode: formData.displayMode,
          style: formData.style,
          duration: formData.duration
        });

        if (response.data.success) {
          currentTask.value = {
            _id: response.data.data.taskId,
            status: 'pending'
          };
          ElMessage.success(t('ai_maker.generate_video_success'));

          // 开始轮询任务状态
          startPolling(response.data.data.taskId);
        }
      } catch (error) {
        console.error('生成视频失败:', error);
        ElMessage.error(t('ai_maker.generate_video_failed'));
      } finally {
        generating.value = false;
      }
    };

    // 轮询任务状态
    const startPolling = (taskId) => {
      pollInterval.value = setInterval(async () => {
        try {
          const response = await axios.get(`/api/ai-maker/task-status/${taskId}`);
          if (response.data.success) {
            currentTask.value = response.data.data;

            // 如果任务完成或失败，停止轮询
            if (['completed', 'failed'].includes(response.data.data.status)) {
              stopPolling();
              fetchPointsBalance(); // 刷新点数余额
            }
          }
        } catch (error) {
          console.error('查询任务状态失败:', error);
        }
      }, 3000); // 每3秒轮询一次
    };

    // 停止轮询
    const stopPolling = () => {
      if (pollInterval.value) {
        clearInterval(pollInterval.value);
        pollInterval.value = null;
      }
    };

    onMounted(() => {
      fetchPointsBalance();
      fetchProducts();
      fetchDigitalHumans();
    });

    onUnmounted(() => {
      stopPolling();
    });

    return {
      formData,
      pointsBalance,
      products,
      digitalHumans,
      currentTask,
      generating,
      previewPrompt,
      taskStep,
      generateVideo
    };
  }
};
</script>

<style scoped>
.ai-maker-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.points-display {
  display: flex;
  align-items: center;
}

.points-label {
  font-size: 16px;
  margin-right: 5px;
}

.points-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.product-selection-card,
.config-card,
.preview-card,
.generate-actions,
.task-status-card {
  margin-bottom: 20px;
}

.config-row {
  margin-bottom: 20px;
}

.prompt-preview {
  margin-bottom: 20px;
}

.duration-selection {
  margin-top: 20px;
}

.generate-actions {
  text-align: center;
}

.video-result {
  margin-top: 20px;
  text-align: center;
}

.video-result video {
  max-width: 100%;
  max-height: 400px;
}

.error-message {
  margin-top: 20px;
}
</style>
