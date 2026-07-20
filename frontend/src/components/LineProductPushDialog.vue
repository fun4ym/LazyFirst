<template>
  <el-dialog
    v-model="visible"
    :title="$t('linePush.productPushTitle')"
    width="540px"
    @open="onOpen"
    @closed="onClosed"
  >
    <div v-loading="loadingOptions || pushing">
      <!-- 产品信息 -->
      <div v-if="product" class="product-head">
        <img v-if="previewCard.img" :src="previewCard.img" class="product-thumb" />
        <div class="product-meta">
          <div class="product-name">{{ previewCard.name || '-' }}</div>
          <div class="product-sub">
            <span v-if="previewCard.price" class="price">{{ previewCard.currency }} {{ Number(previewCard.price).toLocaleString() }}</span>
            <span v-if="previewCard.commission != null" class="commission">佣金 {{ previewCard.commission }}%</span>
          </div>
        </div>
      </div>

      <!-- 受众条件 -->
      <div class="section-label">{{ $t('linePush.audienceSection') }}</div>
      <div class="field">
        <div class="label">{{ $t('linePush.categoryTags') }}</div>
        <el-select v-model="criteria.categoryTags" multiple filterable :placeholder="$t('linePush.any')" style="width:100%">
          <el-option v-for="t in categoryTagOptions" :key="t._id" :label="t.name" :value="t._id" />
        </el-select>
      </div>
      <div class="field">
        <div class="label">{{ $t('linePush.suitableCategories') }}</div>
        <el-select v-model="criteria.suitableCategories" multiple filterable :placeholder="$t('linePush.any')" style="width:100%">
          <el-option v-for="c in suitableCategoryOptions" :key="c._id" :label="c.name" :value="c._id" />
        </el-select>
      </div>
      <div class="field">
        <div class="label">{{ $t('linePush.followerRange') }}</div>
        <div class="follower-row">
          <el-input v-model="criteria.followerMin" type="number" :placeholder="$t('linePush.any')" />
          <span class="tilde">~</span>
          <el-input v-model="criteria.followerMax" type="number" :placeholder="$t('linePush.any')" />
        </div>
      </div>

      <!-- 预估人数 -->
      <div class="reach">
        {{ $t('linePush.matched') }} <b>{{ audienceCount }}</b> {{ $t('linePush.people') }}
        <el-button link type="primary" size="small" :loading="loadingCount" @click="loadAudience">{{ $t('linePush.previewCount') }}</el-button>
      </div>

      <!-- 卡片预览 -->
      <div class="section-label">{{ $t('linePush.previewSection') }}</div>
      <div class="preview-card">
        <div class="preview-hero" :style="previewCard.img ? { backgroundImage: `url(${previewCard.img})` } : {}">
          <span class="preview-badge">🆕 NEW ARRIVAL</span>
        </div>
        <div class="preview-body">
          <div class="preview-title">{{ previewCard.name || '-' }}</div>
          <div class="preview-row"><span>💰 价格</span><b>{{ previewCard.price ? previewCard.currency + ' ' + Number(previewCard.price).toLocaleString() : 'TBD' }}</b></div>
          <div v-if="previewCard.commission != null" class="preview-row"><span>🤝 佣金</span><b class="green">{{ previewCard.commission }}%</b></div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :disabled="audienceCount === 0" :loading="pushing" @click="doPush">
        {{ $t('linePush.confirmPush') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';
const props = defineProps({
  modelValue: Boolean,
  product: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
});

const categoryTagOptions = ref([]);
const suitableCategoryOptions = ref([]);
const loadingOptions = ref(false);
const loadingCount = ref(false);
const pushing = ref(false);
const audienceCount = ref(0);
const loaded = ref(false);

const criteria = reactive({
  categoryTags: [],
  suitableCategories: [],
  followerMin: '',
  followerMax: ''
});

const previewCard = computed(() => {
  const p = props.product || {};
  const img = (p.images && p.images[0]) || (p.productImages && p.productImages[0]) || '';
  const price = p.price || p.priceRangeMin || '';
  const commission = p.commissionRate != null
    ? p.commissionRate
    : (p.activityConfigs && p.activityConfigs[0] && p.activityConfigs[0].promotionInfluencerRate);
  return { img, name: p.name || '', price, currency: p.currency || 'THB', commission };
});

async function loadOptions() {
  loadingOptions.value = true;
  try {
    const [tags, cats] = await Promise.all([
      request.get(`/base-data?type=categoryTags`),
      request.get(`/base-data?type=suitableCategories`)
    ]);
    categoryTagOptions.value = tags.data?.list || [];
    suitableCategoryOptions.value = cats.data?.list || [];
  } catch (e) {
    if (e.response?.status !== 401) console.warn('加载选项失败', e);
  } finally {
    loadingOptions.value = false;
  }
}

function buildQuery() {
  const q = {};
  if (criteria.categoryTags.length) q.categoryTags = criteria.categoryTags.join(',');
  if (criteria.suitableCategories.length) q.suitableCategories = criteria.suitableCategories.join(',');
  if (criteria.followerMin) q.followerMin = criteria.followerMin;
  if (criteria.followerMax) q.followerMax = criteria.followerMax;
  return q;
}

async function loadAudience() {
  if (!props.product) return;
  loadingCount.value = true;
  try {
    const { data } = await request.get(`/line/audience/preview`, { params: buildQuery() });
    audienceCount.value = data.count || 0;
  } catch (e) {
    audienceCount.value = 0;
  } finally {
    loadingCount.value = false;
  }
}

async function doPush() {
  if (!props.product) return;
  if (audienceCount.value === 0) {
    ElMessage.warning($t('linePush.noProduct'));
    return;
  }
  pushing.value = true;
  try {
    const { data } = await request.post(`/line/product/${props.product._id}/push`, {
      mode: 'multicast',
      criteria: buildQuery()
    });
    ElMessage.success($t('linePush.pushSuccess', { count: data.recipientCount }));
    visible.value = false;
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.message) || '推送失败');
  } finally {
    pushing.value = false;
  }
}

function onOpen() {
  if (!loaded.value) {
    loadOptions().then(() => { loaded.value = true; });
  }
  loadAudience();
}

function onClosed() {
  audienceCount.value = 0;
}
</script>

<style scoped>
.product-head { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.product-thumb { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: #f0f0f0; }
.product-name { font-weight: 700; font-size: 15px; }
.product-sub { margin-top: 4px; display: flex; gap: 10px; align-items: center; }
.product-sub .price { color: #E53935; font-weight: 700; }
.product-sub .commission { color: #2E7D32; font-weight: 700; }
.section-label { font-weight: 700; color: #555; margin: 14px 0 8px; }
.field { margin-bottom: 10px; }
.label { font-size: 13px; color: #888; margin-bottom: 4px; }
.follower-row { display: flex; align-items: center; gap: 8px; }
.follower-row .tilde { color: #999; }
.reach { margin: 8px 0 4px; color: #666; font-size: 13px; }
.reach b { color: #775999; font-size: 15px; }
.preview-card { border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; }
.preview-hero { height: 150px; background: #e9e9ef center/cover no-repeat; position: relative; }
.preview-badge { position: absolute; top: 8px; left: 8px; background: #6A1B9A; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.preview-body { padding: 12px; }
.preview-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.preview-row { display: flex; justify-content: space-between; font-size: 13px; color: #555; margin: 4px 0; }
.preview-row .green { color: #2E7D32; }
</style>
