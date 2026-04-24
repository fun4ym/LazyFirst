<template>
  <div class="public-sample-page">
    <!-- 错误提示 -->
    <div v-if="error" class="error-container">
      <el-result
        icon="error"
        :title="$t('samplePublic.accessFailed')"
        :sub-title="error"
      >
        <template #extra>
          <el-button type="primary" @click="retryLoad">{{ $t('samplePublic.retry') }}</el-button>
        </template>
      </el-result>
    </div>

    <!-- 正常内容 -->
    <div v-else class="content-container">
      <!-- 公司/店铺信息头部 -->
      <div class="shop-header" v-if="shopInfo">
        <div class="header-left">
          <!-- 店铺信息 -->
          <div class="shop-info" v-if="shopInfo">
            <h2>{{ shopInfo.shopName }}
              <!-- 语言切换 -->
              <el-select v-model="$i18n.locale" size="small" style="width: 90px; vertical-align: middle; margin-left: 10px;">
                <el-option label="中文" value="zh" />
                <el-option label="EN" value="en" />
                <el-option label="TH" value="th" />
              </el-select>
            </h2>
            <div class="shop-meta">
              <span class="header-subtitle">{{ $t('samplePublic.forLazyFirst') }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <img src="/logo.png" alt="Logo" class="header-logo" />
        </div>
      </div>

      <!-- 页签切换 -->
      <el-tabs v-model="activeTab" class="main-tabs">
        <el-tab-pane label="样品列表" name="sampleList">
          <!-- 搜索筛选 -->
          <el-card class="search-card">
        <el-form :model="searchForm" inline class="search-form">
          <el-form-item :label="$t('samplePublic.sampleStatus')">
            <el-select
              v-model="searchForm.sampleStatus"
              :placeholder="$t('samplePublic.selectAll')"
              clearable
              style="width: 120px"
              @change="loadSamples"
            >
              <el-option :label="$t('samplePublic.pending')" value="pending" />
              <el-option :label="$t('samplePublic.sent')" value="sent" />
              <el-option :label="$t('samplePublic.refused')" value="refused" />
            </el-select>
          </el-form-item>

          <el-form-item :label="$t('samplePublic.isOrderGenerated')">
            <el-select
              v-model="searchForm.isOrderGenerated"
              :placeholder="$t('samplePublic.selectAll')"
              clearable
              style="width: 100px"
              @change="loadSamples"
            >
              <el-option :label="$t('samplePublic.yes')" :value="true" />
              <el-option :label="$t('samplePublic.no')" :value="false" />
            </el-select>
          </el-form-item>

          <el-form-item :label="$t('samplePublic.applyDate')">
            <el-date-picker
              v-model="searchForm.date"
              type="date"
              :placeholder="$t('samplePublic.selectDate')"
              clearable
              style="width: 150px"
              value-format="YYYY-MM-DD"
              @change="loadSamples"
            />
          </el-form-item>

          <el-form-item :label="$t('samplePublic.productName')">
            <el-input
              v-model="searchForm.productName"
              :placeholder="$t('samplePublic.productNamePlaceholder')"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item :label="$t('samplePublic.influencerId')">
            <el-input
              v-model="searchForm.influencerAccount"
              :placeholder="$t('samplePublic.influencerId')"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item :label="$t('samplePublic.productIdHeader')">
            <el-input
              v-model="searchForm.productId"
              :placeholder="$t('samplePublic.productIdHeader')"
              clearable
              style="width: 150px"
              @keyup.enter="loadSamples"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="loadSamples">{{ $t('samplePublic.search') }}</el-button>
            <el-button @click="resetSearch">{{ $t('samplePublic.reset') }}</el-button>
          </el-form-item>
        </el-form>

        <!-- 批量操作栏 -->
        <div class="batch-actions" v-if="selectedSamples.length > 0">
          <div class="batch-left">
            <span class="selected-count">
              <el-icon><Check /></el-icon>
              {{ $t('samplePublic.selectedItems', { count: selectedSamples.length }) }}
            </span>
            <el-button text type="danger" @click="selectedSamples = []">{{ $t('samplePublic.cancelSelection') }}</el-button>
          </div>
          <div class="batch-right">
            <span class="batch-label">{{ $t('samplePublic.batchOperation') }}</span>
            <el-dropdown @command="handleBatchStatusCommand" trigger="click">
              <el-button type="primary" size="small">
                {{ $t('samplePublic.modifyStatus') }} <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pending">{{ $t('samplePublic.pending') }}</el-dropdown-item>
                  <el-dropdown-item command="sent">{{ $t('samplePublic.sent') }}</el-dropdown-item>
                  <el-dropdown-item command="refused">{{ $t('samplePublic.refused') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-dropdown @command="handleBatchAdCommand" trigger="click">
              <el-button type="success" size="small">
                {{ $t('samplePublic.adToggle') }} <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="true">{{ $t('samplePublic.openAd') }}{{ $t('samplePublic.adPromotion') }}</el-dropdown-item>
                  <el-dropdown-item :command="false">{{ $t('samplePublic.closeAd') }}{{ $t('samplePublic.adPromotion') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-card>

      <!-- 表格 -->
      <el-card class="table-card">
        <el-table
          :data="samples"
          v-loading="loading"
          stripe
          border
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />

          <!-- 寄样状态 -->
          <el-table-column :label="$t('samplePublic.shippingStatus')" width="160">
            <template #default="{ row }">
              <div class="sample-status" @click="openStatusEdit(row)">
                <el-tag 
                  :type="getSampleStatusType(row.sampleStatus)" 
                  size="default"
                  class="status-tag clickable"
                >
                  {{ getSampleStatusText(row.sampleStatus) }}
                </el-tag>
                <el-icon class="edit-icon"><Edit /></el-icon>
              </div>
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                {{ $t('samplePublic.refusalReason') }}：{{ row.refusalReason }}
              </div>
              <!-- 已寄样时显示物流信息 -->
              <div v-if="row.sampleStatus === 'sent'" class="sent-info">
                <span v-if="row.logisticsCompany" class="logistics-company-small">{{ row.logisticsCompany }}</span>
                <span v-if="row.logisticsCompany && row.trackingNumber"> - </span>
                <span v-if="row.trackingNumber" class="tracking-no">{{ row.trackingNumber }}</span>
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ $t('samplePublic.shippingPrefix') }}{{ formatDate(row.shippingDate) }}
              </div>
            </template>
          </el-table-column>



          <!-- 申请日期 -->
          <el-table-column :label="$t('samplePublic.applicationDate')" width="120" prop="date" sortable>
            <template #default="{ row }">
              {{ row.date ? formatDate(row.date) : '--' }}
            </template>
          </el-table-column>



          <!-- 商品信息 -->
          <el-table-column :label="$t('samplePublic.productInfo')" min-width="280">
            <template #default="{ row }">
              <ProductCell :product="{
                id: row.productId,
                name: row.productName,
                image: row.productImage,
                shopName: row.shopName,
                tiktokProductId: row.productId
              }" :disable-auto-fetch="true" @copy-field="onCopyField" />
            </template>
          </el-table-column>

          <!-- 达人信息 -->
          <el-table-column label="Influencer" min-width="260">
            <template #default="{ row }">
              <div class="influencer-info">
                <InfluencerCell :influencer="{
                  tiktokId: row.influencerAccount,
                  latestFollowers: row.followerCount,
                  latestGmv: row.gmv,
                  avgVideoViews: row.avgVideoViews,
                  monthlySalesCount: row.monthlySalesCount
                }" :showAvgViews="!!row.avgVideoViews" :showMonthlySales="!!row.monthlySalesCount" />
                <!-- 收货信息 -->
                <div class="influencer-address" v-if="row.shippingInfo">
                  <el-icon><Location /></el-icon>
                  <span class="address-text">{{ row.shippingInfo }}</span>
                  <el-icon class="copy-icon" @click.stop="copyAddress(row.shippingInfo)"><CopyDocument /></el-icon>
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 履约视频 -->
          <el-table-column :label="$t('samplePublic.fulfillmentVideo') || '履约视频'" width="280">
            <template #default="{ row }">
              <FulfillmentVideoCell
                :videos="[{ videoLink: row.videoLink, videoStreamCode: row.videoStreamCode, isAdPromotion: row.isAdPromotion }]"
                :editable="false"
                @adPromotionChange="(video, val) => handleAdPromotionChange(row, val)"
              />
            </template>
          </el-table-column>

          <!-- 是否出单 -->
          <el-table-column :label="$t('samplePublic.orderGenerated')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isOrderGenerated ? 'success' : 'info'" size="small">
                {{ row.isOrderGenerated ? $t('samplePublic.yes') : $t('samplePublic.no') }}
              </el-tag>
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
          @size-change="loadSamples"
          @current-change="loadSamples"
          style="margin-top: 20px"
        />
      </el-card>
        </el-tab-pane>
        <el-tab-pane :label="$t('samplePublic.productStats')" name="businessView">
          <div class="business-view">
            <!-- 搜索筛选 -->
            <el-card class="search-card">
              <el-form :model="businessSearchForm" inline class="search-form">
                <el-form-item :label="$t('samplePublic.productName')">
                  <el-input
                    v-model="businessSearchForm.productName"
                    :placeholder="$t('samplePublic.productNamePlaceholder')"
                    clearable
                    style="width: 150px"
                    @keyup.enter="loadBusinessViewData"
                  />
                </el-form-item>
                
                <el-form-item :label="$t('samplePublic.category')">
                  <el-select
                    v-model="businessSearchForm.categoryId"
                    :placeholder="$t('samplePublic.selectCategory')"
                    clearable
                    style="width: 150px"
                    @change="loadBusinessViewData"
                  >
                    <!-- 类别选项需要从API获取，暂时留空 -->
                    <el-option label="全部" value="" />
                  </el-select>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="loadBusinessViewData">{{ $t('samplePublic.search') }}</el-button>
                  <el-button @click="resetBusinessSearch">{{ $t('samplePublic.reset') }}</el-button>
                </el-form-item>
              </el-form>
            </el-card>
            
            <!-- 错误提示 -->
            <div v-if="businessViewError" class="error-container">
              <el-result
                icon="error"
                :title="$t('samplePublic.accessFailed')"
                :sub-title="businessViewError"
              >
                <template #extra>
                  <el-button type="primary" @click="loadBusinessViewData">{{ $t('samplePublic.retry') }}</el-button>
                </template>
              </el-result>
            </div>
            
            <!-- 产品统计表格 -->
            <el-card v-else class="table-card">
              <el-table
                :data="products"
                v-loading="businessViewLoading"
                stripe
                border
              >
                <!-- 产品信息 -->
                <el-table-column :label="$t('samplePublic.productInfo')" min-width="280">
                  <template #default="{ row }">
                    <ProductCell :product="{
                      id: row._id,
                      name: row.name,
                      image: row.images?.[0] || row.productImages?.[0],
                      shopName: shopInfo?.shopName,
                      tiktokProductId: row.tiktokProductId
                    }" :disable-auto-fetch="true" @copy-field="onCopyField" />
                  </template>
                </el-table-column>
                
                <!-- 样品申请数量 -->
                <el-table-column :label="$t('samplePublic.productStatsTable.sampleCount')" width="140">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><Document /></el-icon>
                      <span>{{ row.sampleCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 通过率 -->
                <el-table-column :label="$t('samplePublic.productStatsTable.passRate')" width="120">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><Check /></el-icon>
                      <span>{{ row.passRate || '0%' }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 视频数量 -->
                <el-table-column :label="$t('samplePublic.productStatsTable.videoCount')" width="120">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><VideoCamera /></el-icon>
                      <span>{{ row.videoCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                

              </el-table>
              
              <!-- 分页 -->
              <el-pagination
                v-model:current-page="businessPagination.page"
                v-model:page-size="businessPagination.limit"
                :total="businessPagination.total"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="loadBusinessViewData"
                @current-change="loadBusinessViewData"
                style="margin-top: 20px"
              />
            </el-card>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('samplePublic.videoList')" name="videoList">
          <div class="video-list">
            <!-- 搜索筛选 -->
            <el-card class="search-card">
              <el-form :model="videoSearchForm" inline class="search-form">
                <el-form-item :label="$t('samplePublic.filter.productName')">
                  <el-input
                    v-model="videoSearchForm.productName"
                    :placeholder="$t('samplePublic.filter.productName')"
                    clearable
                    style="width: 150px"
                    @keyup.enter="loadVideos"
                  />
                </el-form-item>
                <el-form-item :label="$t('samplePublic.filter.influencerAccount')">
                  <el-input
                    v-model="videoSearchForm.influencerAccount"
                    :placeholder="$t('samplePublic.filter.influencerAccount')"
                    clearable
                    style="width: 150px"
                    @keyup.enter="loadVideos"
                  />
                </el-form-item>
                <el-form-item :label="$t('samplePublic.filter.isAdPromotion')">
                  <el-select
                    v-model="videoSearchForm.isAdPromotion"
                    :placeholder="$t('samplePublic.filter.isAdPromotion')"
                    clearable
                    style="width: 150px"
                    @change="loadVideos"
                  >
                    <el-option :label="$t('samplePublic.filter.all')" :value="null" />
                    <el-option :label="$t('samplePublic.filter.promoted')" :value="true" />
                    <el-option :label="$t('samplePublic.filter.notPromoted')" :value="false" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="loadVideos">{{ $t('samplePublic.search') }}</el-button>
                  <el-button @click="resetVideoSearch">{{ $t('samplePublic.reset') }}</el-button>
                </el-form-item>
              </el-form>
            </el-card>
            
            <!-- 视频列表表格 -->
            <el-card class="table-card">
              <el-table
                :data="videoList"
                v-loading="videoLoading"
                stripe
                border
              >
                <!-- 商品信息 -->
                <el-table-column :label="$t('samplePublic.videoTable.productInfo')" min-width="280">
                  <template #default="{ row }">
                    <div v-if="row.productInfo" class="product-info">
                      <el-image
                        v-if="row.productInfo.image"
                        :src="row.productInfo.image"
                        :preview-src-list="[row.productInfo.image]"
                        fit="cover"
                        style="width: 40px; height: 40px; border-radius: 4px; margin-right: 10px;"
                      />
                      <div class="product-details">
                        <div class="product-name">{{ row.productInfo.name || '-' }}</div>
                        <div class="product-id">ID: {{ row.productInfo.tiktokProductId || row.productInfo._id }}</div>
                      </div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                
                <!-- 视频链接 -->
                <el-table-column :label="$t('samplePublic.videoTable.videoLink')" min-width="200">
                  <template #default="{ row }">
                    <a v-if="row.videoLink" :href="row.videoLink" target="_blank" class="video-link">
                      {{ $t('samplePublic.videoTable.viewVideo') }}
                    </a>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                
                <!-- 达人信息 -->
                <el-table-column :label="$t('samplePublic.videoTable.influencerInfo')" min-width="200">
                  <template #default="{ row }">
                    <div v-if="row.influencerInfo" class="influencer-info">
                      <div class="influencer-account">{{ row.influencerInfo.tiktokId || '-' }}</div>
                      <div class="influencer-followers">{{ row.influencerInfo.latestFollowers ? formatNumber(row.influencerInfo.latestFollowers) + '粉丝' : '-' }}</div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                
                <!-- 投流状态 -->
                <el-table-column :label="$t('samplePublic.videoTable.adPromotion')" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.isAdPromotion ? 'success' : 'info'" size="small">
                      {{ row.isAdPromotion ? $t('samplePublic.filter.promoted') : $t('samplePublic.filter.notPromoted') }}
                    </el-tag>
                  </template>
                </el-table-column>
                
                <!-- 更新时间 -->
                <el-table-column :label="$t('samplePublic.videoTable.updatedAt')" width="160">
                  <template #default="{ row }">
                    {{ formatDateTime(row.updatedAt) }}
                  </template>
                </el-table-column>
                
                <!-- 样品状态 -->
                <el-table-column :label="$t('samplePublic.videoTable.sampleStatus')" width="120">
                  <template #default="{ row }">
                    <el-tag v-if="row.sampleInfo" :type="getSampleStatusType(row.sampleInfo.sampleStatus)" size="small">
                      {{ getSampleStatusText(row.sampleInfo.sampleStatus) }}
                    </el-tag>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页 -->
              <el-pagination
                v-model:current-page="videoPagination.page"
                v-model:page-size="videoPagination.limit"
                :total="videoPagination.total"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="loadVideos"
                @current-change="loadVideos"
                style="margin-top: 20px"
              />
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 样品申请详情弹窗 - 参照达人详情弹层重新设计 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="currentEditRow ? $t('samplePublic.sampleDetail') : $t('samplePublic.modifyShippingStatus')"
      width="900px"
      :close-on-click-modal="false"
      class="business-detail-dialog"
    >
      <div v-if="currentEditRow" class="sample-detail-content">
        <!-- 头部区域 -->
        <div class="detail-header">
          <div class="detail-avatar">
            <el-image 
              v-if="currentEditRow.productImage" 
              :src="currentEditRow.productImage" 
              style="width: 64px; height: 64px; border-radius: 12px;" 
              fit="cover" 
              :preview-src-list="[currentEditRow.productImage]" 
            />
            <el-icon v-else :size="48"><Box /></el-icon>
          </div>
          <div class="detail-title">
            <div class="detail-id-row">
              <span class="detail-tiktok-id">{{ currentEditRow.influencerAccount || '-' }}</span>
              <el-tag :type="getSampleStatusType(currentEditRow.sampleStatus)" size="small">
                {{ getSampleStatusText(currentEditRow.sampleStatus) }}
              </el-tag>
              <el-tag v-if="currentEditRow.isAdPromotion" type="success" size="small">{{ $t('samplePublic.adPromoted') }}</el-tag>
              <el-tag v-if="currentEditRow.isOrderGenerated" type="warning" size="small">{{ $t('samplePublic.orderGenerated') }}</el-tag>
            </div>
            <div class="detail-name">{{ currentEditRow.productName || '-' }}</div>
            <div class="detail-bd">
              <span class="bd-label">商品ID:</span>
              <span>{{ currentEditRow.productId || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 核心指标卡片 -->
        <div class="detail-stats">
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('samplePublic.followers')" placement="top" :show-after="300">
                <span>FV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentEditRow.followerCount || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('samplePublic.gmv')" placement="top" :show-after="300">
                <span>GMV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ currentDefaultCurrencySymbol }}{{ formatNumber(currentEditRow.gmv || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('samplePublic.monthlySales')" placement="top" :show-after="300">
                <span>MSS</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentEditRow.monthlySalesCount || 0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <el-tooltip :content="$t('samplePublic.avgViews')" placement="top" :show-after="300">
                <span>APV</span>
              </el-tooltip>
            </div>
            <div class="stat-value">{{ formatNumber(currentEditRow.avgVideoViews || 0) }}</div>
          </div>
        </div>

        <!-- 双卡片布局 -->
        <div class="detail-info-grid">
          <!-- 达人信息卡片 -->
          <div class="info-section">
            <div class="section-title">{{ $t('samplePublic.influencerInfo') }}</div>
            <div class="info-row">
              <span class="info-label">{{ $t('samplePublic.tiktokId') }}</span>
              <span class="info-value">{{ currentEditRow.influencerAccount || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">BD</span>
              <span class="info-value">{{ currentEditRow.bd || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('samplePublic.shippingInfo') }}</span>
              <span class="info-value">{{ currentEditRow.shippingInfo || '-' }}</span>
            </div>
          </div>
          
          <!-- 申样结果卡片 -->
          <div class="info-section">
            <div class="section-title">{{ $t('samplePublic.sampleResult') }}</div>
            <div class="info-row">
              <span class="info-label">{{ $t('samplePublic.applicationDate') }}</span>
              <span class="info-value">{{ currentEditRow.date ? formatDate(currentEditRow.date) : '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{{ $t('samplePublic.sampleStatus') }}</span>
              <span class="info-value">
                <el-tag :type="getSampleStatusType(currentEditRow.sampleStatus)" size="small">
                  {{ getSampleStatusText(currentEditRow.sampleStatus) }}
                </el-tag>
              </span>
            </div>
            <div class="info-row" v-if="currentEditRow.videoLink">
              <span class="info-label">{{ $t('samplePublic.video') }}</span>
              <span class="info-value">
                <el-link :href="currentEditRow.videoLink" target="_blank" type="primary" underline="hover">
                  {{ $t('samplePublic.viewVideo') }}
                </el-link>
              </span>
            </div>
            <div class="info-row" v-if="currentEditRow.videoStreamCode">
              <span class="info-label">{{ $t('samplePublic.streamCode') }}</span>
              <span class="info-value">{{ currentEditRow.videoStreamCode }}</span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="dialog-footer">
          <el-button @click="statusDialogVisible = false">{{ $t('samplePublic.cancel') }}</el-button>
          <el-button type="primary" @click="confirmStatusUpdate" :loading="statusUpdateLoading">
            {{ $t('samplePublic.confirm') }}
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 批量更新物流公司弹窗 -->
    <el-dialog
      v-model="batchLogisticsDialogVisible"
      :title="$t('samplePublic.batchUpdate')"
      width="400px"
      :close-on-click-modal="false"
    >
      <div style="margin-bottom: 15px;">
        {{ $t('samplePublic.batchConfirmLogistics', { count: selectedSamples.length }) }}
      </div>
      <div class="edit-row">
        <span class="label">{{ $t('samplePublic.logisticsCompany') }}</span>
        <el-select v-model="batchLogisticsCompany" style="width: 200px">
          <el-option
            v-for="opt in logisticsCompanyOptions"
            :key="opt._id"
            :label="opt.name"
            :value="opt.code"
          />
        </el-select>
      </div>
      <template #footer>
        <el-button @click="batchLogisticsDialogVisible = false">{{ $t('samplePublic.cancel') }}</el-button>
        <el-button type="primary" @click="confirmBatchLogistics" :loading="statusUpdateLoading">
          {{ $t('samplePublic.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Edit, ArrowDown, User, VideoCamera, Picture, Money, Location, CopyDocument, Document, Star } from '@element-plus/icons-vue'
import axios from 'axios'
import ProductCell from '@/components/ProductCell.vue'
import InfluencerCell from '@/components/InfluencerCell.vue'
import FulfillmentVideoCell from '@/components/FulfillmentVideoCell.vue'

const { t } = useI18n()
const route = useRoute()
const API_BASE = '/api'

// 状态
const loading = ref(false)
const error = ref(null)
const companyInfo = ref(null)
const shopInfo = ref(null)
const logoLoadError = ref(false)
const samples = ref([])
const selectedSamples = ref([])
const activeTab = ref('sampleList') // 页签：sampleList, businessView, videoList

// 商家视角状态
const businessViewLoading = ref(false)
const businessViewError = ref(null)
const products = ref([]) // 产品列表
const productStats = ref({}) // 产品统计信息
const businessPagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})
const businessSearchForm = reactive({
  productName: '',
  categoryId: ''
})

// 视频列表状态
const videoList = ref([])
const videoLoading = ref(false)
const videoPagination = reactive({ page: 1, limit: 20, total: 0 })
const videoSearchForm = reactive({
  productName: '',
  influencerAccount: '',
  isAdPromotion: null
})

// 搜索表单
const searchForm = reactive({
  sampleStatus: 'pending', // 默认待审核
  isOrderGenerated: null,
  date: '',
  productName: '',
  influencerAccount: '',  // 达人ID
  productId: ''           // 商品ID
})

// 货币单位列表
const currencyList = ref([])

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 单条编辑弹窗
const statusDialogVisible = ref(false)
const currentEditRow = ref(null)
const detailActiveTab = ref('shipping') // 默认显示寄样状态页签
const sampleStatusForm = reactive({
  sampleStatus: 'pending',
  logisticsCompany: '',
  trackingNumber: '',
  refusalReason: ''
})
const statusUpdateLoading = ref(false)
const logisticsCompanyOptions = ref([])  // 物流公司选项列表

// 加载货币单位列表
const loadCurrencies = async () => {
  try {
    const res = await axios.get(`${API_BASE}/public/base-data/list`, { params: { type: 'priceUnit', limit: 100 } })
    currencyList.value = res.data.data || []
  } catch (error) {
    console.error('Load currencies error:', error)
    currencyList.value = []
  }
}

// 获取当前默认货币符号
const currentDefaultCurrencySymbol = computed(() => {
  const defaultCurrency = currencyList.value.find(c => c.isDefault)
  return defaultCurrency?.symbol || '¥'
})

// 批量更新物流公司弹窗
const batchLogisticsDialogVisible = ref(false)
const batchLogisticsCompany = ref('')  // 批量选择的物流公司

// 加载物流公司列表
const loadLogisticsCompanies = async () => {
  try {
    const res = await axios.get(`${API_BASE}/public/base-data/list`, { params: { type: 'trackingUrl', limit: 100 } })
    logisticsCompanyOptions.value = res.data.data || []
  } catch (error) {
    console.error('Load logistics companies error:', error)
    logisticsCompanyOptions.value = []
  }
}

// 状态变化时处理
const handleStatusChange = async () => {
  // 如果选择已寄样，先确保加载物流公司列表
  if (sampleStatusForm.sampleStatus === 'sent') {
    if (logisticsCompanyOptions.value.length === 0) {
      await loadLogisticsCompanies()
    }
    // 默认选择 default（除非已有有效选择）
    if (!sampleStatusForm.logisticsCompany || !logisticsCompanyOptions.value.find(opt => opt.code === sampleStatusForm.logisticsCompany)) {
      const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
      if (defaultOption) {
        sampleStatusForm.logisticsCompany = 'default'
      }
    }
  }
}

// 工具函数
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 文本截断函数
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getSampleStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    sent: 'success',
    refused: 'danger'
  }
  return typeMap[status] || 'info'
}

const getSampleStatusText = (status) => {
  const textMap = {
    pending: t('samplePublic.pending'),
    sent: t('samplePublic.sent'),
    refused: t('samplePublic.refused')
  }
  return textMap[status] || t('samplePublic.pending')
}

// 复制地址
const copyAddress = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('地址已复制')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 获取识别码
const getIdentificationCode = () => {
  return route.query.s
}

// 加载样品数据
const loadSamples = async () => {
  const identificationCode = getIdentificationCode()
  if (!identificationCode) {
    error.value = t('samplePublic.missingCode')
    return
  }

  loading.value = true
  try {
    const params = {
      s: identificationCode,
      page: pagination.page,
      limit: pagination.limit,
      sampleStatus: searchForm.sampleStatus || undefined,
      isOrderGenerated: searchForm.isOrderGenerated ?? undefined,
      date: searchForm.date || undefined,
      productName: searchForm.productName || undefined,
      influencerAccount: searchForm.influencerAccount || undefined,
      productId: searchForm.productId || undefined
    }

    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })

    const res = await axios.get(`${API_BASE}/public/samples`, { params })

    if (res.data.success) {
      companyInfo.value = res.data.data.company
      shopInfo.value = res.data.data.shop
      samples.value = res.data.data.samples
      pagination.total = res.data.data.pagination.total
      error.value = null
      // 加载货币单位
      await loadCurrencies()
    } else {
      error.value = res.data.message || '加载失败'
    }
  } catch (err) {
    console.error('Load samples error:', err)
    error.value = err.response?.data?.message || t('samplePublic.networkError')
  } finally {
    loading.value = false
  }
}

// 加载商家视角数据（产品统计）
const loadBusinessViewData = async () => {
  const identificationCode = getIdentificationCode()
  if (!identificationCode) {
    businessViewError.value = t('samplePublic.missingCode')
    return
  }

  businessViewLoading.value = true
  try {
    // 1. 首先加载样品数据以获取店铺信息（如果尚未加载）
    if (!shopInfo.value) {
      const sampleRes = await axios.get(`${API_BASE}/public/samples`, {
        params: { s: identificationCode, limit: 1 }
      })
      if (sampleRes.data.success && sampleRes.data.data.shop) {
        shopInfo.value = sampleRes.data.data.shop
      } else {
        businessViewError.value = '无法获取店铺信息'
        return
      }
    }
    
    // 2. 调用新的产品统计接口
    const params = {
      s: identificationCode,
      page: businessPagination.page,
      limit: businessPagination.limit,
      keyword: businessSearchForm.productName || undefined,
      categoryId: businessSearchForm.categoryId || undefined
    }
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key]
      }
    })
    
    const res = await axios.get(`${API_BASE}/public/products/statistics`, { params })
    
    if (res.data.success) {
      const data = res.data.data
      // 转换数据结构，将stats合并到product对象中
      products.value = data.products.map(product => ({
        _id: product._id,
        name: product.name,
        tiktokProductId: product.tiktokProductId,
        image: product.image,
        sampleCount: product.stats?.sampleCount || 0,
        sentCount: product.stats?.sentCount || 0,
        passRate: product.stats?.passRate || '0%',
        videoCount: product.stats?.videoCount || 0,
        adPromotionCount: product.stats?.adPromotionCount || 0,
        orderGeneratedCount: product.stats?.orderGeneratedCount || 0
      }))
      
      businessPagination.total = data.pagination?.total || 0
      businessViewError.value = null
      
      // 清理旧的productStats对象，数据已合并到products中
      productStats.value = {}
    } else {
      businessViewError.value = res.data.message || '加载产品统计数据失败'
    }
  } catch (err) {
    console.error('Load business view data error:', err)
    businessViewError.value = err.response?.data?.message || t('samplePublic.networkError')
  } finally {
    businessViewLoading.value = false
  }
}

// 加载视频列表
const loadVideos = async () => {
  const identificationCode = getIdentificationCode()
  if (!identificationCode) {
    // 如果没有识别码，不清空数据，因为可能是在其他页签
    return
  }

  videoLoading.value = true
  try {
    const params = {
      s: identificationCode,
      page: videoPagination.page,
      limit: videoPagination.limit,
      productName: videoSearchForm.productName || undefined,
      influencerAccount: videoSearchForm.influencerAccount || undefined,
      isAdPromotion: videoSearchForm.isAdPromotion !== null ? videoSearchForm.isAdPromotion.toString() : undefined
    }

    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })

    const res = await axios.get(`${API_BASE}/public/videos`, { params })

    if (res.data.success) {
      videoList.value = res.data.data.videos || []
      videoPagination.total = res.data.data.pagination?.total || 0
    } else {
      videoList.value = []
      videoPagination.total = 0
    }
  } catch (err) {
    console.error('Load videos error:', err)
    videoList.value = []
    videoPagination.total = 0
  } finally {
    videoLoading.value = false
  }
}

// 重置商家视角搜索
const resetBusinessSearch = () => {
  businessSearchForm.productName = ''
  businessSearchForm.categoryId = ''
  businessPagination.page = 1
  loadBusinessViewData()
}

// 重置搜索
const resetSearch = () => {
  searchForm.sampleStatus = 'pending'
  searchForm.isOrderGenerated = null
  searchForm.date = ''
  searchForm.productName = ''
  searchForm.influencerAccount = ''
  searchForm.productId = ''
  pagination.page = 1
  loadSamples()
}

// 重新加载
const retryLoad = () => {
  error.value = null
  loadSamples()
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedSamples.value = selection
}

// 打开单条状态编辑
const openStatusEdit = async (row) => {
  currentEditRow.value = row
  // 重置标签页为寄样状态页签
  detailActiveTab.value = 'shipping'
  // 加载物流公司列表
  await loadLogisticsCompanies()
  // 设置默认值：如果是新建或没有选择物流公司，选中 default
  let defaultLogistics = row.logisticsCompany || ''
  if (!defaultLogistics && logisticsCompanyOptions.value.length > 0) {
    const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
    if (defaultOption) {
      defaultLogistics = 'default'
    }
  }
  Object.assign(sampleStatusForm, {
    sampleStatus: row.sampleStatus || 'pending',
    logisticsCompany: defaultLogistics,
    trackingNumber: row.trackingNumber || '',
    refusalReason: row.refusalReason || ''
  })
  statusDialogVisible.value = true
}

// 确认单条状态更新
const confirmStatusUpdate = async () => {
  if (!currentEditRow.value) return

  // 已寄样时：确保物流公司有值（默认default）
  if (sampleStatusForm.sampleStatus === 'sent') {
    if (logisticsCompanyOptions.value.length === 0) {
      await loadLogisticsCompanies()
    }
    if (!sampleStatusForm.logisticsCompany) {
      const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
      sampleStatusForm.logisticsCompany = defaultOption ? 'default' : (logisticsCompanyOptions.value[0]?.code || '')
    }
  }



  statusUpdateLoading.value = true
  try {
    const identificationCode = getIdentificationCode()
    const params = {
      s: identificationCode,
      sampleStatus: sampleStatusForm.sampleStatus,
      sampleIds: currentEditRow.value._id
    }
    // 已寄样时发送物流信息
    if (sampleStatusForm.sampleStatus === 'sent') {
      params.logisticsCompany = sampleStatusForm.logisticsCompany
      params.trackingNumber = sampleStatusForm.trackingNumber
    }
    // 被拒绝时发送拒绝原因
    if (sampleStatusForm.sampleStatus === 'refused') {
      params.refusalReason = sampleStatusForm.refusalReason
    }
    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, { params })

    if (res.data.success) {
      ElMessage.success(t('samplePublic.updateSuccess'))
      currentEditRow.value.sampleStatus = sampleStatusForm.sampleStatus
      // 更新 isSampleSent
      currentEditRow.value.isSampleSent = sampleStatusForm.sampleStatus === 'sent'
      // 更新物流信息
      if (sampleStatusForm.sampleStatus === 'sent') {
        currentEditRow.value.logisticsCompany = sampleStatusForm.logisticsCompany
        currentEditRow.value.trackingNumber = sampleStatusForm.trackingNumber
      }
      // 更新拒绝原因
      if (sampleStatusForm.sampleStatus === 'refused') {
        currentEditRow.value.refusalReason = sampleStatusForm.refusalReason
      }
      statusDialogVisible.value = false
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
  } finally {
    statusUpdateLoading.value = false
  }
}

// 批量更新寄样状态
const handleBatchStatusCommand = async (status) => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning(t('samplePublic.selectItemsFirst'))
    return
  }

  // 如果是改为已寄样，先弹出对话框选择物流公司
  if (status === 'sent') {
    // 加载物流公司列表
    await loadLogisticsCompanies()
    
    // 默认选择 default
    let defaultCode = 'default'
    if (!logisticsCompanyOptions.value.find(opt => opt.code === 'default')) {
      defaultCode = logisticsCompanyOptions.value[0]?.code || ''
    }
    batchLogisticsCompany.value = defaultCode
    
    // 显示批量物流公司选择弹窗
    batchLogisticsDialogVisible.value = true
    return
  }

  try {
    await ElMessageBox.confirm(
      t('samplePublic.confirmUpdate', { count: selectedSamples.value.length, status: getSampleStatusText(status) }),
      t('samplePublic.batchUpdate'),
      { type: 'warning' }
    )

    const identificationCode = getIdentificationCode()
    const sampleIds = selectedSamples.value.map(s => s._id)

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        sampleStatus: status,
        sampleIds: sampleIds.join(',')
      }
    })

    if (res.data.success) {
      ElMessage.success(res.data.message)
      selectedSamples.value = []
      loadSamples()
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '更新失败')
    }
  }
}

