<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('linePush.title')"
    width="820px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <div v-loading="loading" class="push-body">
      <el-row :gutter="20">
        <!-- 左：受众条件 -->
        <el-col :span="13">
          <div class="section-title">{{ $t('linePush.audienceSection') }}</div>
          <el-form label-width="96px" label-position="right">
            <el-form-item :label="$t('linePush.categoryTags')">
              <el-select v-model="criteria.categoryTags" multiple filterable collapse-tags style="width: 100%" :placeholder="$t('linePush.any')">
                <el-option v-for="tag in categoryTagOptions" :key="tag._id" :label="tag.name" :value="tag._id" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('linePush.suitableCategories')">
              <el-select v-model="criteria.suitableCategories" multiple filterable collapse-tags style="width: 100%" :placeholder="$t('linePush.any')">
                <el-option v-for="cat in suitableCategoryOptions" :key="cat._id" :label="cat.name" :value="cat._id" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('linePush.followerRange')">
              <div class="range-row">
                <el-input-number v-model="criteria.followerMin" :min="0" controls-position="right" />
                <span class="range-sep">-</span>
                <el-input-number v-model="criteria.followerMax" :min="0" controls-position="right" />
              </div>
            </el-form-item>
            <el-form-item :label="$t('linePush.product')">
              <el-select v-model="selectedProductId" filterable style="width: 100%" :placeholder="$t('linePush.selectProduct')">
                <el-option v-for="p in products" :key="p._id" :label="p.name" :value="p._id" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('linePush.mode')">
              <el-radio-group v-model="mode">
                <el-radio value="multicast">Multicast</el-radio>
                <el-radio value="narrowcast" :disabled="audienceCount < narrowcastThreshold">
                  Narrowcast (≥{{ narrowcastThreshold }})
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <div class="audience-count">
              <el-button size="small" :loading="previewing" @click="handlePreview">{{ $t('linePush.previewCount') }}</el-button>
              <span class="count-text">
                {{ $t('linePush.matched') }}：<strong>{{ audienceCount }}</strong> {{ $t('linePush.people') }}
                <el-tag size="small" :type="audienceCount >= narrowcastThreshold ? 'success' : 'info'" effect="light">
                  {{ audienceCount >= narrowcastThreshold ? 'narrowcast 可用' : 'multicast' }}
                </el-tag>
              </span>
            </div>
          </el-form>
        </el-col>

        <!-- 右：Flex 产品卡预览 -->
        <el-col :span="11">
          <div class="section-title">{{ $t('linePush.previewSection') }}</div>
          <div class="flex-preview" v-if="currentProduct">
            <div class="flex-hero" v-if="heroImage">
              <img :src="heroImage" alt="product" />
            </div>
            <div class="flex-hero placeholder" v-else>No Image</div>
            <div class="flex-content">
              <div class="flex-name">{{ currentProduct.name }}</div>
              <div class="flex-price">{{ priceText }}</div>
              <div class="flex-btn">去带货 / Shop now</div>
            </div>
          </div>
          <el-empty v-else :description="$t('linePush.noProduct')" :image-size="80" />
        </el-col>
      </el-row>
    </div>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="pushing" :disabled="audienceCount === 0 || !selectedProductId" @click="handlePush">
        {{ $t('linePush.confirmPush') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  activity: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'pushed'])

const { t } = useI18n()

const loading = ref(false)
const previewing = ref(false)
const pushing = ref(false)
const audienceCount = ref(0)
const narrowcastThreshold = ref(50)
const mode = ref('multicast')
const products = ref([])
const selectedProductId = ref('')
const categoryTagOptions = ref([])
const suitableCategoryOptions = ref([])

const criteria = reactive({
  categoryTags: [],
  suitableCategories: [],
  followerMin: 0,
  followerMax: 0
})

const currentProduct = computed(() => products.value.find(p => p._id === selectedProductId.value) || null)
const heroImage = computed(() => {
  const p = currentProduct.value
  if (!p) return ''
  return (p.productImages && p.productImages[0]) || (p.images && p.images[0]) || ''
})
const priceText = computed(() => {
  const p = currentProduct.value
  if (!p) return ''
  const cur = p.currency || 'THB'
  const price = p.sellingPrice || p.price || 0
  return `${cur} ${Number(price).toLocaleString()}`
})

