<template>
  <div class="product-tab">
    <!-- 搜索筛选 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-select v-model="filters.status" :placeholder="$t('product.statusPlaceholder')" clearable @change="loadData">
            <el-option :label="$t('product.enabledOption')" value="active" />
            <el-option :label="$t('product.disabledOption')" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-input v-model="filters.keyword" :placeholder="$t('product.searchPlaceholder')" clearable @change="loadData">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.activityId" :placeholder="$t('product.activityPlaceholder')" clearable @change="loadData">
            <el-option v-for="act in activities" :key="act._id" :label="act.name" :value="act._id" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('products:create')">{{ $t('product.addProduct') }}</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 统计信息 -->
    <div class="stats-info">
      <span>{{ $t('product.totalRecords', { total: pagination.total }) }}</span>
    </div>

    <!-- 产品列表 -->
    <el-table :data="products" stripe v-loading="loading" :scroll-x="true">
      <el-table-column :label="$t('product.tiktokProduct')" width="320" fixed class-name="tiktok-green-label">
        <template #default="{ row }">
          <div class="tiktok-product-cell">
            <div class="tiktok-id-row">
              <el-button link type="primary" @click="viewProduct(row)" class="tiktok-id-btn">
                {{ row.tiktokProductId || row.productId || '-' }}
              </el-button>
            </div>
            <div class="product-name-row">{{ row.name || row.productName || '-' }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="$t('product.shop')" width="150">
        <template #default="{ row }">
          <el-popover
            placement="right"
            :width="300"
            trigger="hover"
            v-if="row.shopId?.shopName || row.shopId?.name"
          >
            <template #reference>
              <span class="shop-link" @click="goToShop(row.shopId)">
                {{ row.shopId?.shopName || row.shopId?.name || '-' }}
              </span>
            </template>
            <div class="shop-info-popover">
              <div class="shop-info-item"><strong>{{ $t('product.shop') }}：</strong>{{ row.shopId?.shopName || row.shopId?.name || '-' }}</div>
              <div class="shop-info-item"><strong>{{ $t('product.shopCode') }}：</strong>{{ row.shopId?.shopNumber || '-' }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.name"><strong>{{ $t('influencer.realName') }}：</strong>{{ row.shopId.contactId.name }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.phone"><strong>{{ $t('influencer.phone') }}：</strong>{{ row.shopId.contactId.phone }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.email"><strong>Email：</strong>{{ row.shopId.contactId.email }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.address"><strong>{{ $t('influencer.address') }}：</strong>{{ row.shopId.contactId.address }}</div>
            </div>
          </el-popover>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="productCategory" :label="$t('product.productCategory')" :width="128" show-overflow-tooltip />
      <el-table-column prop="productGrade" :label="$t('product.productGrade')" width="100">
        <template #default="{ row }">
          <el-tag :type="getGradeType(row.productGrade)">
            {{ getGradeText(row.productGrade) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="$t('product.orders7Days')" width="120" align="center">
        <template #default="{ row }">
          <el-popover
            placement="top"
            :width="600"
            trigger="hover"
            @show="loadOrderStats(row, '7days')"
          >
            <template #reference>
              <span class="clickable-stat">
                {{ getOrderCount(row, '7days') }}
              </span>
            </template>
            <div v-if="loadingOrderStats[row._id]?.loading" class="loading-tip">{{ $t('product.loading') }}</div>
            <div v-else-if="getOrderStats(row, '7days').orders?.length > 0">
              <el-table :data="getPaginatedOrders(row, '7days')" size="small" max-height="300">
                <el-table-column prop="orderNo" :label="$t('product.orderNo')" width="200" show-overflow-tooltip />
                <el-table-column prop="influencerUsername" :label="$t('product.influencer')" width="100" show-overflow-tooltip />
                <el-table-column prop="creatorName" :label="$t('product.belongingBD')" width="80" show-overflow-tooltip />
                <el-table-column prop="totalAmount" :label="$t('product.amount')" width="80" />
                <el-table-column :label="$t('product.createTime')" width="140">
                  <template #default="{ row }">
                    {{ formatDate(row.createTime) }}
                  </template>
                </el-table-column>
              </el-table>
              <div class="pagination-container">
                <el-pagination
                  small
                  :current-page="orderPagination[`${row._id}_7days`]?.page || 1"
                  :page-size="10"
                  :total="getTotalOrders(row, '7days')"
                  layout="prev, pager, next, total"
                  @current-change="(page) => handleOrderPageChange(row, '7days', page)"
                />
              </div>
            </div>
            <div v-else class="empty-tip">{{ $t('product.noOrderData') }}</div>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column :label="$t('product.orders3Months')" width="120" align="center">
        <template #default="{ row }">
          <el-popover
            placement="top"
            :width="600"
            trigger="hover"
            @show="loadOrderStats(row, '3months')"
          >
            <template #reference>
              <span class="clickable-stat">
                {{ getOrderCount(row, '3months') }}
              </span>
            </template>
            <div v-if="loadingOrderStats[row._id]?.loading" class="loading-tip">{{ $t('product.loading') }}</div>
            <div v-else-if="getOrderStats(row, '3months').orders?.length > 0">
              <el-table :data="getPaginatedOrders(row, '3months')" size="small" max-height="300">
                <el-table-column prop="orderNo" :label="$t('product.orderNo')" width="200" show-overflow-tooltip />
                <el-table-column prop="influencerUsername" :label="$t('product.influencer')" width="100" show-overflow-tooltip />
                <el-table-column prop="creatorName" :label="$t('product.belongingBD')" width="80" show-overflow-tooltip />
                <el-table-column prop="totalAmount" :label="$t('product.amount')" width="80" />
                <el-table-column :label="$t('product.createTime')" width="140">
                  <template #default="{ row }">
                    {{ formatDate(row.createTime) }}
                  </template>
                </el-table-column>
              </el-table>
              <div class="pagination-container">
                <el-pagination
                  small
                  :current-page="orderPagination[`${row._id}_3months`]?.page || 1"
                  :page-size="10"
                  :total="getTotalOrders(row, '3months')"
                  layout="prev, pager, next, total"
                  @current-change="(page) => handleOrderPageChange(row, '3months', page)"
                />
              </div>
            </div>
            <div v-else class="empty-tip">{{ $t('product.noOrderData') }}</div>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column prop="status" :label="$t('product.status')" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? $t('product.enabled') : $t('product.disabled') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="$t('product.operation')" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProduct(row)" v-if="hasPermission('products:read')">{{ $t('product.detail') }}</el-button>
          <el-button link type="primary" @click="showReport(row)" v-if="hasPermission('products:read')">{{ $t('product.report') }}</el-button>
          <el-button link type="primary" @click="editProduct(row)" v-if="hasPermission('products:update')">{{ $t('product.edit') }}</el-button>
          <el-button link type="danger" @click="deleteProduct(row)" v-if="hasPermission('products:delete')">{{ $t('product.delete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="editingProduct ? $t('product.editProduct') : $t('product.addProduct')"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="form-container">
        <el-form :model="form" ref="formRef" label-width="120px" label-position="right">
          <!-- TikTok shop信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">{{ $t('product.tiktokShopInfo') }}</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('product.productIdRequired')" prop="productId" required class="tiktok-green-label">
                  <el-input v-model="form.productId" :placeholder="$t('product.productIdRequiredTip')" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('product.productName')">
                  <el-input v-model="form.productName" :placeholder="$t('product.productNameInput')" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('product.shop')">
                  <el-select v-model="form.shopId" :placeholder="$t('product.shopSelect')" style="width: 100%">
                    <el-option v-for="shop in shops" :key="shop._id" :label="shop.shopName" :value="shop._id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('product.productCategory')">
                  <el-select v-model="form.productCategory" :placeholder="$t('product.categorySelect')" style="width: 100%">
                    <el-option v-for="cat in productCategories" :key="cat" :label="cat" :value="cat" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="$t('product.squareCommissionRate')">
                  <el-input-number v-model="form.squareCommissionRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="10">
                <el-form-item :label="$t('product.sellingPrice')">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <el-select v-model="form.currency" :placeholder="$t('product.currency')" style="width: 80px">
                      <el-option v-for="c in currencyOptions" :key="c.code" :label="c.name" :value="c.code" />
                    </el-select>
                    <el-input-number v-model="form.sellingPrice" :min="0" :precision="2" :step="0.1" :controls="false" style="flex: 1" :placeholder="$t('product.sellingPrice')" />
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="14">
                <el-form-item :label="$t('product.priceRange')">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <el-select v-model="form.currency" :placeholder="$t('product.currency')" style="width: 80px">
                      <el-option v-for="c in currencyOptions" :key="c.code" :label="c.name" :value="c.code" />
                    </el-select>
                    <el-input-number v-model="form.priceRangeMin" :min="0" :precision="2" :step="0.1" :controls="false" style="width: 80px" :placeholder="$t('product.minPrice')" />
                    <span>-</span>
                    <el-input-number v-model="form.priceRangeMax" :min="0" :precision="2" :step="0.1" :controls="false" style="width: 80px" :placeholder="$t('product.maxPrice')" />
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 商品信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">{{ $t('product.productInfo') }}</span>
            </div>
            <el-form-item :label="$t('product.productGrade')">
              <el-select v-model="form.productGrade" :placeholder="$t('product.gradeSelect')">
                <el-option :label="$t('product.ordinaryGrade')" value="ordinary" />
                <el-option :label="$t('product.hotGrade')" value="hot" />
                <el-option :label="$t('product.mainGrade')" value="main" />
                <el-option :label="$t('product.newGrade')" value="new" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('product.productIntro')">
              <el-input v-model="form.productIntro" type="textarea" :rows="3" :placeholder="$t('product.productIntroPlaceholder')" />
            </el-form-item>
            <el-form-item :label="$t('product.referenceVideo')">
              <el-input v-model="form.referenceVideo" :placeholder="$t('product.referenceVideoPlaceholder')" />
            </el-form-item>
            <el-form-item :label="$t('product.sellingPoints')">
              <el-input v-model="form.sellingPoints" type="textarea" :rows="2" :placeholder="$t('product.sellingPointsPlaceholder')" />
            </el-form-item>
          </div>

          <!-- 活动配置（一个商品可参与多个活动） -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">{{ $t('product.activityConfig') }}</span>
              <el-button type="primary" size="small" @click="addActivityConfig">
                <el-icon><Plus /></el-icon>
                {{ $t('product.addActivity') }}
              </el-button>
            </div>
            <div v-if="form.activityConfigs.length === 0" class="empty-tip">
              {{ $t('product.noActivityConfig') }}
            </div>
            <div v-for="(config, index) in form.activityConfigs" :key="index" class="activity-commission-item">
              <div class="activity-header">
                <span class="activity-title">{{ $t('product.activityNum', { num: index + 1 }) }}</span>
                <el-button link type="danger" size="small" @click="removeActivityConfig(index)">
                  {{ $t('product.remove') }}
                </el-button>
              </div>
              
              <!-- 选择活动 -->
              <el-row :gutter="16">
                <el-col :span="24">
                  <el-form-item :label="$t('product.activityName')" :prop="`activityConfigs.${index}.activityId`" :rules="{ required: true, message: $t('product.selectActivityTip'), trigger: 'change' }">
                    <el-select v-model="config.activityId" :placeholder="$t('product.selectActivity')" style="width: 100%" @change="validateActivityDuplication(index)">
                      <el-option v-for="act in activities" :key="act._id" :label="act.name" :value="act._id" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <!-- 达人要求 -->
              <el-divider content-position="left">{{ $t('product.influencerRequirement') }}</el-divider>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item :label="$t('product.gmv')">
                    <el-input-number v-model="config.requirementGmv" :min="0" :placeholder="$t('product.gmv')" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="$t('product.monthlySales')">
                    <el-input-number v-model="config.requirementMonthlySales" :min="0" :placeholder="$t('product.monthlySales')" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item :label="$t('product.followers')">
                    <el-input-number v-model="config.requirementFollowers" :min="0" :placeholder="$t('product.followers')" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="$t('product.avgViews')">
                    <el-input-number v-model="config.requirementAvgViews" :min="0" :placeholder="$t('product.avgViews')" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item :label="$t('product.requirementRemark')">
                <el-input v-model="config.requirementRemark" type="textarea" :rows="2" :maxlength="1000" :placeholder="$t('product.requirementRemarkPlaceholder')" />
              </el-form-item>
              
              <!-- 样品信息 -->
              <el-divider content-position="left">{{ $t('product.sampleInfo') }}</el-divider>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item :label="$t('product.sampleMethod')">
                    <el-select v-model="config.sampleMethod" :placeholder="$t('common.select')" style="width: 100%">
                      <el-option :label="$t('product.onlineMethod')" value="线上" />
                      <el-option :label="$t('product.offlineMethod')" value="线下" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="$t('product.cooperationCountry')">
                    <el-select v-model="config.cooperationCountry" :placeholder="$t('product.selectCountry')" style="width: 100%">
                      <el-option v-for="country in countries" :key="country" :label="country" :value="country" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <!-- 推广时佣金配置 -->
              <el-divider content-position="left">{{ $t('product.promotionCommission') }}</el-divider>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item :label="$t('product.influencerPercent')">
                    <el-input-number v-model="config.promotionInfluencerRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item :label="$t('product.originalPercent')">
                    <el-input-number v-model="config.promotionOriginalRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item :label="$t('product.companyPercent')">
                    <el-input-number v-model="config.promotionCompanyRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <!-- 投广告时佣金配置 -->
              <el-divider content-position="left">{{ $t('product.adCommission') }}</el-divider>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item :label="$t('product.influencerPercent')">
                    <el-input-number v-model="config.adInfluencerRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item :label="$t('product.originalPercent')">
                    <el-input-number v-model="config.adOriginalRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item :label="$t('product.companyPercent')">
                    <el-input-number v-model="config.adCompanyRate" :min="0" :max="100" :precision="2" :step="0.5" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showDialog = false">{{ $t('product.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" size="large">{{ $t('product.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" :title="$t('product.productDetail')" width="900px" :close-on-click-modal="false" class="product-detail-dialog">
      <div v-if="currentProduct" class="detail-wrapper">
        <!-- 商品头部 -->
        <div class="detail-head">
          <div class="head-main">
            <span class="head-id">{{ currentProduct.tiktokProductId || currentProduct.productId || '-' }}</span>
            <h3 class="head-title">{{ currentProduct.name || currentProduct.productName || '-' }}</h3>
          </div>
          <el-tag :type="currentProduct.status === 'active' ? 'success' : 'info'">{{ currentProduct.status === 'active' ? $t('product.enabled') : $t('product.disabled') }}</el-tag>
        </div>

        <!-- 基本信息 -->
        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item :label="$t('product.sku')">{{ currentProduct.sku || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('product.shop')">{{ currentProduct.shopId?.shopName || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('product.productCategory')">{{ currentProduct.productCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('product.squareRate')">{{ currentProduct.squareCommissionRate ? (currentProduct.squareCommissionRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('product.priceCell')" class-name="price-cell">
            {{ currentProduct.sellingPrice ? currentProduct.sellingPrice + ' ' + (currentProduct.currency || 'USD') : '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('product.priceRangeCell')" :span="2" class-name="price-cell">
            {{ currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0 ? currentProduct.priceRangeMin : '-' }}
            {{ (currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0) && (currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0) ? ' - ' : '' }}
            {{ currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0 ? currentProduct.priceRangeMax + ' ' + (currentProduct.currency || 'USD') : '' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 商品说明 -->
        <div v-if="currentProduct.productIntro || currentProduct.referenceVideo || currentProduct.sellingPoints" class="detail-section">
          <div class="section-title">{{ $t('product.productDescription') }}</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-if="currentProduct.productIntro" :label="$t('product.intro')">{{ currentProduct.productIntro }}</el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.referenceVideo" :label="$t('product.referenceVideoLink')">
              <a :href="currentProduct.referenceVideo" target="_blank" class="link-text">{{ currentProduct.referenceVideo }}</a>
            </el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.sellingPoints" :label="$t('product.sellingPointsCell')">{{ currentProduct.sellingPoints }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 参与活动 -->
        <div v-if="currentProduct.activityConfigs && currentProduct.activityConfigs.length > 0" class="detail-section">
          <div class="section-title">{{ $t('product.participatedActivities', { count: currentProduct.activityConfigs.length }) }}</div>
          <div v-for="(ac, index) in currentProduct.activityConfigs" :key="index" class="activity-block">
            <div class="activity-title">
              <span class="activity-tag">{{ ac.activityId?.tikTokActivityId || '-' }}</span>
              <span class="activity-name">{{ ac.activityId?.name || '-' }}</span>
            </div>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item :label="$t('product.activityLink')" :span="3">
                <a v-if="ac.activityLink" :href="ac.activityLink" target="_blank" class="link-text">{{ ac.activityLink }}</a>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item :label="$t('product.gmv')">{{ ac.requirementGmv ? ac.requirementGmv + ' ' + (ac.gmvCurrency || currentProduct.currency || 'USD') : '-' }}</el-descriptions-item>
              <el-descriptions-item :label="$t('product.monthlySalesCell')">{{ ac.requirementMonthlySales || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('product.followers')">{{ ac.requirementFollowers || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('product.avgViewsCell')">{{ ac.requirementAvgViews || 0 }}</el-descriptions-item>
              <el-descriptions-item :label="$t('product.sampleMethodCell')">{{ ac.sampleMethod || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="$t('product.cooperationCountryCell')">{{ ac.cooperationCountry || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="commission-row">
              <div class="commission-item">
                <span class="commission-label">{{ $t('product.promotionCommissionCell') }}</span>
                <div class="commission-rates">
                  <span>{{ $t('product.influencer') }} {{ ac.promotionInfluencerRate ? (ac.promotionInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('product.original') }} {{ ac.promotionOriginalRate ? (ac.promotionOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('product.company') }} {{ ac.promotionCompanyRate ? (ac.promotionCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
              <div class="commission-item">
                <span class="commission-label">{{ $t('product.adCommissionCell') }}</span>
                <div class="commission-rates">
                  <span>{{ $t('product.influencer') }} {{ ac.adInfluencerRate ? (ac.adInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('product.original') }} {{ ac.adOriginalRate ? (ac.adOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>{{ $t('product.company') }} {{ ac.adCompanyRate ? (ac.adCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-section">
          <el-empty :description="$t('product.noActivities')" :image-size="60" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">{{ $t('product.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 报表对话框 -->
    <el-dialog v-model="showReportDialog" :title="$t('product.salesReport')" width="1200px" :close-on-click-modal="false">
      <div v-if="reportProduct && reportData">
        <el-tabs v-model="reportPeriod" @tab-change="loadReportData">
          <el-tab-pane :label="$t('product.last7Days')" name="7days" />
          <el-tab-pane :label="$t('product.last14Days')" name="14days" />
          <el-tab-pane :label="$t('product.currentMonth')" name="month" />
        </el-tabs>

        <div v-if="loadingReport" class="loading-tip">{{ $t('product.loading') }}</div>
        <div v-else>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-card class="report-card">
                <template #header>
                  <span>{{ $t('product.salesTrend') }}</span>
                </template>
                <div ref="lineChartRef" style="height: 300px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card class="report-card">
                <template #header>
                  <span>{{ $t('product.salesDistribution') }}</span>
                </template>
                <div ref="pieChartRef" style="height: 300px;"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="report-card" style="margin-top: 16px;">
            <template #header>
              <span>{{ $t('product.bdSalesRanking') }}</span>
            </template>
            <el-table :data="reportData.bdStats?.slice(0, 5)" stripe>
              <el-table-column type="index" :label="$t('product.rank')" width="80" />
              <el-table-column prop="bdName" :label="$t('product.bdName')" />
              <el-table-column prop="count" :label="$t('product.salesVolume')" align="center" />
              <el-table-column :label="$t('product.percentage')" align="center">
                <template #default="{ row }">
                  {{ ((row.count / (reportData.totalOrders || 1)) * 100).toFixed(1) }}%
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card class="report-card" style="margin-top: 16px;">
            <template #header>
              <span>{{ $t('product.influencerSalesRanking') }}</span>
            </template>
            <el-table :data="reportData.influencerStats?.slice(0, 10)" stripe>
              <el-table-column type="index" :label="$t('product.rank')" width="80" />
              <el-table-column prop="influencerName" :label="$t('product.influencerName')" />
              <el-table-column prop="count" :label="$t('product.salesVolume')" align="center" />
              <el-table-column :label="$t('product.percentage')" align="center">
                <template #default="{ row }">
                  {{ ((row.count / (reportData.totalOrders || 1)) * 100).toFixed(1) }}%
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </div>
      <template #footer>
        <el-button @click="showReportDialog = false">{{ $t('product.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'
import * as echarts from 'echarts'

const { t } = useI18n()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

// 跳转到店铺列表并搜索该店铺
const goToShop = (shop) => {
  if (!shop) return
  router.push({
    path: '/shops',
    query: { keyword: shop.shopName || shop.name }
  })
}

// 权限检查 - 使用 products 权限
const hasPermission = (perm) => {
  // 兼容旧权限：cooperationProducts -> products
  if (perm.startsWith('cooperationProducts:')) {
    const newPerm = perm.replace('cooperationProducts:', 'products:')
    return AuthManager.hasPermission(perm) || AuthManager.hasPermission(newPerm)
  }
  return AuthManager.hasPermission(perm)
}

const loading = ref(false)
const showDialog = ref(false)
const showDetailDialog = ref(false)
const showReportDialog = ref(false)
const loadingReport = ref(false)
const editingProduct = ref(null)
const currentProduct = ref(null)
const reportProduct = ref(null)
const products = ref([])
const activities = ref([])
const shops = ref([])
const countries = ref([])
const productCategories = ref([])

// 货币选项 - 从基础数据获取
const currencyOptions = computed(() => [
  { code: 'USD', name: t('product.currencyUSD') },
  { code: 'CNY', name: t('product.currencyCNY') },
  { code: 'THB', name: t('product.currencyTHB') },
  { code: 'VND', name: t('product.currencyVND') },
  { code: 'MYR', name: t('product.currencyMYR') },
  { code: 'SGD', name: t('product.currencySGD') },
  { code: 'PHP', name: t('product.currencyPHP') },
  { code: 'IDR', name: t('product.currencyIDR') }
])

// 订单统计缓存
const orderStatsCache = ref({})
const loadingOrderStats = ref({})

// 订单列表分页状态
const orderPagination = ref({
  '7days': {},
  '3months': {}
})

// 报表数据
const reportData = ref(null)
const reportPeriod = ref('7days')

// 图表引用
const lineChartRef = ref(null)
const pieChartRef = ref(null)
let lineChart = null
let pieChart = null

const filters = reactive({
  status: '',
  keyword: '',
  activityId: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const form = reactive({
  productId: '',
  productName: '',
  shopId: '',
  productCategory: '',
  productGrade: 'ordinary',
  productImages: [],
  productIntro: '',
  referenceVideo: '',
  sellingPoints: '',
  squareCommissionRate: 0,
  // 售价、币别、价格区间
  sellingPrice: 0,
  currency: 'USD',
  priceRangeMin: 0,
  priceRangeMax: 0,
  activityConfigs: []
})

const loadActivities = async () => {
  try {
    const res = await request.get('/activities', {
      params: { companyId: userStore.companyId }
    })
    activities.value = res.activities || []
  } catch (error) {
    console.error('加载活动失败:', error)
  }
}

const loadShops = async () => {
  try {
    const res = await request.get('/shops', {
      params: { companyId: userStore.companyId }
    })
    shops.value = res.shops || []
  } catch (error) {
    console.error('加载店铺失败:', error)
  }
}

const loadBaseData = async () => {
  try {
    // 加载国家数据
    const countryRes = await request.get('/base-data', {
      params: { type: 'country', limit: 100 }
    })
    console.log('国家数据完整响应:', JSON.stringify(countryRes, null, 2))
    const countryData = countryRes.data || []
    console.log('国家数据数组:', countryData)
    countries.value = countryData.map(item => item.name || item.value || item)
    console.log('国家列表:', countries.value)

    // 设置默认国家
    if (countries.value.length > 0 && !form.cooperationCountry) {
      form.cooperationCountry = countries.value[0]
      console.log('设置默认合作国家:', form.cooperationCountry)
    }

    // 加载商品类目数据
    const categoryRes = await request.get('/base-data', {
      params: { type: 'category', limit: 100 }
    })
    console.log('商品类目数据完整响应:', JSON.stringify(categoryRes, null, 2))
    const categoryData = categoryRes.data || []
    console.log('商品类目数据数组:', categoryData)
    productCategories.value = categoryData.map(item => item.name || item.value || item)
    console.log('商品类目列表:', productCategories.value)
  } catch (error) {
    console.error('加载基础数据失败:', error)
  }
}

const addActivityConfig = () => {
  form.activityConfigs.push({
    activityId: '',
    // 活动专属链接
    activityLink: '',
    // 达人要求
    requirementGmv: 0,
    requirementMonthlySales: 0,
    requirementFollowers: 0,
    requirementAvgViews: 0,
    requirementRemark: '',
    // 样品信息
    sampleMethod: '',
    cooperationCountry: '',
    // 推广时
    promotionInfluencerRate: 0,
    promotionOriginalRate: 0,
    promotionCompanyRate: 0,
    // 投广告时
    adInfluencerRate: 0,
    adOriginalRate: 0,
    adCompanyRate: 0
  })
}

// 提交前转换佣金率为小数
const convertCommissionRates = (data) => {
  // 转换广场佣金率
  if (data.squareCommissionRate !== undefined) {
    data.squareCommissionRate = data.squareCommissionRate / 100
  }
  // 转换活动配置佣金率
  if (data.activityConfigs && Array.isArray(data.activityConfigs)) {
    data.activityConfigs = data.activityConfigs.map(ac => ({
      ...ac,
      // 推广时
      promotionInfluencerRate: ac.promotionInfluencerRate / 100,
      promotionOriginalRate: ac.promotionOriginalRate / 100,
      promotionCompanyRate: ac.promotionCompanyRate / 100,
      // 投广告时
      adInfluencerRate: ac.adInfluencerRate / 100,
      adOriginalRate: ac.adOriginalRate / 100,
      adCompanyRate: ac.adCompanyRate / 100
    }))
  }
  // 字段映射：兼容 CooperationProduct 和 Product 字段
  data.tiktokProductId = data.productId
  data.name = data.productName || data.name
  // 确保 Product 必需字段有值
  if (!data.sku && data.productId) {
    data.sku = data.productId
  }
  if (!data.price) {
    data.price = 0
  }
  return data
}

// 获取数据时转换佣金率为百分比
const convertCommissionRatesToPercent = (data) => {
  if (data.activityConfigs && Array.isArray(data.activityConfigs)) {
    data.activityConfigs = data.activityConfigs.map(ac => ({
      ...ac,
      // 推广时
      promotionInfluencerRate: (ac.promotionInfluencerRate || 0) * 100,
      promotionOriginalRate: (ac.promotionOriginalRate || 0) * 100,
      promotionCompanyRate: (ac.promotionCompanyRate || 0) * 100,
      // 投广告时
      adInfluencerRate: (ac.adInfluencerRate || 0) * 100,
      adOriginalRate: (ac.adOriginalRate || 0) * 100,
      adCompanyRate: (ac.adCompanyRate || 0) * 100
    }))
  }
  return data
}

const removeActivityConfig = (index) => {
  form.activityConfigs.splice(index, 1)
}

const validateActivityDuplication = (currentIndex) => {
  const currentActivityId = form.activityConfigs[currentIndex]?.activityId
  if (!currentActivityId) return

  // 检查是否重复选择同一活动
  const duplicateIndex = form.activityConfigs.findIndex((ac, index) =>
    index !== currentIndex && ac.activityId === currentActivityId
  )

  if (duplicateIndex !== -1) {
    ElMessage.error(t('product.duplicateActivity'))
    form.activityConfigs[currentIndex].activityId = ''
    return
  }

  // 从活动中读取佣金配置
  const activity = activities.value.find(a => a._id === currentActivityId)
  if (activity) {
    const config = form.activityConfigs[currentIndex]
    // 填充活动的佣金配置（作为默认值，用户可以修改）
    config.promotionInfluencerRate = activity.promotionInfluencerRate || 0
    config.promotionOriginalRate = activity.promotionOriginalRate || 0
    config.promotionCompanyRate = activity.promotionCompanyRate || 0
    config.adInfluencerRate = activity.adInfluencerRate || 0
    config.adOriginalRate = activity.adOriginalRate || 0
    config.adCompanyRate = activity.adCompanyRate || 0
    config.requirementGmv = activity.requirementGmv || 0
    config.requirementMonthlySales = activity.requirementMonthlySales || 0
    config.requirementFollowers = activity.requirementFollowers || 0
    config.requirementAvgViews = activity.requirementAvgViews || 0
    config.requirementRemark = activity.requirementRemark || ''
    config.sampleMethod = activity.sampleMethod || ''
    config.cooperationCountry = activity.cooperationCountry || ''
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      companyId: userStore.companyId,
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    }
    console.log('[商品管理] 请求参数:', params)
    const res = await request.get('/products', { params })
    console.log('[商品管理] 返回数据:', res)
    products.value = res.products || res.data?.products || []
    pagination.total = res.pagination?.total || res.data?.pagination?.total || 0

    // 加载完产品后，自动加载所有产品的订单统计
    if (products.value.length > 0) {
      for (const product of products.value) {
        loadOrderStats(product, '7days')
        loadOrderStats(product, '3months')
      }
    }
  } catch (error) {
    console.error('加载产品失败:', error)
    ElMessage.error('加载产品失败')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  editingProduct.value = null
  resetForm()
  showDialog.value = true
}

const viewProduct = async (row) => {
  try {
    const res = await request.get(`/products/${row._id}`)
    currentProduct.value = res.data?.product || res.product
    // 确保活动列表已加载
    if (activities.value.length === 0) {
      await loadActivities()
    }
    showDetailDialog.value = true
  } catch (error) {
    console.error('获取产品详情失败:', error)
    ElMessage.error('获取产品详情失败')
  }
}

const editProduct = (row) => {
  editingProduct.value = row
  const formData = {
    // 兼容 Product 和 CooperationProduct 字段
    productId: row.tiktokProductId || row.productId || '',
    productName: row.name || row.productName || '',
    shopId: row.storeId?._id || row.shopId?._id || row.storeId || row.shopId || '',
    productCategory: row.productCategory,
    productGrade: row.productGrade,
    productImages: row.productImages || [],
    productIntro: row.productIntro,
    referenceVideo: row.referenceVideo,
    sellingPoints: row.sellingPoints,
    squareCommissionRate: row.squareCommissionRate ? row.squareCommissionRate * 100 : 0,
    // 售价、币别、价格区间
    sellingPrice: row.sellingPrice || 0,
    currency: row.currency || 'USD',
    priceRangeMin: row.priceRangeMin || 0,
    priceRangeMax: row.priceRangeMax || 0,
    // 兼容 Product 的 sku/name 字段（用于内部标识）
    sku: row.sku || row.tiktokProductId || '',
    name: row.name || row.productName || '',
    price: row.price || 0,
    activityConfigs: row.activityConfigs && row.activityConfigs.length > 0
      ? JSON.parse(JSON.stringify(row.activityConfigs))
      : []
  }
  convertCommissionRatesToPercent(formData)
  Object.assign(form, formData)
  // 活动配置是可选的，不再自动添加
  showDialog.value = true
}

const deleteProduct = async (row) => {
  try {
    await ElMessageBox.confirm(`${t('product.confirmDelete')} "${row.name || row.productName}"`, t('common.warning'), {
      type: 'warning'
    })
    await request.delete(`/products/${row._id}`)
    ElMessage.success(t('product.deleteSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete failed:', error)
      ElMessage.error(t('product.deleteSuccess'))
    }
  }
}

const handleSubmit = async () => {
  // 活动配置是可选的，如果填写了则验证
  if (form.activityConfigs && form.activityConfigs.length > 0) {
    // 验证每个活动配置都有活动ID
    const hasEmptyActivity = form.activityConfigs.some(ac => !ac.activityId)
    if (hasEmptyActivity) {
      ElMessage.error(t('product.selectActivityForConfig'))
      return
    }

    // 验证活动是否有重复
    const activityIds = form.activityConfigs.map(ac => ac.activityId)
    const uniqueIds = [...new Set(activityIds)]
    if (activityIds.length !== uniqueIds.length) {
      ElMessage.error(t('product.duplicateActivity'))
      return
    }
  }

  try {
    const data = convertCommissionRates({
      companyId: userStore.companyId,
      ...form
    })
    if (editingProduct.value) {
      await request.put(`/products/${editingProduct.value._id}`, data)
      ElMessage.success(t('product.updateSuccess'))
    } else {
      await request.post('/products', data)
      ElMessage.success(t('product.createSuccess'))
    }
    showDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('Submit failed:', error)
    ElMessage.error(error.message || t('product.submitFailed'))
  }
}

const resetForm = () => {
  Object.assign(form, {
    // 合作产品字段
    productId: '',
    productName: '',
    shopId: '',
    productCategory: '',
    productGrade: 'ordinary',
    sampleMethod: '线上',
    cooperationCountry: countries.value.length > 0 ? countries.value[0] : '',
    sampleTarget: '',
    influencerRequirement: '',
    productImages: [],
    productIntro: '',
    referenceVideo: '',
    sellingPoints: '',
    squareCommissionRate: 0,
    // Product 必需字段
    sku: '',
    name: '',
    price: 0,
    activityConfigs: []
  })
  // 不再自动添加活动配置，让它变为可选
}

const getGradeText = (grade) => {
  const map = {
    ordinary: t('product.ordinary'),
    hot: t('product.hot'),
    main: t('product.main'),
    new: t('product.new')
  }
  return map[grade] || grade
}

const getGradeType = (grade) => {
  const map = {
    ordinary: 'info',
    hot: 'danger',
    main: 'warning',
    new: 'success'
  }
  return map[grade] || ''
}

// 加载订单统计
const loadOrderStats = async (row, type) => {
  const cacheKey = `${row._id}_${type}`
  if (orderStatsCache.value[cacheKey]) {
    return
  }

  loadingOrderStats.value[row._id] = { ...loadingOrderStats.value[row._id], [type]: true }

  try {
    console.log('加载订单统计 - productId:', row._id, 'companyId:', userStore.companyId)
    console.log('请求URL:', `/product-stats/order-stats/${row._id}?companyId=${userStore.companyId}`)
    const res = await request.get(`/product-stats/order-stats/${row._id}`, {
      params: { companyId: userStore.companyId }
    })
    console.log('响应结果:', res)

    // 响应拦截器已返回 data，所以直接访问 res.sevenDaysOrders
    const orders = type === '7days' ? res.sevenDaysOrders : res.threeMonthsOrders

    orderStatsCache.value[cacheKey] = {
      count: type === '7days' ? res.sevenDaysCount : res.threeMonthsCount,
      orders
    }
  } catch (error) {
    console.error('加载订单统计失败:', error)
  } finally {
    loadingOrderStats.value[row._id] = { ...loadingOrderStats.value[row._id], [type]: false }
  }
}

// 获取订单数量
const getOrderCount = (row, type) => {
  const cacheKey = `${row._id}_${type}`
  return orderStatsCache.value[cacheKey]?.count || 0
}

// 获取订单统计数据
const getOrderStats = (row, type) => {
  const cacheKey = `${row._id}_${type}`
  return orderStatsCache.value[cacheKey] || { orders: [] }
}

// 获取分页后的订单数据
const getPaginatedOrders = (row, type) => {
  const cacheKey = `${row._id}_${type}`
  const orders = orderStatsCache.value[cacheKey]?.orders || []
  const page = orderPagination.value[cacheKey]?.page || 1
  const pageSize = 10
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return orders.slice(start, end)
}

// 获取订单总数
const getTotalOrders = (row, type) => {
  const cacheKey = `${row._id}_${type}`
  return orderStatsCache.value[cacheKey]?.orders?.length || 0
}

// 处理分页变化
const handleOrderPageChange = (row, type, page) => {
  const cacheKey = `${row._id}_${type}`
  orderPagination.value[cacheKey] = { ...orderPagination.value[cacheKey], page }
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 显示报表
const showReport = async (row) => {
  reportProduct.value = row
  reportPeriod.value = '7days'
  reportData.value = null
  
  showReportDialog.value = true
  // 等待数据加载完成后再渲染
  await loadReportData()
}

// 加载报表数据
const loadReportData = async () => {
  if (!reportProduct.value) return

  loadingReport.value = true
  try {
    const res = await request.get(`/product-stats/sales-report/${reportProduct.value._id}`, {
      params: {
        companyId: userStore.companyId,
        period: reportPeriod.value
      }
    })

    reportData.value = res
    console.log('报表数据 res:', res)
    console.log('报表数据 JSON:', JSON.stringify(res))
    console.log('reportData.value:', reportData.value)
    
    // 数据加载完成后，延迟渲染图表，等待对话框DOM就绪
    setTimeout(() => {
      renderCharts()
    }, 300)
  } catch (error) {
    console.error('加载报表数据失败:', error)
    ElMessage.error('加载报表数据失败')
  } finally {
    loadingReport.value = false
  }
}

// 渲染图表
const renderCharts = () => {
  console.log('renderCharts - reportData:', !!reportData.value)
  console.log('renderCharts - lineChartRef:', !!lineChartRef.value)
  console.log('renderCharts - pieChartRef:', !!pieChartRef.value)
  
  // 检查数据是否已加载
  if (!reportData.value) {
    console.log('renderCharts - 数据未加载，跳过')
    return
  }
  
  // 检查 DOM 是否就绪
  if (!lineChartRef.value || !pieChartRef.value) {
    console.log('renderCharts - DOM未就绪，跳过')
    return
  }
  
  if (reportData.value) {
    console.log('renderCharts - 开始渲染图表')
    
    // 每次都重新创建图表实例
    if (lineChart) {
      lineChart.dispose()
      lineChart = null
    }
    console.log('renderCharts - 初始化 lineChart')
    lineChart = echarts.init(lineChartRef.value)
    console.log('renderCharts - lineChart实例:', lineChart)
    
    // 构建 option
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: reportData.value.dailySales.dates
      },
      yAxis: {
        type: 'value',
        name: '销售量'
      },
      series: [{
        name: '销售量',
        type: 'line',
        data: reportData.value.dailySales.sales,
        smooth: true,
        itemStyle: {
          color: '#6DAD19'
        },
        lineStyle: {
          color: '#6DAD19'
        }
      }]
    }
    
    console.log('renderCharts - 设置 lineChart option, dates:', reportData.value.dailySales.dates)
    lineChart.setOption(option)
    lineChart.resize()
    console.log('renderCharts - lineChart setOption 完成')
  }

  // 渲染饼图
  if (pieChartRef.value && reportData.value) {
    // 每次都重新创建图表实例
    if (pieChart) {
      pieChart.dispose()
      pieChart = null
    }
    console.log('renderCharts - 初始化 pieChart')
    pieChart = echarts.init(pieChartRef.value)
    
    // 始终设置option，无论图表是否已存在
    console.log('renderCharts - 设置 pieChart option')

    // 准备内圈数据（BD前5）
    const bdData = (reportData.value.bdStats?.slice(0, 5) || []).map(bd => ({
      name: bd.bdName,
      value: bd.count
    }))

    // 准备外圈数据（达人前10）
    const influencerData = (reportData.value.influencerStats?.slice(0, 10) || []).map(inf => ({
      name: inf.influencerName,
      value: inf.count
    }))

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 20
      },
      series: [
        {
          name: 'BD销售分布',
          type: 'pie',
          radius: ['0%', '40%'],
          center: ['35%', '50%'],
          data: bdData,
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14
            }
          },
          itemStyle: {
            color: (params) => {
              const colors = ['#6DAD19', '#52A6E6', '#FF6B6B', '#4ECDC4', '#45B7D1']
              return colors[params.dataIndex % colors.length]
            }
          }
        },
        {
          name: '达人销售分布',
          type: 'pie',
          radius: ['50%', '70%'],
          center: ['35%', '50%'],
          data: influencerData,
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12
            }
          },
          itemStyle: {
            color: (params) => {
              const colors = ['#91CC75', '#5470C6', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#F5D6BA']
              return colors[params.dataIndex % colors.length]
            }
          }
        }
      ]
    }
    pieChart.setOption(option)
    pieChart.resize()
  }
  
  console.log('renderCharts - 渲染完成')
}

onMounted(() => {
  // 从URL查询参数读取活动筛选条件
  if (route.query.activityId) {
    filters.activityId = route.query.activityId
  }
  loadActivities()
  loadShops()
  loadBaseData()
  loadData()
})

defineExpose({
  loadData
})
</script>

<style scoped>
.product-tab {
  padding: 0;
}

.filter-section {
  margin-bottom: 20px;
}

.stats-info {
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

.tiktok-product-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiktok-id-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tiktok-id-btn {
  font-size: 12px;
  padding: 0;
}

.product-name-row {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.form-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 0 10px;
}

.form-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.subsection-header {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin: 16px 0 12px;
  padding: 8px 12px;
  background: #e9ecef;
  border-radius: 4px;
}

/* TikTok绿色样式 */
.tiktok-green-label :deep(.el-form-item__label) {
  color: #6DAD19;
}

:deep(.el-table__header .tiktok-green-label .cell) {
  color: #6DAD19;
}

:deep(.el-table__body .tiktok-green-label .cell) {
  color: #6DAD19;
}

.tiktok-green-input :deep(.el-input__wrapper) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper:hover) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

/* 活动佣金配置样式 */
.activity-commission-item {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  margin-bottom: 16px;
}

.activity-commission-item:last-child {
  margin-bottom: 0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.activity-title {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.empty-tip {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 14px;
  background: #f8f9fa;
  border-radius: 6px;
}

.clickable-stat {
  color: #6DAD19;
  cursor: pointer;
  font-weight: 500;
}

.clickable-stat:hover {
  text-decoration: underline;
}

.shop-link {
  color: #409eff;
  cursor: pointer;
}

.shop-link:hover {
  text-decoration: underline;
}

.shop-info-popover {
  font-size: 13px;
  line-height: 1.8;
}

.shop-info-item {
  margin-bottom: 4px;
}

.loading-tip {
  text-align: center;
  padding: 20px;
  color: #999;
}

.pagination-container {
  text-align: center;
  padding: 10px 0 5px;
}

.report-card {
  margin-bottom: 16px;
}

/* 商品详情弹层样式 */
.product-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.product-detail .section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 20px 0 12px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

.product-detail .section-title:first-child {
  margin-top: 0;
}

.product-detail .long-text {
  display: block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.product-detail .detail-label {
  font-weight: 500;
  color: #606266;
  background: #f5f7fa;
}

.product-detail .product-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-detail .product-cell .tiktok-id {
  color: #6DAD19;
  font-size: 12px;
}

.product-detail .product-cell .product-name {
  color: #303133;
  white-space: normal;
  word-break: break-all;
}

/* 防止横向滚动条 */
.product-detail-dialog :deep(.el-dialog__body) {
  overflow-x: hidden;
  padding: 0 24px 24px;
}

.product-detail-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
}

.product-detail-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
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
</style>