// 确认批量更新物流公司
const confirmBatchLogistics = async () => {
  statusUpdateLoading.value = true
  try {
    const identificationCode = getIdentificationCode()
    const sampleIds = selectedSamples.value.map(s => s._id)

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        sampleStatus: 'sent',
        logisticsCompany: batchLogisticsCompany.value,
        sampleIds: sampleIds.join(',')
      }
    })

    if (res.data.success) {
      ElMessage.success(res.data.message)
      selectedSamples.value = []
      batchLogisticsDialogVisible.value = false
      loadSamples()
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
  } finally {
    statusUpdateLoading.value = false
  }
}

// 批量更新投流开关
const handleBatchAdCommand = async (isAdPromotion) => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning(t('samplePublic.selectItemsFirst'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('samplePublic.confirmAdUpdate', { count: selectedSamples.value.length, status: isAdPromotion ? t('samplePublic.openAd') : t('samplePublic.closeAd') }),
      t('samplePublic.batchUpdate'),
      { type: 'warning' }
    )

    const identificationCode = getIdentificationCode()
    const sampleIds = selectedSamples.value.map(s => s._id)

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        isAdPromotion: isAdPromotion,
        sampleIds: sampleIds.join(',')
      }
    })

    if (res.data.success) {
      ElMessage.success(res.data.message)
      selectedSamples.value = []
      loadSamples()
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
    }
  }
}

