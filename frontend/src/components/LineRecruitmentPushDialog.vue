<template>
  <el-dialog
    v-model="visible"
    :title="$t('linePush.recruitmentPushTitle')"
    width="540px"
    @open="onOpen"
    @closed="onClosed"
  >
    <div v-loading="loadingOptions || pushing">
      <!-- 招募信息 -->
      <div v-if="recruitment" class="recruit-head">
        <div class="recruit-meta">
          <div class="recruit-name">{{ recruitment.name || '-' }}</div>
          <div class="recruit-desc" v-if="recruitment.description">{{ recruitment.description }}</div>
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
        <div class="preview-hero recruitment"><span class="preview-badge">📣 招募来袭</span></div>
        <div class="preview-body">
          <div class="preview-title">{{ previewCard.name || '-' }}</div>
          <div class="preview-desc" v-if="previewCard.description">{{ previewCard.description }}</div>
          <div class="preview-row" v-if="previewCard.requirementText"><span>📋 要求</span><b>{{ previewCard.requirementText }}</b></div>
          <div class="preview-row" v-if="previewCard.productCount"><span>🛍️ 商品</span><b>{{ previewCard.productCount }} 件</b></div>
          <div class="preview-rate" v-if="rateInfo">
            <div class="rate-main">综合费率 <b>{{ rateInfo.rate }}%</b></div>
            <div class="rate-diff" :class="rateInfo.diff > 0 ? 'up' : (rateInfo.diff < 0 ? 'down' : 'flat')">
              <template v-if="rateInfo.diff > 0">高于广场 {{ rateInfo.diff }}%</template>
              <template v-else-if="rateInfo.diff < 0">低于广场 {{ Math.abs(rateInfo.diff) }}%</template>
              <template v-else>与广场持平</template>
            </div>
          </div>
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
import { ElMessage, ElMessageBox } from 'element-plus';
const props = defineProps({
  modelValue: Boolean,
  recruitment: { type: Object, default: null }
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
  const r = props.recruitment || {};
  const reqs = [];
  if (r.requirementGmv) reqs.push(`GMV≥${r.requirementGmv}`);
  if (r.requirementFollowers) reqs.push(`FV≥${r.requirementFollowers}K`);
  if (r.requirementMonthlySales) reqs.push(`MSS≥${r.requirementMonthlySales}`);
  if (r.requirementAvgViews) reqs.push(`APV≥${r.requirementAvgViews}`);
  return {
    name: r.name || '',
    description: r.description || '',
    requirementText: reqs.join(' | '),
    productCount: (r.products && r.products.length) || 0
  };
});

// 综合费率 = 该招募下各商品「推广佣金率」均值；高于广场 = 推广佣金率 - 广场佣金率（百分点）
const rateInfo = computed(() => {
  const products = (props.recruitment && props.recruitment.products) || [];
  const rates = products.map(p => {
    const cfg = (p.activityConfigs && p.activityConfigs.length)
      ? (p.activityConfigs.find(a => a.isDefault) || p.activityConfigs[0])
      : null;
    const promo = (cfg && cfg.promotionInfluencerRate != null) ? Number(cfg.promotionInfluencerRate) : (p.promotionInfluencerRate != null ? Number(p.promotionInfluencerRate) : 0);
    const square = (cfg && cfg.squareCommissionRate != null) ? Number(cfg.squareCommissionRate) : (p.squareCommissionRate != null ? Number(p.squareCommissionRate) : 0);
    return { promo, square };
  }).filter(r => r.promo > 0 || r.square > 0);
  if (!rates.length) return null;
  const avgPromo = rates.reduce((s, r) => s + r.promo, 0) / rates.length;
  const avgSquare = rates.reduce((s, r) => s + r.square, 0) / rates.length;
  const round1 = v => Math.round(v * 10) / 10;
  return { rate: round1(avgPromo * 100), diff: round1((avgPromo - avgSquare) * 100) };
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
  if (!props.recruitment) return;
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
  if (!props.recruitment) return;
  if (audienceCount.value === 0) {
    ElMessage.warning('暂无可推送达人');
    return;
  }
  try {
    await ElMessageBox.confirm(
      $t('linePush.recruitmentPushConfirm', { count: audienceCount.value }),
      $t('linePush.recruitmentPushTitle'),
      { type: 'warning' }
    );
  } catch {
    return;
  }
  pushing.value = true;
  try {
    const { data } = await request.post(`/line/recruitment/${props.recruitment._id}/push`, {
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
.recruit-head { margin-bottom: 12px; }
.recruit-name { font-weight: 700; font-size: 15px; }
.recruit-desc { margin-top: 4px; font-size: 13px; color: #666; line-height: 1.5; }
.section-label { font-weight: 700; color: #555; margin: 14px 0 8px; }
.field { margin-bottom: 10px; }
.label { font-size: 13px; color: #888; margin-bottom: 4px; }
.follower-row { display: flex; align-items: center; gap: 8px; }
.follower-row .tilde { color: #999; }
.reach { margin: 8px 0 4px; color: #666; font-size: 13px; }
.reach b { color: #775999; font-size: 15px; }
.preview-card { border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; }
.preview-hero { height: 150px; position: relative; }
.preview-hero.recruitment { background: linear-gradient(135deg, #6A1B9A, #8E24AA); }
.preview-badge { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.35); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.preview-body { padding: 12px; }
.preview-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.preview-desc { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 8px; }
.preview-row { display: flex; justify-content: space-between; font-size: 13px; color: #555; margin: 4px 0; }
.preview-rate { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: #F3EDFA; border: 1px solid #E1D4F2; }
.rate-main { font-size: 13px; color: #6A1B9A; font-weight: 700; }
.rate-main b { font-size: 18px; margin-left: 4px; }
.rate-diff { font-size: 12px; font-weight: 700; margin-top: 2px; text-align: right; }
.rate-diff.up { color: #2E7D32; }
.rate-diff.down { color: #C62828; }
.rate-diff.flat { color: #757575; }
</style>
