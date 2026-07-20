<template>
  <el-dialog v-model="visible" :title="$t('lineRecords.title')" width="820px" @open="onOpen">
    <div v-loading="loading">
      <el-tabs v-model="activeType" @tab-change="onTypeChange">
        <el-tab-pane :label="$t('lineRecords.tabAll')" name="" />
        <el-tab-pane :label="$t('lineRecords.tabCampaign')" name="campaign" />
        <el-tab-pane :label="$t('lineRecords.tabProduct')" name="product" />
      </el-tabs>

      <el-table :data="records" empty-text="$t('lineRecords.empty')" stripe style="width:100%">
        <el-table-column :label="$t('lineRecords.colTime')" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="$t('lineRecords.colType')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'campaign' ? 'primary' : 'success'" size="small">
              {{ row.type === 'campaign' ? $t('lineRecords.typeCampaign') : $t('lineRecords.typeProduct') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('lineRecords.colTarget')" prop="refName" min-width="140" show-overflow-tooltip />
        <el-table-column :label="$t('lineRecords.colOperator')" prop="operatorName" width="110" />
        <el-table-column :label="$t('lineRecords.colAudience')" min-width="180">
          <template #default="{ row }">{{ audienceSummary(row.audienceCriteria) }}</template>
        </el-table-column>
        <el-table-column :label="$t('lineRecords.colRecipient')" width="100" align="center">
          <template #default="{ row }">{{ row.recipientCount }}</template>
        </el-table-column>
        <el-table-column :label="$t('lineRecords.colStatus')" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'"
              size="small"
            >{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        class="pager"
        layout="prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="onPage"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import request from '@/utils/request';
const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
});

const activeType = ref('');
const records = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const categoryTagOptions = ref([]);
const suitableCategoryOptions = ref([]);

const categoryMap = computed(() => {
  const m = {};
  categoryTagOptions.value.forEach(t => { m[t._id] = t.name; });
  return m;
});
const categoryMap2 = computed(() => {
  const m = {};
  suitableCategoryOptions.value.forEach(c => { m[c._id] = c.name; });
  return m;
});

async function loadOptions() {
  try {
    const [tags, cats] = await Promise.all([
      request.get(`/base-data?type=categoryTags`),
      request.get(`/base-data?type=suitableCategories`)
    ]);
    categoryTagOptions.value = tags.data?.list || [];
    suitableCategoryOptions.value = cats.data?.list || [];
  } catch (e) { /* ignore */ }
}

async function loadRecords() {
  loading.value = true;
  try {
    const { data } = await request.get(`/line/push-records`, {
      params: { type: activeType.value, page: page.value, pageSize: pageSize.value }
    });
    records.value = data.records || [];
    total.value = data.total || 0;
  } catch (e) {
    records.value = [];
  } finally {
    loading.value = false;
  }
}

function formatTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function audienceSummary(c) {
  if (!c) return '';
  const parts = [];
  if (c.categoryTags && c.categoryTags.length) {
    parts.push('标签: ' + c.categoryTags.map(id => categoryMap.value[id] || id).join(', '));
  }
  if (c.suitableCategories && c.suitableCategories.length) {
    parts.push('品类: ' + c.suitableCategories.map(id => categoryMap2.value[id] || id).join(', '));
  }
  if (c.followerMin || c.followerMax) {
    const min = c.followerMin || '0';
    const max = c.followerMax || '∞';
    parts.push(`粉丝: ${min}~${max}`);
  }
  return parts.length ? parts.join(' ｜ ') : '';
}

function statusText(s) {
  if (s === 'success') return $t('lineRecords.statusSuccess');
  if (s === 'failed') return $t('lineRecords.statusFailed');
  return $t('lineRecords.statusPartial');
}

function onTypeChange() {
  page.value = 1;
  loadRecords();
}
function onPage(p) {
  page.value = p;
  loadRecords();
}
function onOpen() {
  page.value = 1;
  loadOptions();
  loadRecords();
}
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
</style>