// 单个投流开关变化
const handleAdPromotionChange = async (row, newValue) => {
  try {
    const identificationCode = getIdentificationCode()

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        isAdPromotion: newValue,
        sampleIds: row._id
      }
    })

    if (res.data.success) {
      row.isAdPromotion = newValue
      ElMessage.success(t('samplePublic.updateSuccess'))
    } else {
      ElMessage.error(res.data.message)
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
    }
  }
}

const openSubmissionDetail = (submission) => {
  // 在PublicCollection中，我们使用openStatusEdit来显示详情
  // 首先找到对应的完整sample记录
  const sample = samples.value.find(s => s._id === submission.sampleId)
  if (sample) {
    openStatusEdit(sample)
  } else {
    ElMessage.info('正在加载详情...')
  }
}

// 复制字段
const onCopyField = (field, value) => {
  try {
    navigator.clipboard.writeText(value)
    ElMessage.success(`${field}已复制`)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}





// 监听页签切换
watch(activeTab, (newTab) => {
  if (newTab === 'businessView') {
    loadBusinessViewData()
  } else if (newTab === 'videoList') {
    loadVideos()
  }
})

onMounted(() => {
  loadSamples()
  loadCurrencies()
})
</script>

<style scoped>
.public-sample-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.content-container {
  max-width: 1400px;
  margin: 0 auto;
}

.shop-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 32px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-logo {
  width: 100px;
  height: auto;
  object-fit: contain;
}

.company-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.3);
}