const loadOptions = async () => {
  try {
    const [tagRes, catRes] = await Promise.all([
      request.get('/base-data', { params: { type: 'influencerCategory', limit: 1000 } }),
      request.get('/base-data', { params: { type: 'category', limit: 1000 } })
    ])
    categoryTagOptions.value = tagRes.data?.data || tagRes.data || tagRes || []
    suitableCategoryOptions.value = catRes.data?.data || catRes.data || catRes || []
  } catch (e) {
    // 拦截器已提示
  }
}

const loadProducts = async () => {
  if (!props.activity._id) return
  try {
    const res = await request.get(`/activities/${props.activity._id}/products`, { params: { page: 1, limit: 100 } })
    products.value = res.data || res.products || []
    if (products.value.length) selectedProductId.value = products.value[0]._id
  } catch (e) {
    products.value = []
  }
}

const prefillCriteria = () => {
  const lp = props.activity.linePush || {}
  const ac = lp.audienceCriteria || {}
  criteria.categoryTags = (ac.categoryTags || []).map(x => (typeof x === 'object' ? x._id : x))
  criteria.suitableCategories = (ac.suitableCategories || []).map(x => (typeof x === 'object' ? x._id : x))
  // 预填活动粉丝要求作为下限
  criteria.followerMin = ac.followerMin || props.activity.requirementFollowers || 0
  criteria.followerMax = ac.followerMax || 0
}

const handleOpen = async () => {
  loading.value = true
  audienceCount.value = 0
  mode.value = 'multicast'
  prefillCriteria()
  await Promise.all([loadOptions(), loadProducts()])
  await handlePreview()
  loading.value = false
}

const handlePreview = async () => {
  previewing.value = true
  try {
    const res = await request.post('/line/audience/preview', { criteria: { ...criteria } })
    audienceCount.value = res.count || 0
    narrowcastThreshold.value = res.narrowcastThreshold || 50
    if (audienceCount.value < narrowcastThreshold.value && mode.value === 'narrowcast') {
      mode.value = 'multicast'
    }
  } catch (e) {
    // 拦截器已提示
  } finally {
    previewing.value = false
  }
}

const handlePush = async () => {
  try {
    await ElMessageBox.confirm(
      t('linePush.confirmMsg', { count: audienceCount.value }),
      t('linePush.title'),
      { type: 'warning' }
    )
  } catch (e) {
    return
  }
  pushing.value = true
  try {
    const res = await request.post(`/line/activity/${props.activity._id}/push`, {
      productId: selectedProductId.value,
      mode: mode.value,
      criteria: { ...criteria }
    })
    ElMessage.success(t('linePush.pushSuccess', { count: res.recipientCount || audienceCount.value }))
    emit('pushed', res)
    emit('update:modelValue', false)
  } catch (e) {
    // 拦截器已提示
  } finally {
    pushing.value = false
  }
}

watch(() => selectedProductId.value, () => {})
</script>

<style scoped>
.push-body {
  min-height: 320px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #5e417e;
  margin-bottom: 14px;
  padding-left: 8px;
  border-left: 3px solid #775999;
}
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.range-sep {
  color: #909399;
}
.audience-count {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #faf5ff;
  border-radius: 8px;
}
.count-text {
  font-size: 13px;
  color: #606266;
}
.count-text strong {
  color: #775999;
  font-size: 16px;
}
.flex-preview {
  border: 1px solid #e8e4ef;
  border-radius: 12px;
  overflow: hidden;
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(119, 89, 153, 0.12);
}
.flex-hero img {
  width: 100%;
  display: block;
  aspect-ratio: 20 / 13;
  object-fit: cover;
}
.flex-hero.placeholder {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2edf7;
  color: #b0a3c4;
}
.flex-content {
  padding: 14px;
}
.flex-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.flex-price {
  font-size: 14px;
  font-weight: 700;
  color: #775999;
  margin-bottom: 12px;
}
.flex-btn {
  background: #775999;
  color: #fff;
  text-align: center;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
}
</style>
