<template>
  <div class="activities-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('activities:create')">
            <el-icon><Plus /></el-icon>
            {{ $t('activities.create') }}
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('activities.activityName')">
          <el-input
            v-model="searchForm.name"
            :placeholder="$t('activities.placeholder.activityName')"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item :label="$t('activities.activityType')">
          <el-select v-model="searchForm.type" :placeholder="$t('activities.placeholder.all')" clearable style="width: 150px">
            <el-option :label="$t('activities.selfInitiated')" value="self_initiated" />
            <el-option :label="$t('activities.merchantInitiated')" value="merchant_initiated" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('activities.status')">
          <el-select v-model="searchForm.status" :placeholder="$t('activities.placeholder.all')" clearable style="width: 120px">
            <el-option :label="$t('activities.pending')" value="pending" />
            <el-option :label="$t('activities.upcoming')" value="upcoming" />
            <el-option :label="$t('activities.active')" value="active" />
            <el-option :label="$t('activities.ended')" value="ended" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadActivities">{{ $t('activities.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('activities.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="activities" v-loading="loading" stripe>
        <el-table-column :label="$t('activities.tikTokActivity')" width="320" fixed="left">
          <template #default="{ row }">
            <div class="tiktok-activity-cell">
              <a 
                v-if="row.tikTokActivityId"
                :href="'https://partner.tiktokshop.com/affiliate-campaign/partner-collabs/agency/detail?campaign_id=' + row.tikTokActivityId"
                target="_blank"
                class="tiktok-link"
              >
                {{ row.tikTokActivityId }}
              </a>
              <span v-else>-</span>
              <span class="activity-name-cell">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('activities.participationProducts')" width="120" align="center">
          <template #default="{ row }">
            <el-popover
              placement="right"
              :width="500"
              trigger="hover"
              @show="loadActivityProducts(row)"
            >
              <template #reference>
                <el-tag
                  :type="(productCounts[row._id] || 0) > 0 ? 'success' : 'info'"
                  class="product-count-tag"
                  @click="goToProductPage(row)"
                  style="cursor: pointer"
                >
                  <el-icon><Goods /></el-icon>
                  {{ productCounts[row._id] || 0 }}
                </el-tag>
              </template>
              <div class="product-popover">
                <div class="popover-header">
                  <span>{{ $t('activities.participationProducts') }}</span>
                  <el-button link type="primary" @click="goToProductPage(row)">
                    {{ $t('activities.viewDetail') }} <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </div>
                <div v-if="loadingProducts[row._id]" class="loading-tip">{{ $t('activities.loadingProducts') }}</div>
                <div v-else-if="activityProducts[row._id]?.length > 0" class="product-list">
                  <div class="product-list-header">
                    <span class="product-col-title">{{ $t('activities.participationProducts') }}</span>
                    <span class="link-col-title">{{ $t('activities.promotionLink') }}</span>
                  </div>
                  <div
                    v-for="product in getPaginatedProducts(row)"
                    :key="product._id"
                    class="product-item"
                    @click="viewProductDetail(product)"
                  >
                    <span class="product-info">
                      <span class="product-id">{{ product.tiktokProductId || product.productId || '-' }}</span>
                      <span class="product-name">{{ product.name || product.productName || '-' }}</span>
                    </span>
                    <span class="product-link">
                      <a 
                        v-if="product._cachedLink"
                        :href="product._cachedLink" 
                        target="_blank" 
                        class="product-link-a"
                        @click.stop
                      >
                        {{ $t('activities.view') }}
                      </a>
                      <el-icon 
                        v-if="product._cachedLink"
                        class="copy-icon" 
                        @click.stop="copyActivityLink(product)"
                        :title="`${$t('activities.copyLink')}: ${product._cachedLink}`"
                      >
                        <DocumentCopy />
                      </el-icon>
                    </span>
                  </div>
                  <div class="pagination-container" v-if="productCounts[row._id] > 5">
                    <el-pagination
                      small
                      :current-page="productPagination[row._id]?.page || 1"
                      :page-size="5"
                      :total="productCounts[row._id] || 0"
                      layout="prev, pager, next"
                      @current-change="(page) => handleProductPageChange(row, page)"
                    />
                  </div>
                </div>
                <div v-else class="empty-tip">{{ $t('activities.noProducts') }}</div>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="type" :label="$t('activities.activityTypeCol')" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('activities.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isDeleted ? 'danger' : 'success'">
              {{ row.isDeleted ? $t('activities.deleted') : $t('activities.normal') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" :label="$t('activities.startDate')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" :label="$t('activities.endDate')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('activities.createdAt')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="creatorName" :label="$t('activities.creator')" width="120" />
        <el-table-column :label="$t('activities.operations')" fixed="right" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)" v-if="hasPermission('activities:read')">{{ $t('activities.viewDetail') }}</el-button>
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('activities:update')">{{ $t('activities.editBtn') }}</el-button>
            <el-button link type="success" @click="showImportDialog(row)" v-if="hasPermission('activities:btn-import-products')">{{ $t('activities.importProducts') }}</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('activities:delete')">{{ $t('activities.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadActivities"
        @current-change="loadActivities"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? $t('activities.edit') : $t('activities.create')"
      width="700px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item :label="$t('activities.tikTokActivityId')" class="tiktok-id-label">
          <el-input v-model="form.tikTokActivityId" :placeholder="$t('activities.tikTokActivityId')" class="tiktok-id-input" />
        </el-form-item>

        <el-form-item :label="$t('activities.activityName')" prop="name">
          <el-input v-model="form.name" :placeholder="$t('activities.placeholder.activityName')" />
        </el-form-item>

        <el-form-item :label="$t('activities.activityType')" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="self_initiated">{{ $t('activities.selfInitiated') }}</el-radio>
            <el-radio value="merchant_initiated">{{ $t('activities.merchantInitiated') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('activities.startDate')" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="datetime"
                :placeholder="$t('activities.selectStartTime')"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.endDate')" prop="endDate">
              <el-date-picker
                v-model="form.endDate"
                type="datetime"
                :placeholder="$t('activities.selectEndTime')"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 活动配置 -->
        <el-divider content-position="left">{{ $t('activities.sectionActivityConfig') }}</el-divider>
        <el-form-item :label="$t('activities.tapLink')">
          <el-input v-model="form.tapLink" :placeholder="$t('activities.tapLinkPlaceholder')" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('activities.sampleMethod')">
              <el-select v-model="form.sampleMethod" :placeholder="$t('activities.selectSampleMethod')" style="width: 100%">
                <el-option :label="$t('activities.online')" value="线上" />
                <el-option :label="$t('activities.offline')" value="线下" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.cooperationCountry')">
              <el-select v-model="form.cooperationCountry" :placeholder="$t('activities.selectCooperationCountry')" clearable style="width: 100%">
                <el-option
                  v-for="country in countryList"
                  :key="country._id"
                  :label="country.name"
                  :value="country.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 达人要求（预配置） -->
        <el-divider content-position="left">
          <span class="pre-config-label">{{ $t('activities.sectionInfluencerRequirement') }}</span>
          <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
        </el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('activities.gmv')">
              <el-input-number v-model="form.requirementGmv" :min="0" :placeholder="$t('activities.gmvPlaceholder')" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.currencyUnit')">
              <el-select v-model="form.gmvCurrency" :placeholder="$t('activities.selectCurrency')" style="width: 100%">
                <el-option
                  v-for="item in currencyList"
                  :key="item._id"
                  :label="item.name"
                  :value="item.code"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.monthlySales')">
              <el-input-number v-model="form.requirementMonthlySales" :min="0" :placeholder="$t('activities.monthlySalesPlaceholder')" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.followers')">
              <el-input-number v-model="form.requirementFollowers" :min="0" :placeholder="$t('activities.followersPlaceholder')" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('activities.avgViews')">
              <el-input-number v-model="form.requirementAvgViews" :min="0" :placeholder="$t('activities.avgViewsPlaceholder')" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('activities.requirementRemark')">
          <el-input v-model="form.requirementRemark" type="textarea" :rows="2" :placeholder="$t('activities.requirementRemarkPlaceholder')" />
        </el-form-item>

        <!-- 佣金配置 - 推广时（预配置） -->
        <el-divider content-position="left">
          <span class="pre-config-label">{{ $t('activities.promotionCommission') }}</span>
          <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
        </el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item :label="$t('activities.influencerRate')">
              <el-input-number v-model="form.promotionInfluencerRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('activities.originalRate')">
              <el-input-number v-model="form.promotionOriginalRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('activities.companyRate')">
              <el-input-number v-model="form.promotionCompanyRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 佣金配置 - 投广告时（预配置） -->
        <el-divider content-position="left">
          <span class="pre-config-label">{{ $t('activities.adCommission') }}</span>
          <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
        </el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item :label="$t('activities.influencerRate')">
              <el-input-number v-model="form.adInfluencerRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('activities.originalRate')">
              <el-input-number v-model="form.adOriginalRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('activities.companyRate')">
              <el-input-number v-model="form.adCompanyRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('activities.activityDescription')">
          <el-input v-model="form.description" type="textarea" :rows="3" :placeholder="$t('activities.activityDescriptionPlaceholder')" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('activities.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">{{ $t('activities.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="$t('activities.detail')" width="700px">
      <el-descriptions :column="2" border v-if="currentActivity">
        <el-descriptions-item :label="$t('activities.tikTokActivityId')" class-name="tiktok-id-label">
          {{ currentActivity.tikTokActivityId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.activityName')">
          {{ currentActivity.name }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.activityTypeCol')">
          <el-tag :type="getTypeTagType(currentActivity.type)">
            {{ getTypeText(currentActivity.type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.status')">
          <el-tag :type="getStatusType(currentActivity.status)">
            {{ getStatusText(currentActivity.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.startDate')">
          {{ formatDate(currentActivity.startDate) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.endDate')">
          {{ formatDate(currentActivity.endDate) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 活动配置 -->
      <el-divider content-position="left">{{ $t('activities.sectionActivityConfig') }}</el-divider>
      <el-descriptions :column="2" border v-if="currentActivity">
        <el-descriptions-item :label="$t('activities.tapLink')" :span="2">
          {{ currentActivity.tapLink || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.sampleMethod')">
          {{ currentActivity.sampleMethod || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.cooperationCountry')">
          {{ currentActivity.cooperationCountry || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 达人要求（预配置） -->
      <el-divider content-position="left">
        <span class="pre-config-label">{{ $t('activities.sectionInfluencerRequirement') }}</span>
        <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
      </el-divider>
      <el-descriptions :column="2" border v-if="currentActivity">
        <el-descriptions-item :label="$t('activities.gmv')">
          {{ currentActivity.requirementGmv || 0 }} {{ currentActivity.gmvCurrency || '' }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.currencyUnit')">
          {{ currentActivity.gmvCurrency || '-' }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.monthlySales')">
          {{ currentActivity.requirementMonthlySales || 0 }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.followers')">
          {{ currentActivity.requirementFollowers || 0 }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.avgViews')">
          {{ currentActivity.requirementAvgViews || 0 }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.requirementRemark')" :span="2">
          {{ currentActivity.requirementRemark || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 佣金配置 - 推广时（预配置） -->
      <el-divider content-position="left">
        <span class="pre-config-label">{{ $t('activities.promotionCommission') }}</span>
        <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
      </el-divider>
      <el-descriptions :column="3" border v-if="currentActivity">
        <el-descriptions-item :label="$t('activities.influencerRate')">
          {{ currentActivity.promotionInfluencerRate || 0 }}%
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.originalRate')">
          {{ currentActivity.promotionOriginalRate || 0 }}%
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.companyRate')">
          {{ currentActivity.promotionCompanyRate || 0 }}%
        </el-descriptions-item>
      </el-descriptions>

      <!-- 佣金配置 - 投广告时（预配置） -->
      <el-divider content-position="left">
        <span class="pre-config-label">{{ $t('activities.adCommission') }}</span>
        <el-tag type="warning" size="small" style="margin-left: 8px">{{ $t('activities.preConfig') }}</el-tag>
      </el-divider>
      <el-descriptions :column="3" border v-if="currentActivity">
        <el-descriptions-item :label="$t('activities.influencerRate')">
          {{ currentActivity.adInfluencerRate || 0 }}%
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.originalRate')">
          {{ currentActivity.adOriginalRate || 0 }}%
        </el-descriptions-item>
        <el-descriptions-item :label="$t('activities.companyRate')">
          {{ currentActivity.adCompanyRate || 0 }}%
        </el-descriptions-item>
      </el-descriptions>

      <!-- 活动描述 -->
      <el-divider content-position="left">{{ $t('activities.activityDescription') }}</el-divider>
      <div class="detail-description" v-if="currentActivity">
        {{ currentActivity.description || '-' }}
      </div>

      <!-- 变更历史 -->
      <el-divider content-position="left">
        {{ $t('activities.sectionHistory') }}
        <el-button link type="primary" @click="loadHistory" style="margin-left: 10px">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-divider>
      <el-table :data="histories" stripe v-loading="historyLoading" size="small">
        <el-table-column prop="action" :label="$t('activities.status')" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)">
              {{ getActionText(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changedByName" :label="$t('activities.creator')" width="120" />
        <el-table-column prop="changes" :label="$t('activities.activityDescription')" min-width="150">
          <template #default="{ row }">
            <el-tag
              v-for="(value, key) in row.changes"
              :key="key"
              style="margin-right: 4px; margin-bottom: 4px"
              size="small"
            >
              {{ getFieldName(key) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="$t('activities.startDate')" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 商品详情对话框 -->
    <el-dialog v-model="productDetailVisible" :title="$t('activities.productDetail')" width="900px" :close-on-click-modal="false" class="product-detail-dialog">
      <div v-if="currentProduct" class="detail-wrapper">
        <!-- 商品头部 -->
        <div class="detail-head">
          <div class="head-main">
            <span class="head-id">{{ currentProduct.tiktokProductId || currentProduct.productId || '-' }}</span>
            <h3 class="head-title">{{ currentProduct.name || currentProduct.productName || '-' }}</h3>
          </div>
          <el-tag :type="currentProduct.status === 'active' ? 'success' : 'info'">{{ currentProduct.status === 'active' ? $t('activities.enabled') : $t('activities.disabled') }}</el-tag>
        </div>

        <!-- 基本信息 -->
        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item :label="$t('activities.sku')">{{ currentProduct.sku || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('activities.shop')">{{ currentProduct.shopId?.shopName || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('activities.productCategory')">{{ currentProduct.productCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('activities.squareCommissionRate')">{{ currentProduct.squareCommissionRate ? (currentProduct.squareCommissionRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('activities.sellingPrice')" class-name="price-cell">
            {{ currentProduct.sellingPrice ? currentProduct.sellingPrice + ' ' + (currentProduct.currency || 'USD') : '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('activities.priceRange')" :span="2" class-name="price-cell">
            {{ currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0 ? currentProduct.priceRangeMin : '-' }}
            {{ (currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0) && (currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0) ? ' - ' : '' }}
            {{ currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0 ? currentProduct.priceRangeMax + ' ' + (currentProduct.currency || 'USD') : '' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 商品说明 -->
        <div v-if="currentProduct.productIntro || currentProduct.referenceVideo || currentProduct.sellingPoints" class="detail-section">
          <div class="section-title">{{ $t('activities.productIntro') }}</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-if="currentProduct.productIntro" :label="$t('activities.intro')">{{ currentProduct.productIntro }}</el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.referenceVideo" :label="$t('activities.video')">
              <a :href="currentProduct.referenceVideo" target="_blank" class="link-text">{{ currentProduct.referenceVideo }}</a>
            </el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.sellingPoints" :label="$t('activities.sellingPoints')">{{ currentProduct.sellingPoints }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 参与活动 -->
        <div v-if="currentProduct.activityConfigs && currentProduct.activityConfigs.length > 0" class="detail-section">
          <div class="section-title">{{ $t('activities.participatedActivities') }} <span class="section-count">({{ currentProduct.activityConfigs.length }})</span></div>
          <div v-for="(ac, index) in currentProduct.activityConfigs" :key="index" class="activity-block">
            <div class="activity-title">
              <span class="activity-tag">{{ ac.activityId?.tikTokActivityId || '-' }}</span>
              <span class="activity-name">{{ ac.activityId?.name || '-' }}</span>
            </div>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item :label="$t('activities.activityLink')" :span="3">
                <a v-if="ac.activityLink" :href="ac.activityLink" target="_blank" class="link-text">{{ ac.activityLink }}</a>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item :label="$t('activities.gmv')">{{ ac.requirementGmv ? ac.requirementGmv + ' ' + (ac.gmvCurrency || currentProduct.currency || 'USD') : '-' }}</el-descriptions-item>
              <el-descriptions-item :label="$t('activities.monthlySalesCount')">{{ ac.requirementMonthlySales || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('activities.followers')">{{ ac.requirementFollowers || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('activities.monthlyAvgViews')">{{ ac.requirementAvgViews || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('activities.sampleMethod')">{{ ac.sampleMethod || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="$t('activities.cooperationCountry')">{{ ac.cooperationCountry || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="commission-row">
              <div class="commission-item">
                <span class="commission-label">{{ $t('activities.promotionCommissionRate') }}</span>
                <div class="commission-rates">
                  <span>{{ $t('activities.influencer') }} {{ ac.promotionInfluencerRate ? (ac.promotionInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('activities.original') }} {{ ac.promotionOriginalRate ? (ac.promotionOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('activities.company') }} {{ ac.promotionCompanyRate ? (ac.promotionCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
              <div class="commission-item">
                <span class="commission-label">{{ $t('activities.adCommissionRate') }}</span>
                <div class="commission-rates">
                  <span>{{ $t('activities.influencer') }} {{ ac.adInfluencerRate ? (ac.adInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('activities.original') }} {{ ac.adOriginalRate ? (ac.adOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('activities.company') }} {{ ac.adCompanyRate ? (ac.adCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-section">
          <el-empty :description="$t('activities.noParticipation')" :image-size="60" />
        </div>
      </div>
    </el-dialog>

    <!-- 导入商品对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      :title="$t('activities.importTitle')"
      width="600px"
    >
      <div class="import-tips">
        <p><strong>{{ $t('activities.importSteps') }}:</strong></p>
        <ol>
          <li>{{ $t('activities.importStep1') }}</li>
          <li>{{ $t('activities.importStep2') }}</li>
          <li>{{ $t('activities.importStep3') }}</li>
          <li>{{ $t('activities.importStep4') }}</li>
        </ol>
      </div>

      <el-upload
        ref="uploadRef"
        class="import-upload"
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
        accept=".xlsx,.xls"
      >
        <el-button type="primary">
          <el-icon><Upload /></el-icon>
          {{ $t('activities.uploadExcel') }}
        </el-button>
        <template #tip>
          <div class="upload-tip">{{ $t('activities.uploadTip') }}</div>
        </template>
      </el-upload>

      <div v-if="importLoading" class="import-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        {{ $t('activities.importing') }}
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">{{ $t('activities.cancel') }}</el-button>
        <el-button type="primary" @click="handleImport" :loading="importLoading">{{ $t('activities.importConfirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { Plus, Refresh, Upload, Loading, Goods, ArrowRight, DocumentCopy } from '@element-plus/icons-vue'
import AuthManager from '@/utils/auth'

// 权限检查
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const productDetailVisible = ref(false)
const historyLoading = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const activities = ref([])
const currentActivity = ref(null)
const currentProduct = ref(null)
const histories = ref([])

// 活动商品相关
const productCounts = ref({})
const activityProducts = ref({})
const loadingProducts = ref({})
const productPagination = ref({})

// 导入商品相关
const importDialogVisible = ref(false)
const importLoading = ref(false)
const importFile = ref(null)
const currentImportActivity = ref(null)

const searchForm = reactive({
  name: '',
  type: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const form = reactive({
  tikTokActivityId: '',
  name: '',
  type: 'self_initiated',
  tapLink: '',
  sampleMethod: '线上',
  cooperationCountry: '',
  startDate: '',
  endDate: '',
  description: '',
  // 达人要求
  requirementGmv: 0,
  gmvCurrency: '',
  requirementMonthlySales: 0,
  requirementFollowers: 0,
  requirementAvgViews: 0,
  requirementRemark: '',
  // 佣金配置 - 推广时
  promotionInfluencerRate: 0,
  promotionOriginalRate: 0,
  promotionCompanyRate: 0,
  // 佣金配置 - 投广告时
  adInfluencerRate: 0,
  adOriginalRate: 0,
  adCompanyRate: 0
})

// 国家列表
const countryList = ref([])

// 货币单位列表
const currencyList = ref([])

const loadCountries = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'country', limit: 100 }
    })
    countryList.value = res.data || []
    // 设置默认国家
    const defaultCountry = countryList.value.find(c => c.isDefault)
    if (defaultCountry) {
      form.cooperationCountry = defaultCountry.name
    }
  } catch (error) {
    console.error('Load countries error:', error)
  }
}

const loadCurrencies = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'priceUnit', limit: 100 }
    })
    currencyList.value = res.data || []
    // 设置默认货币
    const defaultCurrency = currencyList.value.find(c => c.isDefault)
    if (defaultCurrency) {
      form.gmvCurrency = defaultCurrency.code
    }
  } catch (error) {
    console.error('Load currencies error:', error)
  }
}

const rules = {
  name: [
    { required: true, message: () => t('activities.validateNameRequired'), trigger: 'blur' }
  ],
  startDate: [
    { required: true, message: () => t('activities.validateStartDateRequired'), trigger: 'change' }
  ],
  endDate: [
    { required: true, message: () => t('activities.validateEndDateRequired'), trigger: 'change' }
  ]
}

const formatMoney = (value) => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

const getTypeText = (type) => {
  const texts = {
    self_initiated: t('activities.selfInitiated'),
    merchant_initiated: t('activities.merchantInitiated')
  }
  return texts[type] || type
}

const getTypeTagType = (type) => {
  const types = {
    self_initiated: 'primary',
    merchant_initiated: 'success'
  }
  return types[type] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: t('activities.pending'),
    upcoming: t('activities.upcoming'),
    active: t('activities.active'),
    ended: t('activities.ended')
  }
  return texts[status] || status
}

const getStatusType = (status) => {
  const types = {
    pending: 'info',
    upcoming: 'warning',
    active: 'success',
    ended: 'info'
  }
  return types[status] || 'info'
}

const getActionText = (action) => {
  const texts = {
    create: t('activities.actionCreate'),
    update: t('activities.actionUpdate'),
    delete: t('activities.actionDelete'),
    status_change: t('activities.actionStatusChange')
  }
  return texts[action] || action
}

const getActionType = (action) => {
  const types = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    status_change: 'warning'
  }
  return types[action] || 'info'
}

// 复制商品链接
const copyProductLink = async (product) => {
  const link = product.productLink
  if (!link) return
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success(t('activities.copySuccess'))
  } catch (error) {
    ElMessage.error(t('activities.copyFailed'))
  }
}

// 获取商品在指定活动中的链接
const getActivityLink = (product, activityId) => {
  if (!product.activityConfigs) return ''
  const targetId = typeof activityId === 'string' ? activityId : activityId._id || activityId.toString()
  const config = product.activityConfigs.find(ac => {
    // ac.activityId可能是ObjectId、字符串、或者被populate后的对象
    const configId = ac.activityId?._id || ac.activityId
    const configIdStr = configId?.toString()
    return configIdStr === targetId
  })
  // 调试日志
  if (config) {
    console.log(`[getActivityLink] target=${targetId}, found link=${config.activityLink}`)
  } else {
    console.log(`[getActivityLink] target=${targetId}, NOT FOUND. activityConfigs=`, JSON.stringify(product.activityConfigs.map(ac => ({
      activityId: ac.activityId?._id || ac.activityId,
      activityLink: ac.activityLink
    }))))
  }
  return config?.activityLink || ''
}

// 复制活动链接
const copyActivityLink = async (product) => {
  const link = product._cachedLink
  if (!link) return
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success(t('activities.copySuccess'))
  } catch (error) {
    ElMessage.error(t('activities.copyFailed'))
  }
}

const getFieldName = (key) => {
  const names = {
    tikTokActivityId: t('activities.tikTokActivityId'),
    name: t('activities.activityNameCol'),
    type: t('activities.activityTypeCol'),
    status: t('activities.status'),
    startDate: t('activities.startDate'),
    endDate: t('activities.endDate'),
    budget: t('activities.budget'),
    description: t('activities.activityDescription'),
    partnerCenter: t('activities.partnerCenter')
  }
  return names[key] || key
}

const loadActivities = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    const res = await request.get('/activities', { params })
    activities.value = res.data?.activities || res.activities || []
    pagination.total = res.data?.pagination?.total || res.pagination?.total || 0
    // 加载完活动后，获取商品数量
    await loadProductCounts()
  } catch (error) {
    console.error('Load activities error:', error)
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
  resetForm()
}

const showEditDialog = (row) => {
  isEdit.value = true
  dialogVisible.value = true
  Object.assign(form, {
    _id: row._id,
    tikTokActivityId: row.tikTokActivityId || '',
    name: row.name,
    type: row.type,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description,
    // 佣金配置
    promotionInfluencerRate: row.promotionInfluencerRate || 0,
    promotionOriginalRate: row.promotionOriginalRate || 0,
    promotionCompanyRate: row.promotionCompanyRate || 0,
    adInfluencerRate: row.adInfluencerRate || 0,
    adOriginalRate: row.adOriginalRate || 0,
    adCompanyRate: row.adCompanyRate || 0,
    // 活动配置
    tapLink: row.tapLink || '',
    cooperationCountry: row.cooperationCountry || '',
    // 达人要求
    requirementGmv: row.requirementGmv || 0,
    gmvCurrency: row.gmvCurrency || '',
    requirementMonthlySales: row.requirementMonthlySales || 0,
    requirementFollowers: row.requirementFollowers || 0,
    requirementAvgViews: row.requirementAvgViews || 0,
    requirementRemark: row.requirementRemark || '',
    sampleMethod: row.sampleMethod || ''
  })
}

const viewDetail = (row) => {
  currentActivity.value = row
  detailDialogVisible.value = true
  loadHistory()
}

const loadHistory = async () => {
  if (!currentActivity.value) return

  historyLoading.value = true
  try {
    const res = await request.get(`/activities/${currentActivity.value._id}/history`)
    histories.value = res.data?.histories || res.histories || []
  } catch (error) {
    console.error('Load history error:', error)
  } finally {
    historyLoading.value = false
  }
}

const showImportDialog = (row) => {
  currentImportActivity.value = row
  importDialogVisible.value = true
  importFile.value = null
}

const handleFileChange = (file) => {
  importFile.value = file.raw
}

const handleFileRemove = () => {
  importFile.value = null
}

const handleImport = async () => {
  if (!importFile.value) {
    ElMessage.warning(t('activities.importSelectFile'))
    return
  }

  if (!currentImportActivity.value?.tikTokActivityId) {
    ElMessage.warning(t('activities.importNoActivityId'))
    return
  }

  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)

    const res = await request.post(
      `/activities/${currentImportActivity.value._id}/import-products`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    ElMessage.success(res.message || t('activities.importSuccess'))
    importDialogVisible.value = false
    // 刷新商品数量
    loadProductCounts()
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error(error.response?.data?.message || t('activities.importFailed'))
  } finally {
    importLoading.value = false
  }
}

const resetForm = () => {
  // 获取默认国家
  const defaultCountry = countryList.value.find(c => c.isDefault)
  Object.assign(form, {
    tikTokActivityId: '',
    name: '',
    type: 'self_initiated',
    tapLink: '',
    sampleMethod: '线上',
    cooperationCountry: defaultCountry?.name || '',
    startDate: '',
    endDate: '',
    description: '',
    // 达人要求
    requirementGmv: 0,
    requirementMonthlySales: 0,
    requirementFollowers: 0,
    requirementAvgViews: 0,
    requirementRemark: '',
    // 佣金配置 - 推广时
    promotionInfluencerRate: 0,
    promotionOriginalRate: 0,
    promotionCompanyRate: 0,
    // 佣金配置 - 投广告时
    adInfluencerRate: 0,
    adOriginalRate: 0,
    adCompanyRate: 0
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = { ...form }
      if (isEdit.value) {
        await request.put(`/activities/${data._id}`, data)
        ElMessage.success(t('activities.updateSuccess'))
      } else {
        await request.post('/activities', data)
        ElMessage.success(t('activities.createSuccess'))
      }
      dialogVisible.value = false
      loadActivities()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(t('activities.confirmDeleteActivity', { name: row.name }), t('activities.confirmDelete'), {
      type: 'warning'
    })
    await request.delete(`/activities/${row._id}`)
    ElMessage.success(t('activities.deleteSuccess'))
    loadActivities()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete error:', error)
    }
  }
}

// 加载活动商品数量
const loadProductCounts = async () => {
  try {
    const ids = activities.value.map(a => a._id).join(',')
    if (!ids) return
    const res = await request.get('/activities/product-counts', { params: { ids } })
    productCounts.value = res.data || res || {}
  } catch (error) {
    console.error(t('activities.loadProductCountFailed'), error)
  }
}

// 加载单个活动的商品列表
const loadActivityProducts = async (activity) => {
  if (activityProducts.value[activity._id]) return // 已经加载过

  loadingProducts.value = { ...loadingProducts.value, [activity._id]: true }
  try {
    const res = await request.get(`/activities/${activity._id}/products`, {
      params: { page: 1, limit: 100 } // 先加载足够多的商品用于展示
    })
    // 拦截器返回的是 { data: products, pagination } 或 { products, pagination }
    const products = res.data || res.products || []
    // 预先计算每个商品的链接并缓存
    const productsWithLinks = products.map(p => ({
      ...p,
      _cachedLink: getActivityLink(p, activity._id)
    }))
    activityProducts.value = {
      ...activityProducts.value,
      [activity._id]: productsWithLinks
    }
    productPagination.value = {
      ...productPagination.value,
      [activity._id]: { page: 1, total: res.pagination?.total || res.data?.pagination?.total || 0 }
    }
  } catch (error) {
    console.error(t('activities.loadProductFailed'), error)
  } finally {
    loadingProducts.value = { ...loadingProducts.value, [activity._id]: false }
  }
}

// 获取商品总数
const getTotalProducts = (activity) => {
  return productPagination.value[activity._id]?.total || 0
}

// 获取分页后的商品列表
const getPaginatedProducts = (activity) => {
  const products = activityProducts.value[activity._id] || []
  const page = productPagination.value[activity._id]?.page || 1
  const pageSize = 10
  const start = (page - 1) * pageSize
  return products.slice(start, start + pageSize)
}

// 处理商品分页变化
const handleProductPageChange = (activity, page) => {
  productPagination.value = {
    ...productPagination.value,
    [activity._id]: { ...productPagination.value[activity._id], page }
  }
}

// 跳转到商品管理页面（带活动筛选）
const goToProductPage = (activity) => {
  // 通过路由跳转并传递活动筛选参数
  const route = router.resolve({
    path: '/products',
    query: { activityId: activity._id }
  })
  window.open(route.href, '_blank')
}

// 查看商品详情
const viewProductDetail = async (product) => {
  try {
    const res = await request.get(`/products/${product._id}`)
    currentProduct.value = res.data?.product || res.product
    // 确保活动列表已加载
    if (activities.value.length === 0) {
      await loadActivities()
    }
    productDetailVisible.value = true
  } catch (error) {
    console.error(t('activities.loadProductDetailFailed'), error)
    ElMessage.error(t('activities.loadProductDetailFailed'))
  }
}

const router = useRouter()

const resetSearch = () => {
  Object.assign(searchForm, { name: '', type: '', status: '' })
  pagination.page = 1
  loadActivities()
}

onMounted(() => {
  loadActivities()
  loadCountries()
  loadCurrencies()
})
</script>

<style scoped>
.activities-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #4a148c;
  margin: 0;
}

.search-form {
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #e8e8e8;
}

.el-button + .el-button {
  margin-left: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0 10px 0;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

.section-title:first-child {
  margin-top: 0;
}

.pre-config-label {
  font-weight: 600;
}

.detail-description {
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
}

/* TikTok活动ID特殊样式 */
.tiktok-id-label :deep(.el-form-item__label) {
  color: #6DAD19;
}

:deep(.el-table__header .tiktok-id-label .cell) {
  color: #6DAD19;
}

:deep(.el-table__body .tiktok-id-label .cell) {
  color: #6DAD19;
}

.tiktok-id-input :deep(.el-input__wrapper) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-id-input :deep(.el-input__wrapper:hover) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-id-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.import-tips {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.import-tips ol {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.import-tips li {
  margin: 8px 0;
  color: #606266;
}

.import-upload {
  margin: 20px 0;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.import-loading {
  text-align: center;
  padding: 20px;
  color: #409eff;
}

.import-loading .el-icon {
  margin-right: 8px;
}

/* 详情弹窗样式 */
.product-detail-dialog :deep(.el-dialog__body) {
  padding: 0 24px 24px;
}

.detail-wrapper {
  max-height: 65vh;
  overflow-y: auto;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid #ebeef5;
}

.head-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head-id {
  font-size: 13px;
  font-weight: 600;
  color: #775999;
}

.head-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.detail-desc {
  margin-top: 16px;
}

.detail-section {
  margin-top: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #775999;
}

.section-count {
  font-size: 12px;
  font-weight: normal;
  color: #909399;
  margin-left: 4px;
}

.price-cell {
  color: #775999;
  font-weight: 600;
}

.link-text {
  color: #409eff;
  text-decoration: none;
  word-break: break-all;
}

.link-text:hover {
  text-decoration: underline;
}

.empty-section {
  padding: 30px 0;
}

.activity-block {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}

.activity-block:last-child {
  margin-bottom: 0;
}

.activity-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ebeef5;
}

.activity-tag {
  font-size: 12px;
  font-weight: 600;
  color: #775999;
  background: #fff;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid #775999;
}

.activity-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.activity-block .el-descriptions {
  margin: 0;
}

.activity-block .el-descriptions__body {
  background: #fff;
}

.commission-row {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  border-top: 1px dashed #ebeef5;
  background: #fff;
}

.commission-item {
  flex: 1;
}

.commission-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 6px;
  display: block;
}

.commission-rates {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #303133;
}

.product-count-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.product-popover {
  min-width: 400px;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  color: #303133;
}

.product-list {
  max-height: 300px;
  overflow-y: auto;
}

.product-list-header {
  display: flex;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  font-size: 12px;
  color: #606266;
  position: sticky;
  top: 0;
  z-index: 1;
}

.product-col-title {
  flex: 1;
  min-width: 0;
}

.link-col-title {
  width: 120px;
  text-align: right;
}

.product-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.product-item:hover {
  background: #f5f7fa;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-id {
  color: #775999;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-name {
  color: #606266;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-link {
  width: 120px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.product-link-a {
  color: #409eff;
  font-size: 12px;
  text-decoration: none;
}

.product-link-a:hover {
  text-decoration: underline;
}

.copy-icon {
  cursor: pointer;
  color: #909399;
  font-size: 14px;
}

.copy-icon:hover {
  color: #409eff;
}

.tiktok-activity-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiktok-link {
  color: #6DAD19;
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
}

.tiktok-link:hover {
  text-decoration: underline;
}

.activity-name-cell {
  color: #606266;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-container {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
</style>
