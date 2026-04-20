<template>
  <div class="sample-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('samples.title') }}</h3>
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog" v-if="hasPermission('samples:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('samples.add') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('samples.tiktokId')">
          <el-input
            v-model="searchForm.influencerAccount"
            :placeholder="$t('samples.tiktokId')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.productName')">
          <el-input
            v-model="searchForm.productName"
            :placeholder="$t('samples.productName')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.productId')">
          <el-input
            v-model="searchForm.productId"
            :placeholder="$t('samples.productId')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.bd')">
          <el-input
            v-model="searchForm.salesman"
            :placeholder="$t('samples.bd')"
            clearable
            style="width: 120px"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.shop')">
          <el-select
            v-model="searchForm.shopId"
            :placeholder="$t('samples.selectShop')"
            clearable
            filterable
            style="width: 150px"
          >
            <el-option
              v-for="shop in shopList"
              :key="shop._id"
              :label="shop.shopName"
              :value="shop._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('samples.applyDate')">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            :range-separator="'-'"
            :start-placeholder="$t('samples.startDate')"
            :end-placeholder="$t('samples.endDate')"
            clearable
            style="width: 240px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.sampleStatus')">
          <el-select
            v-model="searchForm.sampleStatus"
            :placeholder="$t('samples.all')"
            clearable
            style="width: 120px"
          >
            <el-option :label="$t('samples.pending')" :value="'pending'" />
            <el-option :label="$t('samples.sent')" :value="'sent'" />
            <el-option :label="$t('samples.refused')" :value="'refused'" />
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('samples.isOrderGenerated')">
          <el-select
            v-model="searchForm.isOrderGenerated"
            :placeholder="$t('samples.all')"
            clearable
            style="width: 100px"
          >
            <el-option :label="$t('samples.yes')" :value="true" />
            <el-option :label="$t('samples.no')" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSamples">{{ $t('samples.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('samples.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table
        :data="samples"
        v-loading="loading"
        stripe
        border
        class="sample-table"
        :row-class-name="getSampleRowClassName"
      >
        <el-table-column
          label="Influencer"
          width="260"
          fixed="left"
          prop="influencerAccount"
          sortable
        >
          <template #default="{ row }">
            <div class="tiktok-id-wrapper">
              <span class="tiktok-id-cell clickable" @click="viewSampleDetail(row)">
                <InfluencerCell :influencer="{
                  tiktokId: row.influencerAccount,
                  tiktokName: row.influencerName,
                  latestFollowers: row.followerCount,
                  latestGmv: row.gmv,
                  avgVideoViews: row.avgVideoViews,
                  monthlySalesCount: row.monthlySalesCount
                }" />
              </span>
              <el-popover
                v-if="row.duplicateCount > 0"
                placement="right"
                :width="400"
                trigger="hover"
              >
                <template #reference>
                  <div class="duplicate-badge" @click.stop>
                    <span class="badge-count">{{ row.duplicateCount }}</span>
                  </div>
                </template>
                <div class="previous-submissions-popover">
                  <div class="popover-header">
                    <h4>{{ $t('samples.historySampleRecords', { count: row.duplicateCount }) }}</h4>
                  </div>
                  <div class="popover-content">
                    <!-- 商品和达人信息只展示一次 -->
                    <div class="summary-info" v-if="row.previousSubmissions && row.previousSubmissions.length > 0">
                      <div class="summary-item">
                        <span class="summary-label">{{ $t('samples.productNameColon') }}</span>
                        <span class="summary-value">{{ row.previousSubmissions[0].productName || '-' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="summary-label">{{ $t('samples.tiktokIdColon') }}</span>
                        <span class="summary-value">{{ row.previousSubmissions[0].influencerAccount || '-' }}</span>
                      </div>
                    </div>
                    
                    <!-- 申请记录列表 -->
                    <div class="submissions-list" style="max-height: 280px; overflow-y: auto; margin-top: 16px;">
                      <div 
                        v-for="(sub, index) in row.previousSubmissions" 
                        :key="index"
                        class="submission-item"
                        @click="openSubmissionDetail(sub)"
                        style="cursor: pointer; padding: 12px; border-bottom: 1px solid #f0f0f0;"
                      >
                        <div class="submission-row">
                          <div class="submission-cell">
                            <span class="cell-label">{{ $t('samples.applyDateColon') }}</span>
                            <span class="cell-value">{{ formatDate(sub.date) }}</span>
                          </div>
                          <div class="submission-cell">
                            <span class="cell-label">{{ $t('samples.approvalStatusColon') }}</span>
                            <span class="cell-value">
                              <el-tag :type="getSampleStatusType(sub.sampleStatus)" size="small" class="status-tag">
                                {{ getSampleStatusText(sub.sampleStatus) }}
                              </el-tag>
                              <span class="salesman-text" v-if="sub.salesman">{{ sub.salesman }}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-popover>
              <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">{{ $t('samples.blacklist') }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 寄样状态 - 锁定左边 -->
        <el-table-column
          :label="$t('samples.sampleStatus')"
          width="160"
          fixed="left"
        >
          <template #default="{ row }">
            <div class="sample-status">
              <div class="status-row">
                <el-tag :type="getSampleStatusType(row.sampleStatus)" size="small">
                  {{ getSampleStatusText(row.sampleStatus) }}
                </el-tag>
                <el-icon class="edit-icon" @click.stop="openSampleStatusDialog(row)"><Edit /></el-icon>
              </div>
              <!-- 已寄样时显示物流信息 -->
              <div v-if="row.sampleStatus === 'sent'" class="sent-info">
                <span v-if="row.logisticsCompany" class="logistics-company-small">
                  {{ getLogisticsCompanyText(row.logisticsCompany) }}
                </span>
                <span v-if="row.logisticsCompany && row.trackingNumber"> - </span>
                <span v-if="row.trackingNumber" class="tracking-no">{{ row.trackingNumber }}</span>
              </div>
              <!-- 不合作时显示原因 -->
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                {{ $t('samples.refusalReason') }}：{{ row.refusalReason }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 履约情况 -->
        <el-table-column
          :label="$t('samples.fulfillment')"
          width="240"
        >
          <template #default="{ row }">
            <div class="fulfillment-info">
              <span
                class="clickable-link"
                :class="{ 'has-orders': row.orderCount > 0 }"
                @click="goToOrders(row)"
              >
                <el-tag
                  :type="row.isOrderGenerated ? 'success' : 'warning'"
                  size="small"
                >
                  {{ row.isOrderGenerated ? $t('samples.orderGenerated') : $t('samples.noOrder') }}
                </el-tag>
                <span v-if="row.isOrderGenerated && row.orderCount" class="order-count-badge">
                  {{ row.orderCount > 99 ? '...' : row.orderCount }}
                </span>
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 履约视频 - 带编辑功能 -->
        <el-table-column
          :label="$t('samples.fulfillmentVideo')"
          width="320"
        >
          <template #default="{ row }">
            <FulfillmentVideoCell
              :videos="row.videos"
              :editable="true"
              @edit="(video, idx) => openVideoEditDialog(row, video, idx)"
              @delete="(video, idx) => handleDeleteVideo(row, video, idx)"
              @add="openVideoAddDialog(row)"
            />
          </template>
        </el-table-column>

        <!-- 申请日期 - 不再锁定 -->
        <el-table-column
          :label="$t('samples.applicationDate')"
          width="120"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.date ? formatDate(row.date) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.productInfo')"
          width="300"
          prop="productName"
          sortable
        >
          <template #default="{ row }">
            <ProductCell :product="{
              image: row.productImage,
              id: row.productId_display || row.productId,
              productId: row.productId,
              tiktokProductId: row.tiktokProductId,
              name: row.productName,
              shopName: row.shopName
            }" />
          </template>
        </el-table-column>





        <el-table-column
          :label="$t('samples.bd')"
          width="100"
          prop="salesman"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.salesman || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.addressInfo')"
          width="200"
        >
          <template #default="{ row }">
            <div class="shipping-info">
              <el-tooltip :content="row.shippingInfo" placement="top">
                <div class="truncate-text">{{ row.shippingInfo || '--' }}</div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.receiveDate')"
          width="120"
          prop="receivedDate"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.receivedDate ? formatDate(row.receivedDate) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.action')"
          width="150"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)" v-if="hasPermission('samples:read')">{{ $t('samples.detail') }}</el-button>
            <el-button link type="warning" @click="openEditDialog(row)" v-if="hasPermission('samples:update')">{{ $t('samples.edit') }}</el-button>
            <el-button link type="danger" @click="deleteSample(row)" v-if="hasPermission('samples:delete')">{{ $t('samples.delete') }}</el-button>
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

    <!-- 详情对话框 - 重新设计为商务感 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentSample?.isBlacklistedInfluencer ? $t('samples.sampleDetail') + ' (' + $t('samples.blacklist') + ')' : $t('samples.sampleDetail')"
      width="900px"
      :class="currentSample?.isBlacklistedInfluencer ? 'detail-dialog-blacklist' : ''"
      class="business-detail-dialog"
    >
      <div v-if="currentSample" :class="currentSample.isBlacklistedInfluencer ? 'detail-content-blacklist' : 'detail-content'">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentSample.isBlacklistedInfluencer"
          :title="$t('samples.blacklistWarning')"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 24px"
        />

        <!-- 标签页导航 -->
        <el-tabs v-model="detailActiveTab" class="business-tabs">
          <!-- 基础信息标签页 -->
          <el-tab-pane :label="$t('samples.basicInfo')" name="basic">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.tiktokIdLabel') }}</span>
                  <span class="cell-value tiktok-id-text">{{ currentSample.influencerAccount || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.applyDateLabel') }}</span>
                  <span class="cell-value">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.bdLabel') }}</span>
                  <span class="cell-value">{{ currentSample.salesman || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell wide">
                  <span class="cell-label">{{ $t('samples.productNameLabel') }}</span>
                  <span class="cell-value product-name">{{ currentSample.productName || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.productIdLabel') }}</span>
                  <span class="cell-value">{{ currentSample.productId || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.sampleImageLabel') }}</span>
                  <div class="cell-value">
                    <el-image 
                      v-if="currentSample.sampleImage" 
                      :src="currentSample.sampleImage" 
                      style="width: 60px; height: 60px" 
                      fit="cover" 
                      :preview-src-list="[currentSample.sampleImage]" 
                    />
                    <span v-else>-</span>
                  </div>
                </div>
              </div>
              
              <!-- 达人数据统计 -->
              <div class="statistics-section">
                <h4 class="section-title">{{ $t('samples.influencerStats') }}</h4>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('samples.followerCountLabel') }}</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.followerCount) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('samples.monthlySalesLabel') }}</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.monthlySalesCount) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('samples.avgViewsLabel') }}</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.avgVideoViews) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">GMV</span>
                    <span class="stat-value">{{ currentSample.gmv || '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 收货地址 -->
              <div class="shipping-section">
                <h4 class="section-title">{{ $t('samples.shippingInfoSection') }}</h4>
                <div class="shipping-info">
                  <span class="shipping-value">{{ currentSample.shippingInfo || '-' }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 寄样状态标签页 -->
          <el-tab-pane :label="$t('samples.sampleStatus')" name="shipping">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.sampleStatusLabel') }}</span>
                  <span class="cell-value">
                    <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="large">
                      {{ getSampleStatusText(currentSample.sampleStatus) }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.sampleSentLabel') }}</span>
                  <span class="cell-value">
                    <el-tag :type="currentSample.isSampleSent ? 'success' : 'info'" size="large">
                      {{ currentSample.isSampleSent ? $t('samples.yes') : $t('samples.no') }}
                    </el-tag>
                  </span>
                </div>
              </div>
              
              <!-- 已寄样时的物流信息 -->
              <div class="shipping-details" v-if="currentSample.sampleStatus === 'sent'">
                <h4 class="section-title">{{ $t('samples.shippingDetails') }}</h4>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samples.shippingDateLabel') }}</span>
                    <span class="detail-value">{{ currentSample.shippingDate ? formatDate(currentSample.shippingDate) : '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samples.logisticsCompanyLabel') }}</span>
                    <span class="detail-value">{{ currentSample.logisticsCompany || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samples.trackingNumberLabel') }}</span>
                    <span class="detail-value">{{ currentSample.trackingNumber || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samples.receivedDateLabel') }}</span>
                    <span class="detail-value">{{ currentSample.receivedDate ? formatDate(currentSample.receivedDate) : '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 拒绝时的原因 -->
              <div class="refusal-section" v-if="currentSample.sampleStatus === 'refused' && currentSample.refusalReason">
                <h4 class="section-title">{{ $t('samples.refusalSection') }}</h4>
                <div class="refusal-reason">
                  {{ currentSample.refusalReason }}
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 履约信息标签页 -->
          <el-tab-pane :label="$t('samples.fulfillmentInfo')" name="fulfillment">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.orderStatusLabel') }}</span>
                  <span class="cell-value">
                    <el-tag :type="currentSample.isOrderGenerated ? 'success' : 'warning'" size="large">
                      {{ currentSample.isOrderGenerated ? $t('samples.orderGenerated') : $t('samples.noOrder') }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samples.fulfillmentTimeLabel') }}</span>
                  <span class="cell-value">{{ currentSample.fulfillmentTime || '-' }}</span>
                </div>
              </div>
              
              <!-- 视频链接 -->
              <div class="video-section" v-if="currentSample.videoLink">
                <h4 class="section-title">{{ $t('samples.videoSection') }}</h4>
                <div class="video-info">
                  <el-link :href="currentSample.videoLink" target="_blank" type="primary">
                    {{ $t('samples.viewVideo') }}
                  </el-link>
                </div>
              </div>
              
              <!-- 投流信息 -->
              <div class="ad-promotion-section">
                <h4 class="section-title">{{ $t('samples.adPromotionSection') }}</h4>
                <div class="ad-grid">
                  <div class="ad-item">
                    <span class="ad-label">{{ $t('samples.adStatusLabel') }}</span>
                    <span class="ad-value">
                      <el-tag :type="currentSample.isAdPromotion ? 'success' : 'info'" size="large">
                        {{ currentSample.isAdPromotion ? $t('samples.adPromoted') : $t('samples.notAdPromoted') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="ad-item">
                    <span class="ad-label">{{ $t('samples.adTimeLabel') }}</span>
                    <span class="ad-value">{{ currentSample.adPromotionTime ? formatDate(currentSample.adPromotionTime) : '-' }}</span>
                  </div>
                  <div class="ad-item wide">
                    <span class="ad-label">{{ $t('samples.streamCodeLabel') }}</span>
                    <span class="ad-value">{{ currentSample.videoStreamCode || '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 更新信息 -->
              <div class="update-info-section">
                <div class="update-item">
                  <span class="update-label">{{ $t('samples.orderInfoUpdate') }}</span>
                  <span class="update-value">
                    {{ currentSample.fulfillmentUpdatedBy?.realName || currentSample.fulfillmentUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.fulfillmentUpdatedAt">{{ formatDateTime(currentSample.fulfillmentUpdatedAt) }}</span>
                  </span>
                </div>
                <div class="update-item">
                  <span class="update-label">{{ $t('samples.adInfoUpdate') }}</span>
                  <span class="update-value">
                    {{ currentSample.adPromotionUpdatedBy?.realName || currentSample.adPromotionUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.adPromotionUpdatedAt">{{ formatDateTime(currentSample.adPromotionUpdatedAt) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 达人信息标签页 -->
          <el-tab-pane :label="$t('samples.influencerInfo')" name="influencer">
            <div v-if="influencerDetail">
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('samples.tiktokIdLabel') }}</span>
                    <span class="cell-value tiktok-id-text">{{ influencerDetail.tiktokId }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('samples.tiktokNameLabel') }}</span>
                    <span class="cell-value">{{ influencerDetail.tiktokName || '-' }}</span>
                  </div>
                </div>
                
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('samples.realNameLabel') }}</span>
                    <span class="cell-value">{{ influencerDetail.realName || '-' }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('samples.nicknameLabel') }}</span>
                    <span class="cell-value">{{ influencerDetail.nickname || '-' }}</span>
                  </div>
                </div>
                
                <!-- 达人统计数据 -->
                <div class="influencer-stats">
                  <h4 class="section-title">{{ $t('samples.influencerStatsSection') }}</h4>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">{{ $t('samples.latestFollowerCount') }}</span>
                      <span class="stat-value highlight-value">{{ formatNumber(influencerDetail.latestFollowers) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ $t('samples.latestGmv') }}</span>
                      <span class="stat-value">{{ influencerDetail.latestGmv || '-' }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 达人状态 -->
                <div class="status-section">
                  <div class="status-item">
                    <span class="status-label">{{ $t('samples.influencerStatusLabel') }}</span>
                    <span class="status-value">
                      <el-tag :type="influencerDetail.status === 'enabled' ? 'success' : 'info'" size="large">
                        {{ influencerDetail.status === 'enabled' ? $t('samples.enabled') : $t('samples.disabled') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">{{ $t('samples.blacklistStatusLabel') }}</span>
                    <span class="status-value">
                      <el-tag v-if="influencerDetail.isBlacklisted" type="danger" size="large">{{ $t('samples.blacklist') }}</el-tag>
                      <span v-else>{{ $t('samples.normal') }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else :description="$t('samples.influencerNotFound')" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
        
        <!-- 创建时间信息 -->
        <div class="created-info">
          <span class="created-label">{{ $t('samples.createdAtLabel') }}</span>
          <span class="created-value">{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="editingSample ? $t('samples.editSample') : $t('samples.createSample')"
      width="700px"
      @close="createDialogVisible = false; editingSample = null"
    >
      <el-form
        :model="createForm"
        :rules="createRules"
        ref="createFormRef"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('samples.applyDate2')" prop="date">
              <el-date-picker
                v-model="createForm.date"
                type="date"
                :placeholder="$t('samples.selectDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('samples.bd')" prop="salesmanId">
              <el-select v-model="createForm.salesmanId" :placeholder="$t('samples.selectBD')" filterable style="width: 100%" :loading="bdLoading">
                <el-option
                  v-for="user in users"
                  :key="user._id"
                  :label="user.realName || user.username"
                  :value="user._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('samples.productInfo')" required>
          <el-select
            v-model="createForm.productId"
            filterable
            remote
            :placeholder="$t('samples.searchProduct')"
            :remote-method="searchProducts"
            :loading="productLoading"
            style="width: 100%"
            @change="handleProductSelect"
          >
            <el-option
              v-for="product in cooperationProducts"
              :key="product._id"
              :label="`${product.name || product.productName} (${product.tiktokProductId || product.productId || product._id})`"
              :value="product._id"
            >
              <span>{{ product.name || product.productName }}</span>
              <span style="color: #6DAD19; font-size: 12px;"> - {{ product.tiktokProductId || product.productId || product._id }}</span>
            </el-option>
          </el-select>
          <el-input v-model="createForm.productName" type="hidden" />
        </el-form-item>

        <el-form-item :label="$t('samples.tiktokId')" prop="influencerId" class="tiktok-label">
          <el-select
            v-model="createForm.influencerId"
            filterable
            remote
            :placeholder="$t('samples.tiktokId')"
            :remote-method="searchInfluencers"
            :loading="influencerLoading"
            style="width: 100%"
            @change="handleInfluencerSelect"
          >
            <el-option
              v-for="inf in influencerOptions"
              :key="inf._id"
              :label="`${inf.tiktokId} (${inf.tiktokName || '-'})`"
              :value="inf._id"
            >
              <span>{{ inf.tiktokId }}</span>
              <span style="color: #999; font-size: 12px; margin-left: 8px;">{{ inf.tiktokName || '' }}</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <!-- 移除了粉丝数/GMV/月销量/均播等冗余字段，数据从达人表populate自动获取 -->
        </el-row>

        <el-form-item :label="$t('samples.addressInfo')" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            :placeholder="$t('samples.enterAddress')"
          />
        </el-form-item>

        <!-- 移除了样品图片字段，现在从Product表populate自动获取 -->

        <el-divider>{{ $t('samples.sampleStatus') }}</el-divider>

        <el-form-item :label="$t('samples.isSampleSent')">
          <el-switch v-model="createForm.isSampleSent" />
        </el-form-item>

        <template v-if="createForm.isSampleSent">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="$t('samples.trackingNo')">
                <el-input v-model="createForm.trackingNumber" :placeholder="$t('samples.enterTrackingNo')" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('samples.logisticsCompany')">
                <el-input v-model="createForm.logisticsCompany" :placeholder="$t('samples.enterLogistics')" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="$t('samples.shippingDate')">
            <el-date-picker
              v-model="createForm.shippingDate"
              type="date"
              :placeholder="$t('samples.selectDate')"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>

        <el-divider>{{ $t('samples.fulfillment') }}</el-divider>

        <el-form-item :label="$t('samples.isOrderGenerated')">
          <el-switch v-model="createForm.isOrderGenerated" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="creating">{{ editingSample ? $t('common.save') : $t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 寄样状态编辑对话框 -->
    <el-dialog
      v-model="sampleStatusDialogVisible"
      :title="$t('samples.updateSampleStatus')"
      width="450px"
    >
      <el-form :model="sampleStatusForm" label-width="90px">
        <el-form-item :label="$t('samples.sampleStatus')">
          <el-select v-model="sampleStatusForm.sampleStatus" :placeholder="$t('samples.selectSampleStatus')" style="width: 100%" @change="handleSampleStatusChange">
            <el-option :label="$t('samples.pending')" value="pending" />
            <el-option :label="$t('samples.sent')" value="sent" />
            <el-option :label="$t('samples.refused')" value="refused" />
          </el-select>
        </el-form-item>
        <!-- 已寄样时显示物流信息 -->
        <template v-if="sampleStatusForm.sampleStatus === 'sent'">
          <el-form-item :label="$t('samples.logisticsCompany')">
            <el-select v-model="sampleStatusForm.logisticsCompany" :placeholder="$t('samples.selectLogisticsPlaceholder')" style="width: 100%">
              <el-option
                v-for="opt in logisticsCompanyOptions"
                :key="opt._id"
                :label="opt.name"
                :value="opt.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('samples.trackingNo')">
            <el-input v-model="sampleStatusForm.trackingNumber" :placeholder="$t('samples.trackingNumberPlaceholder')" />
          </el-form-item>
        </template>
        <el-form-item v-if="sampleStatusForm.sampleStatus === 'refused'" :label="$t('samples.refusalReason')">
          <el-input v-model="sampleStatusForm.refusalReason" type="textarea" :rows="3" :placeholder="$t('samples.enterRefusalReason')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sampleStatusDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSampleStatusSave" :loading="sampleStatusLoading">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 履约内容编辑对话框（新增/编辑视频） -->
    <el-dialog
      v-model="videoEditDialogVisible"
      :title="videoEditForm.videoId ? $t('samples.editVideo') : $t('samples.addVideo')"
      width="450px"
    >
      <el-form :model="videoEditForm" label-width="100px" :rules="videoEditRules" ref="videoEditFormRef">
        <el-form-item :label="$t('samples.videoLink')" prop="videoLink">
          <el-input v-model="videoEditForm.videoLink" :placeholder="$t('samples.enterVideoLink')" />
        </el-form-item>
        <el-form-item :label="$t('samples.streamCode')">
          <el-input v-model="videoEditForm.videoStreamCode" :placeholder="$t('samples.enterStreamCode')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoEditDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleVideoEditSave" :loading="videoEditLoading">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import request from '@/utils/request'

const { t } = useI18n()

const router = useRouter()
import { Upload, Plus, Loading, InfoFilled, Box, TrendCharts, User, Edit, Warning, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import FulfillmentVideoCell from '@/components/FulfillmentVideoCell.vue'
import AuthManager from '@/utils/auth'
import ProductCell from '@/components/ProductCell.vue'
import InfluencerCell from '@/components/InfluencerCell.vue'

const userStore = useUserStore()

// 权限检查
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const importing = ref(false)
const creating = ref(false)
const createDialogVisible = ref(false)
const editingSample = ref(null)  // 正在编辑的样品
const detailDialogVisible = ref(false)
const detailActiveTab = ref('basic')  // 详情弹层当前标签页
// 履约内容（视频）编辑弹层
const videoEditDialogVisible = ref(false)
const videoEditFormRef = ref(null)
const videoEditForm = reactive({
  sampleId: '',
  videoId: null, // null表示新增，字符串表示编辑视频的_id
  videoLink: '',
  videoStreamCode: ''
})
const videoEditLoading = ref(false)

const videoEditRules = {
  videoLink: [{ required: true, message: () => t('samples.videoLinkRequired'), trigger: 'blur' }]
}

// 寄样状态编辑
const sampleStatusDialogVisible = ref(false)
const sampleStatusForm = reactive({
  _id: '',
  sampleStatus: 'pending',
  refusalReason: '',
  logisticsCompany: '',  // 存储 code 值
  trackingNumber: ''
})
const sampleStatusLoading = ref(false)
const logisticsCompanyOptions = ref([])  // 物流公司选项列表

const samples = ref([])
const currentSample = ref(null)
const influencerDetail = ref(null)
const popoverInfluencer = ref(null)
const popoverLoading = ref(false)
const createFormRef = ref(null)
const users = ref([])
const cooperationProducts = ref([])
const bdLoading = ref(false)
const productLoading = ref(false)
const shopList = ref([])  // 店铺列表

const searchForm = reactive({
  dateRange: [],  // 日期区间
  productName: '',
  influencerAccount: '',
  salesman: '',
  sampleStatus: '',
  isOrderGenerated: null,
  productId: '',  // 商品ID搜索
  shopId: ''      // 店铺筛选
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const createForm = reactive({
  date: '',
  productId: '',           // ★ ObjectId (ref Product)
  influencerId: '',         // ★ ObjectId (ref Influencer)
  salesmanId: '',           // ★ ObjectId (ref User)
  shippingInfo: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false
})

// 达人搜索相关（重构后用远程搜索选择器替代手动输入）
const influencerLoading = ref(false)
const influencerOptions = ref([])

// 货币单位列表
const currencyList = ref([])

const loadCurrencies = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'priceUnit', limit: 100 }
    })
    currencyList.value = res.data || []
    // 设置默认货币
    const defaultCurrency = currencyList.value.find(c => c.isDefault)
    if (defaultCurrency) {
      createForm.currency = defaultCurrency.code
    }
  } catch (error) {
    console.error('Load currencies error:', error)
  }
}

// 加载店铺列表
const loadShopList = async () => {
  try {
    const res = await request.get('/shops', { params: { limit: 500 } })
    shopList.value = res.shops || res.data || []
  } catch (error) {
    console.error('Load shops error:', error)
    shopList.value = []
  }
}

const createRules = {
  date: [{ required: true, message: () => t('samples.selectDate'), trigger: 'change' }],
  productId: [{ required: true, message: () => t('samples.selectProduct'), trigger: 'change' }],
  influencerId: [{ required: true, message: () => t('samples.selectInfluencer'), trigger: 'change' }],
  salesmanId: [{ required: true, message: () => t('samples.selectBD'), trigger: 'change' }]
}

const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 获取寄样状态类型
const getSampleStatusType = (status) => {
  const typeMap = {
    pending: 'warning',    // 待审核 - 黄色
    sent: 'success',        // 已寄样（核准）- 绿色
    refused: 'danger'       // 不合作 - 红色
  }
  return typeMap[status] || 'info'
}

// 获取寄样状态文本（使用 computed 确保响应式更新）
const sampleStatusTextMap = computed(() => ({
  pending: t('samples.pending'),
  sent: t('samples.sent'),
  refused: t('samples.refused')
}))

const getSampleStatusText = (status) => {
  return sampleStatusTextMap.value[status] || t('samples.pending')
}

// 获取物流公司显示文本
const getLogisticsCompanyText = (company) => {
  if (company === 'default') {
    return t('videos.defaultLogistics')
  } else if (company === 'other') {
    return t('videos.otherLogistics')
  } else {
    return company || ''
  }
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 获取当天日期
const getTodayDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const truncateText = (text, maxLength) => {
  if (!text) return '--'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 获取样品申请行样式
const getSampleRowClassName = ({ row }) => {
  return row.isBlacklistedInfluencer ? 'blacklist-row' : ''
}

const loadSamples = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      companyId: userStore.companyId,
      ...searchForm
    }
    
    // 处理日期区间
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.dateStart = searchForm.dateRange[0]
      params.dateEnd = searchForm.dateRange[1]
      delete params.dateRange
    } else {
      delete params.dateRange
    }
    
    const res = await request.get('/samples', { params })
    samples.value = res.data?.samples || res.samples || []
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load samples error:', error)
    ElMessage.error(t('samples.loadError'))
  } finally {
    loading.value = false
  }
}

// 加载物流公司列表
const loadLogisticsCompanies = async () => {
  try {
    const res = await request.get('/base-data', { params: { type: 'trackingUrl', limit: 100 } })
    logisticsCompanyOptions.value = res.data || res || []
  } catch (error) {
    console.error('Load logistics companies error:', error)
    logisticsCompanyOptions.value = []
  }
}

// 寄样状态变化时处理物流公司默认值
const handleSampleStatusChange = async () => {
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

const resetSearch = () => {
  Object.assign(searchForm, {
    dateRange: [],
    productName: '',
    influencerAccount: '',
    salesman: '',
    sampleStatus: '',
    isOrderGenerated: null,
    productId: '',
    shopId: ''
  })
  pagination.page = 1
  loadSamples()
}

// 加载用户列表（用于归属BD下拉）
const loadUsers = async () => {
  if (!AuthManager.hasPermission('users:read')) {
    console.log('无users:read权限，跳过加载用户')
    return
  }
  bdLoading.value = true
  try {
    const res = await request.get('/users', { params: { companyId: userStore.companyId, limit: 100 } })
    users.value = res.users || []
  } catch (error) {
    console.error('加载用户失败:', error)
  } finally {
    bdLoading.value = false
  }
}

// 加载产品列表（用于商品下拉）
const loadCooperationProducts = async () => {
  try {
    const res = await request.get('/products', { params: { companyId: userStore.companyId, status: 'active', limit: 100 } })
    cooperationProducts.value = res.data || res.products || []
  } catch (error) {
    console.error('加载产品失败:', error)
  }
}

// 搜索商品
const searchProducts = async (query) => {
  if (!query) {
    loadCooperationProducts()
    return
  }
  productLoading.value = true
  try {
    const res = await request.get('/products', {
      params: {
        companyId: userStore.companyId,
        status: 'active',
        keyword: query,
        limit: 20
      }
    })
    cooperationProducts.value = res.data || res.products || []
  } catch (error) {
    console.error('搜索商品失败:', error)
  } finally {
    productLoading.value = false
  }
}

// 选择商品
const handleProductSelect = (productId) => {
  const product = cooperationProducts.value.find(p => p._id === productId)
  if (product) {
    createForm.productId = product._id  // 存 MongoDB _id 用于后端查询
  }
}

// ★ 搜索达人（重构后：远程搜索选择器）
const searchInfluencers = async (query) => {
  if (!query) {
    influencerOptions.value = []
    return
  }
  influencerLoading.value = true
  try {
    const res = await request.get('/influencer-managements', {
      params: {
        companyId: userStore.companyId,
        keyword: query,
        limit: 20
      }
    })
    influencerOptions.value = res.influencers || []
  } catch (error) {
    console.error('搜索达人失败:', error)
  } finally {
    influencerLoading.value = false
  }
}

// 选择达人
const handleInfluencerSelect = (influencerId) => {
  // 已自动绑定到 createForm.influencerId
}

const showCreateDialog = () => {
  editingSample.value = null  // 重置编辑状态
  // 默认归属BD为当前登录用户（_id）
  const currentUser = userStore.user
  Object.assign(createForm, {
    date: getTodayDate(),
    productId: '',
    influencerId: '',
    salesmanId: currentUser?._id || currentUser?.id || '',
    shippingInfo: '',
    isSampleSent: false,
    trackingNumber: '',
    shippingDate: '',
    logisticsCompany: '',
    isOrderGenerated: false
  })
  createDialogVisible.value = true
  // 加载用户和产品列表
  loadUsers()
  loadCooperationProducts()
}

// 打开编辑对话框
const openEditDialog = async (sample) => {
  editingSample.value = sample
  // 加载用户和产品列表
  loadUsers()
  await loadCooperationProducts()
  
  // ★ 关键修复：根据TikTok商品ID查找对应的Product ObjectId
  let productObjectId = ''
  const sampleProductId = sample.productId
  
  if (sampleProductId) {
    // 情况1：sample.productId 已经是 Product ObjectId 字符串
    if (/^[0-9a-fA-F]{24}$/.test(sampleProductId)) {
      // 检查是否在cooperationProducts中存在
      const productById = cooperationProducts.value.find(p => p._id === sampleProductId)
      if (productById) {
        productObjectId = sampleProductId
      } else {
        // 尝试按tiktokProductId查找
        const productByTikTokId = cooperationProducts.value.find(p => p.tiktokProductId === sampleProductId)
        if (productByTikTokId) {
          productObjectId = productByTikTokId._id
        }
      }
    } else {
      // 情况2：sample.productId 是 TikTok商品ID（如 1731878167000352950）
      const productByTikTokId = cooperationProducts.value.find(p => p.tiktokProductId === sampleProductId)
      if (productByTikTokId) {
        productObjectId = productByTikTokId._id
      } else {
        // 尝试按_id查找（可能是早期数据）
        const productById = cooperationProducts.value.find(p => p._id === sampleProductId)
        if (productById) {
          productObjectId = sampleProductId
        }
      }
    }
  }
  
  // 填充表单数据（重构后：使用ObjectId引用字段）
  Object.assign(createForm, {
    date: sample.date || '',
    productId: productObjectId || sample.productId || '',        // 使用找到的Product ObjectId
    influencerId: sample.influencerId?._id || sample.influencerId || null, // 兼容populate，空值设为null
    salesmanId: sample.salesmanId?._id || sample.salesmanId || null,     // 兼容populate，空值设为null
    shippingInfo: sample.shippingInfo || '',
    isSampleSent: sample.isSampleSent || false,
    trackingNumber: sample.trackingNumber || '',
    shippingDate: sample.shippingDate || '',
    logisticsCompany: sample.logisticsCompany || '',
    isOrderGenerated: sample.isOrderGenerated || false
  })
  
  // ★ 修复：将当前选中的 influencer 添加到 influencerOptions 中，以便选择器正确显示 TikTok ID
  if (sample.influencerId) {
    let influencerObj = null
    if (typeof sample.influencerId === 'object' && sample.influencerId.tiktokId) {
      // 已 populate，直接使用
      influencerObj = {
        _id: sample.influencerId._id,
        tiktokId: sample.influencerId.tiktokId,
        tiktokName: sample.influencerId.tiktokName || ''
      }
    } else if (sample.influencerAccount) {
      // 未 populate，但有 influencerAccount（TikTok ID）
      influencerObj = {
        _id: sample.influencerId, // 可能是字符串 ID
        tiktokId: sample.influencerAccount,
        tiktokName: sample.influencerName || ''
      }
    }
    if (influencerObj) {
      const exists = influencerOptions.value.some(opt => opt._id === influencerObj._id)
      if (!exists) {
        influencerOptions.value = [influencerObj, ...influencerOptions.value]
      }
    }
  }
  
  // 调试日志
  console.log('[Edit Dialog] 样品数据:', {
    sampleId: sample._id,
    sampleProductId: sample.productId,
    productObjectIdFound: productObjectId,
    cooperationProductsCount: cooperationProducts.value.length,
    createFormProductId: createForm.productId
  })
  
  createDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    // 如果是编辑模式，直接提交（只更新样品级别字段）
    if (editingSample.value) {
      creating.value = true
      try {
        // 编辑时只传样品级字段，视频相关字段通过Video API操作
        const updatePayload = {
          date: createForm.date,
          productId: createForm.productId,
          influencerId: createForm.influencerId,
          salesmanId: createForm.salesmanId,
          shippingInfo: createForm.shippingInfo,
          isSampleSent: createForm.isSampleSent,
          trackingNumber: createForm.trackingNumber,
          shippingDate: createForm.shippingDate,
          logisticsCompany: createForm.logisticsCompany,
          isOrderGenerated: createForm.isOrderGenerated
        }
        await request.put(`/samples/${editingSample.value._id}`, updatePayload)
        ElMessage.success(t('samples.saveSuccess'))
        createDialogVisible.value = false
        editingSample.value = null
        resetCreateForm()
        loadSamples()
      } catch (error) {
        console.error('Update sample error:', error)
        ElMessage.error(error.response?.data?.message || t('samples.saveError'))
      } finally {
        creating.value = false
      }
      return
    }

    // ★ 新建模式（重构后：发送 ObjectId 引用）
    // 先检查是否为黑名单达人
    try {
      // 通过influencerId获取黑名单状态
      const selectedInf = influencerOptions.value.find(i => i._id === createForm.influencerId)
      if (selectedInf && selectedInf.isBlacklisted) {
        ElMessage.error(t('samples.blacklistInfluencerWarning'))
        return
      }
      // 也调用API二次确认
      const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${selectedInf?.tiktokId || ''}`, {
        params: { companyId: userStore.companyId }
      })
      if (blacklistRes.isBlacklisted) {
        ElMessage.error(t('samples.blacklistInfluencerWarning'))
        return
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    // 后端会做重复检查，这里仅做前端提示
    creating.value = true
    try {
      // ★ 构造新的请求体（只包含重构后需要的字段）
      const submitPayload = {
        date: createForm.date,
        productId: createForm.productId,       // ObjectId
        influencerId: createForm.influencerId, // ObjectId
        salesmanId: createForm.salesmanId,     // ObjectId
        shippingInfo: createForm.shippingInfo,
        isSampleSent: createForm.isSampleSent,
        trackingNumber: createForm.trackingNumber,
        shippingDate: createForm.shippingDate,
        logisticsCompany: createForm.logisticsCompany,
        isOrderGenerated: createForm.isOrderGenerated
      }

      await request.post('/samples', submitPayload)

      // 维护记录现在由后端自动创建，无需前端手动处理

      ElMessage.success(t('samples.saveSuccess'))
      createDialogVisible.value = false
      resetCreateForm()
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || t('samples.createError'))
    } finally {
      creating.value = false
    }
  })
}

// 重置新建表单
const resetCreateForm = () => {
  Object.assign(createForm, {
    date: '',
    productId: '',
    influencerId: '',
    salesmanId: '',
    shippingInfo: '',
    isSampleSent: false,
    trackingNumber: '',
    shippingDate: '',
    logisticsCompany: '',
    isOrderGenerated: false
  })
}

const viewSampleDetail = async (sample) => {
  currentSample.value = sample
  detailDialogVisible.value = true

  // ★ 重构后：优先从populate数据中取influencer信息，再fallback到API查询
  if (sample.influencerId && typeof sample.influencerId === 'object' && sample.influencerId._id) {
    // 已populate，直接使用
    influencerDetail.value = sample.influencerId
  } else if (sample.influencerId && typeof sample.influencerId === 'string') {
    // 有ID但未populate，按ID查
    try {
      const res = await request.get(`/influencer-managements/${sample.influencerId}`)
      influencerDetail.value = res.influencer || res.data || null
    } catch (error) {
      console.error('获取达人信息失败:', error)
      influencerDetail.value = null
    }
  } else if (sample.influencerAccount) {
    // 兼容旧字段：通过tiktokId搜索
    try {
      const res = await request.get('/influencer-managements', {
        params: { companyId: userStore.companyId, keyword: sample.influencerAccount, limit: 1 }
      })
      const influencers = res.influencers || []
      const matched = influencers.find(i => i.tiktokId === sample.influencerAccount)
      influencerDetail.value = matched || null
    } catch (error) {
      console.error('获取达人信息失败:', error)
      influencerDetail.value = null
    }
  } else {
    influencerDetail.value = null
  }
}

// 加载悬停弹层中的达人信息
const loadInfluencerPopover = async (row) => {
  popoverInfluencer.value = null
  if (!row.influencerAccount) return
  
  popoverLoading.value = true
  try {
    const res = await request.get('/influencer-managements', {
      params: {
        companyId: userStore.companyId,
        keyword: row.influencerAccount,
        limit: 10
      }
    })
    console.log('达人搜索结果:', res)
    const influencers = res.influencers || res.data || []
    const matched = influencers.find(i => i.tiktokId === row.influencerAccount)
    popoverInfluencer.value = matched || null
  } catch (error) {
    console.error('获取达人信息失败:', error)
    popoverInfluencer.value = null
  } finally {
    popoverLoading.value = false
  }
}

const viewDetail = (sample) => {
  viewSampleDetail(sample)
}

// 打开视频编辑弹窗（编辑已有视频）
const openVideoEditDialog = (sample, video, index) => {
  Object.assign(videoEditForm, {
    sampleId: sample._id,
    videoId: video._id || null,
    videoLink: video.videoLink || '',
    videoStreamCode: video.videoStreamCode || ''
  })
  videoEditDialogVisible.value = true
}

// 打开视频新增弹窗
const openVideoAddDialog = (sample) => {
  Object.assign(videoEditForm, {
    sampleId: sample._id,
    videoId: null,
    videoLink: '',
    videoStreamCode: ''
  })
  videoEditDialogVisible.value = true
}

// ★ 保存视频信息（新增或编辑）
const handleVideoEditSave = async () => {
  if (!videoEditFormRef.value) return

  await videoEditFormRef.value.validate(async (valid) => {
    if (!valid) return

    videoEditLoading.value = true
    try {
      const payload = {
        videoLink: videoEditForm.videoLink,
        videoStreamCode: videoEditForm.videoStreamCode || ''
      }

      if (videoEditForm.videoId) {
        // 编辑模式 - 更新指定视频
        await request.put(`/videos/${videoEditForm.videoId}`, payload)
      } else {
        // 新增模式 - 添加新视频
        await request.post(`/samples/${videoEditForm.sampleId}/videos`, payload)
      }

      ElMessage.success(t('samples.saveSuccess'))
      videoEditDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Save video error:', error)
      ElMessage.error(error.response?.data?.message || t('samples.saveError'))
    } finally {
      videoEditLoading.value = false
    }
  })
}

// ★ 删除视频
const handleDeleteVideo = async (sample, video, index) => {
  try {
    await ElMessageBox.confirm(t('samples.confirmDeleteVideo'), t('common.warning'), {
      type: 'warning'
    })
    await request.delete(`/videos/${video._id}`)
    ElMessage.success(t('samples.deleteVideoSuccess'))
    loadSamples()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete video error:', error)
      ElMessage.error(t('samples.deleteVideoError'))
    }
  }
}

// 打开寄样状态编辑弹窗
const openSampleStatusDialog = async (sample) => {
  // 加载物流公司列表
  await loadLogisticsCompanies()
  // 设置默认值：如果是新建或没有选择物流公司，选中 default
  let defaultLogistics = sample.logisticsCompany || ''
  if (!defaultLogistics && logisticsCompanyOptions.value.length > 0) {
    const defaultOption = logisticsCompanyOptions.value.find(opt => opt.code === 'default')
    if (defaultOption) {
      defaultLogistics = 'default'
    }
  }
  Object.assign(sampleStatusForm, {
    _id: sample._id,
    sampleStatus: sample.sampleStatus || 'pending',
    refusalReason: sample.refusalReason || '',
    logisticsCompany: defaultLogistics,
    trackingNumber: sample.trackingNumber || ''
  })
  sampleStatusDialogVisible.value = true
}

// 保存寄样状态
const handleSampleStatusSave = async () => {
  sampleStatusLoading.value = true
  try {
    const payload = {
      sampleStatus: sampleStatusForm.sampleStatus,
      refusalReason: sampleStatusForm.sampleStatus === 'refused' ? sampleStatusForm.refusalReason : ''
    }
    // 已寄样时发送物流信息（快递单号非必填）
    if (sampleStatusForm.sampleStatus === 'sent') {
      if (sampleStatusForm.logisticsCompany) {
        payload.logisticsCompany = sampleStatusForm.logisticsCompany
      }
      if (sampleStatusForm.trackingNumber) {
        payload.trackingNumber = sampleStatusForm.trackingNumber
      }
    }
    await request.put(`/samples/${sampleStatusForm._id}`, payload)
    ElMessage.success(t('samples.saveSuccess'))
    sampleStatusDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save sample status error:', error)
    ElMessage.error(t('samples.saveError'))
  } finally {
    sampleStatusLoading.value = false
  }
}

// 跳转到TikTok订单页面
const goToOrders = async (sample) => {
  if (!sample.isOrderGenerated) return
  
  // 跳转到订单页面并传递查询参数
  router.push({
    path: '/report-orders',
    query: {
      influencerAccount: sample.influencerAccount,
      productId: sample.productId
    }
  })
}

// 复制视频链接到剪贴板
const copyVideoLink = async (videoLink) => {
  if (!videoLink) {
    ElMessage.warning(t('samples.noVideoLinkToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(videoLink)
    ElMessage.success(t('samples.copySuccess'))
  } catch (error) {
    console.error('Copy video link error:', error)
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = videoLink
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(t('samples.copySuccess'))
    } catch (e) {
      ElMessage.error(t('samples.copyFailed'))
    }
    document.body.removeChild(textarea)
  }
}

// 复制投流码到剪贴板
const copyStreamCode = async (streamCode) => {
  if (!streamCode) {
    ElMessage.warning(t('samples.noStreamCodeToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(streamCode)
    ElMessage.success(t('samples.copyStreamCodeSuccess'))
  } catch (error) {
    console.error('Copy stream code error:', error)
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = streamCode
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      ElMessage.success(t('samples.copyStreamCodeSuccess'))
    } catch (e) {
      ElMessage.error(t('samples.copyStreamCodeFailed'))
    }
    document.body.removeChild(textarea)
  }
}

const deleteSample = async (sample) => {
  await ElMessageBox.confirm(t('samples.confirmDelete'), t('common.warning'), {
    type: 'warning'
  })

  try {
    await request.delete(`/samples/${sample._id}`)
    ElMessage.success(t('samples.deleteSuccess'))
    loadSamples()
  } catch (error) {
    console.error('Delete sample error:', error)
    ElMessage.error(t('samples.deleteError'))
  }
}

const handleImportFile = async (file) => {
  importing.value = true
  ElMessage.info(t('samples.importing'))
  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const res = await request.post('/samples/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success(res.message || t('samples.importSuccess'))

    if (res.data) {
      const summary = `${t('samples.added')}: ${res.data.added}\n${t('samples.updated')}: ${res.data.updated}`

      if (res.data.errors && res.data.errors.length > 0) {
        const errorDetails = res.data.errors.map(e => `Row ${e.row}: ${e.error}`).join('\n')
        ElMessageBox.alert(
          `${summary}\n${t('samples.failed')}: ${res.data.failed}\n\nError Details:\n${errorDetails}`,
          t('samples.importResult'),
          { type: 'warning' }
        )
      } else {
        ElMessage.success(summary)
      }
    }

    loadSamples()
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error(t('samples.importError'))
  } finally {
    importing.value = false
  }
}

const openSubmissionDetail = (submission) => {
  // 找到对应的完整sample记录
  const sample = sampleList.value.find(s => s._id === submission.sampleId)
  if (sample) {
    viewSampleDetail(sample)
  } else {
    // 如果找不到，尝试通过ID获取
    ElMessage.info(t('videos.loadingDetail'))
    // 这里可以添加通过ID获取sample详情的逻辑
  }
}



onMounted(() => {
  loadSamples()
  loadCurrencies()
  loadShopList()
})
</script>

<style scoped>
.sample-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

/* 表格样式优化 - 与建联达人相同 */
.sample-table {
  border-radius: 8px;
  overflow: hidden;
}

.sample-table :deep(.el-table__header-wrapper) {
  background: #f5f7fa;
}

.sample-table :deep(.el-table__header th) {
  background: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid #ebeef5;
}

.sample-table :deep(.el-table__body tr:hover > td) {
  background: #f5f7fa !important;
}

.tiktok-id-text {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-id-cell {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-id-cell.clickable {
  cursor: pointer;
}

.tiktok-id-cell.clickable:hover {
  text-decoration: underline;
}

.tiktok-id-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiktok-label :deep(.el-form-item__label) {
  color: #6DAD19;
  font-weight: 500;
}

.column-text {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-id {
  font-size: 11px;
  color: #9e9e9e;
  font-weight: 500;
}

.product-name {
  color: #595959;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.product-name:hover {
  color: #7b1fa2;
}

.influencer-data {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.follower-count {
  font-weight: 600;
  color: #6a1b9a;
  font-size: 13px;
}

.shipping-info,
.fulfillment-info,
.promotion-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.truncate-text {
  font-size: 12px;
  color: #757575;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.refusal-reason {
  font-size: 10px;
  color: #f56c6c;
  word-break: break-all;
}

.tracking-no {
  font-size: 11px;
  color: #757575;
}

.shipping-date {
  font-size: 11px;
  color: #9e9e9e;
}

.fulfillment-time {
  font-size: 12px;
  color: #757575;
}

:deep(.video-item) {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: visible !important;
  margin-bottom: 4px !important;
  min-height: 28px;
  width: 100%;
}

:deep(.video-info) {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  flex-shrink: 0;
  gap: 4px;
}

:deep(.switch-wrap) {
  display: inline-flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  flex-shrink: 0;
  margin-left: 8px;
  vertical-align: middle;
}

.video-link-inline {
  color: #409eff;
  text-decoration: none;
  white-space: nowrap;
}

.video-link-inline:hover {
  text-decoration: underline;
}

.stream-code-inline {
  color: #909399;
  white-space: nowrap;
}

.empty-text {
  color: #909399;
  white-space: nowrap;
}

.add-video-row {
  display: flex;
  align-items: center;
  margin-top: 4px;
  min-height: 28px;
}

.add-icon {
  cursor: pointer;
  color: #67c23a;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  border: 1px dashed #c2e7b0;
}

.add-icon:hover {
  background-color: #f0f9eb;
  color: #85ce61;
}

.update-info {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

.update-info-detail {
  font-size: 12px;
  color: #909399;
}

.edit-icon {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.edit-icon:hover {
  background-color: #ecf5ff;
  color: #66b1ff;
}

.delete-icon {
  cursor: pointer;
  color: #f56c6c;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
}

.delete-icon:hover {
  background-color: #fef0f0;
  color: #f78989;
}

.fulfillment-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clickable-link {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clickable-link:hover {
  text-decoration: none;
}

.clickable-link.has-orders .el-tag {
  text-decoration: underline;
}

.order-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #f56c6c;
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
}

.promotion-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.el-button + .el-button {
  margin-left: 8px;
}

/* 对话框样式 */
.el-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #9c4dcc 0%, #ba68c8 100%);
  padding: 16px 20px;
}

.el-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

.el-form-item :deep(.el-form-item__label) {
  color: #595959;
  font-weight: 500;
}

/* TikTok绿色样式 */
.tiktok-green-label :deep(.el-form-item__label) {
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

/* 修复 input-number 宽度溢出 */
.el-input-number {
  width: 100%;
}

.el-input-number :deep(.el-input__wrapper) {
  width: 100%;
  min-width: unset;
}

/* 黑名单行样式 */
.blacklist-row {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.blacklist-row td {
  background-color: #f5f5f5 !important;
  color: #666;
}

/* 达人详情区域 */
.influencer-detail {
  margin-top: 10px;
}

/* 悬停弹层加载状态 */
.popover-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #909399;
}

.popover-loading .is-loading {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.popover-empty {
  padding: 20px;
  text-align: center;
  color: #909399;
}

/* 详情对话框样式 */
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

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片样式 */
.info-card {
  border: 1px solid #e8ebf0;
  border-radius: 12px;
  overflow: hidden;
}

.info-card :deep(.el-card__header) {
  padding: 14px 20px;
  background: linear-gradient(135deg, #f8f9fc 0%, #eef1f6 100%);
  border-bottom: 1px solid #e8ebf0;
}

.info-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.card-header .el-icon {
  font-size: 18px;
  color: #4a5568;
}

/* 信息项样式 */
.info-item {
  margin-bottom: 8px;
}

.info-label {
  font-size: 12px;
  color: #8c92a4;
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
}

.highlight-value {
  color: #6DAD19;
  font-size: 16px;
  font-weight: 600;
}

.product-name {
  color: #5a67d8;
  font-weight: 600;
}

.shipping-value {
  color: #4a5568;
}

.stream-label {
  color: #8c92a4;
}

.stream-value {
  color: #4a5568;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #edf2f7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* 底部时间信息 */
.bottom-info {
  text-align: right;
  padding-top: 12px;
  border-top: 1px solid #e8ebf0;
  color: #a0aec0;
  font-size: 12px;
}

/* 详情对话框黑名单样式 */
.detail-dialog-blacklist {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.detail-dialog-blacklist :deep(.el-dialog__body) {
  background-color: #f5f5f5;
}

.detail-content-blacklist {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #333;
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

.salesman-text {
  margin-left: 8px;
  color: #666;
  font-size: 12px;
  vertical-align: middle;
}

.submission-item:hover {
  background-color: #f5f7fa;
}

/* 物流公司名称缩小字体 */
.logistics-company-small {
  font-size: 12px;
  color: #666;
}

/* 履约视频列样式 */
.fulfillment-video-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.icon {
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.icon:hover {
  opacity: 0.8;
}

.icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.copy-icon {
  color: #4D4D4D;
}

.copy-icon:hover {
  color: #409eff;
}

.fire-icon {
  flex-shrink: 0;
}

.fire-icon.heated {
  /* 加热状态 - 橙色火焰 */
}

.fire-icon.unheated {
  /* 待加热状态 - 灰色火焰 */
}

.stream-code-text {
  font-size: 12px;
  color: #67c23a;
  cursor: pointer;
  margin-left: 4px;
  white-space: nowrap;
}

.stream-code-text:hover {
  color: #85ce61;
}

.stream-code-text.empty {
  color: #909399;
  cursor: default;
}

.video-link-text {
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.video-link-text:hover {
  text-decoration: underline;
}

.video-link-empty {
  color: #909399;
  font-size: 13px;
}

.add-video-row {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 0;
  margin-top: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.add-video-row:hover {
  background-color: #f5f7fa;
}

.add-video-icon {
  flex-shrink: 0;
}

.add-video-text {
  font-size: 12px;
  color: #8a8a8a;
}

.add-video-row:hover .add-video-text {
  color: #409eff;
}
</style>