.company-logo-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.company-name {
  font-size: 20px;
  font-weight: 600;
}

.divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,0.3);
}

.shop-info h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.shop-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shop-meta .el-tag {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.gen-time {
  font-size: 14px;
  opacity: 0.9;
}

.search-card,
.table-card {
  margin-bottom: 20px;
}

.search-form {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, #e6f7ff 0%, #f6ffed 100%);
  border-radius: 8px;
  margin-top: 16px;
  border: 1px solid #91d5ff;
}

.batch-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
}

.batch-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-label {
  color: #666;
  font-size: 14px;
}

/* 表格样式 */
.sample-status {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.status-tag.clickable:hover {
  opacity: 0.8;
}

.edit-icon {
  font-size: 14px;
  color: #909399;
  opacity: 0;
  transition: opacity 0.2s;
}

.sample-status:hover .edit-icon {
  opacity: 1;
}

.refusal-reason {
  font-size: 11px;
  color: #f56c6c;
  margin-top: 4px;
}

.tracking-no,
.shipping-date {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.stream-code {
  font-family: monospace;
  color: #e6a23c;
  font-weight: 500;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.product-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.product-name {
  font-weight: 500;
  color: #303133;
}

.product-id {
  font-size: 11px;
  color: #909399;
}

.influencer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.influencer-account .tiktok-id {
  color: #6DAD19;
  font-weight: 600;
  font-size: 14px;
}

.influencer-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  cursor: help;
}

.stat-item:hover {
  color: #409eff;
}

.stat-item.gmv {
  color: #e6a23c;
  font-weight: 500;
}

.influencer-address {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #909399;
}

.influencer-address .el-icon {
  color: #67c23a;
}

.address-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.copy-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  margin-left: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.copy-icon:hover {
  opacity: 1;
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  font-size: 12px;
  text-decoration: none;
}

.video-link:hover {
  text-decoration: underline;
}

.sample-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #eee;
}

.image-error {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
}

.no-video {
  color: #909399;
}

/* 单条编辑弹窗 */
.status-edit-form {
  padding: 20px;
}

.edit-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.edit-row .label {
  width: 80px;
  color: #666;
  font-size: 14px;
}

.edit-row .value {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.duplicate-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background-color: #f56c6c;
  border-radius: 50%;
  margin-left: 3px;
  vertical-align: middle;
  cursor: pointer;
  font-size: 9px;
}

.badge-count {
  color: white;
  font-size: 9px;
  font-weight: bold;
}

.previous-submissions-popover h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.submission-item:hover {
  background-color: #f5f7fa;
}

.logistics-company-small {
  font-size: 12px;
  color: #666;
}
/* 商家视角特定样式 */
.business-view .stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.business-view .stat-item .el-icon {
  color: #409eff;
}

.business-view .stat-item .el-icon[fire] {
  color: #e6a23c;
}

.business-view .stat-item .el-icon[money] {
  color: #67c23a;
}

.business-view .product-actions {
  display: flex;
  gap: 8px;
}

/* ========================================
   样品申请详情弹层新样式 - 商务高级版
   ======================================== */

/* 对话框头部样式 */
.business-detail-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px 24px;
  margin: 0;
}

.business-detail-dialog :deep(.el-dialog__title) {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.business-detail-dialog :deep(.el-dialog__body) {
  padding: 24px;
  background: #f8f9fc;
}

.sample-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 头部区域 */
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
}

.detail-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #7b1fa2 0%, #9c4dcc 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.detail-title {
  flex: 1;
}

.detail-id-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.detail-tiktok-id {
  font-size: 18px;
  font-weight: 600;
  color: #6DAD19;
}

.detail-name {
  font-size: 16px;
  color: #303133;
  margin-bottom: 4px;
}

.detail-bd {
  font-size: 13px;
  color: #606266;
}

.bd-label {
  font-weight: 500;
  margin-right: 4px;
}

/* 核心指标卡片 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
  border: 1px solid #e8e8e8;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

/* 标签页样式 */
.detail-tabs {
  margin-top: 16px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin: 0 0 16px 0;
}

.detail-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #ebeef5;
}

.detail-tabs :deep(.el-tabs__item) {
  font-weight: 500;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
}

.detail-tabs :deep(.el-tabs__item.is-active) {
  color: #6DAD19;
}

.detail-tabs :deep(.el-tabs__active-bar) {
  background-color: #6DAD19;
}

/* 信息网格布局 */
.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 4px;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: #909399;
  flex-shrink: 0;
  min-width: 70px;
}

.info-value {
  color: #303133;
  word-break: break-all;
}

/* 拒绝原因样式 */
.refusal-reason {
  font-size: 13px;
  color: #f56c6c;
  background: #fef0f0;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #f56c6c;
  margin-top: 8px;
}

/* 创建时间信息 */
.created-info {
  text-align: right;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  color: #909399;
  font-size: 12px;
  margin-top: 16px;
}

.created-label {
  margin-right: 8px;
}

.created-value {
  font-weight: 500;
}
</style>
