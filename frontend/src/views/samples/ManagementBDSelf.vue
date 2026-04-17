<template>
  <div class="sample-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog" v-if="hasPermission('samplesBd:create')">
              <el-icon><Plus /></el-icon>
              {{ $t('sampleBD.addNew') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('sampleBD.tiktokId')">
          <el-input
            v-model="searchForm.influencerAccount"
            :placeholder="$t('sampleBD.tiktokIdPlaceholder')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('sampleBD.productName')">
          <el-input
            v-model="searchForm.productName"
            :placeholder="$t('sampleBD.productNamePlaceholder')"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item :label="$t('sampleBD.applyDate')">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            :placeholder="$t('sampleBD.selectDate')"
            clearable
            style="width: 150px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSamples">{{ $t('sampleBD.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('sampleBD.reset') }}</el-button>
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
          :label="$t('sampleBD.tiktokIdCol')"
          width="160"
          fixed="left"
          prop="influencerAccount"
          sortable
        >
          <template #default="{ row }">
            <el-popover
              placement="right"
              :width="300"
              trigger="hover"
              @show="loadInfluencerPopover(row)"
            >
              <template #reference>
                <div class="tiktok-id-wrapper">
                  <span class="tiktok-id-cell clickable" @click="viewSampleDetail(row)">
                    {{ row.influencerAccount || '--' }}
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
                          <h4>{{ $t('sampleBD.historyRecords', { count: row.duplicateCount }) }}</h4>
                        </div>
                        <div class="popover-content">
                          <!-- 商品和达人信息只展示一次 -->
                          <div class="summary-info" v-if="row.previousSubmissions && row.previousSubmissions.length > 0">
                            <div class="summary-item">
                              <span class="summary-label">{{ $t('sampleBD.productNameDetail') }}</span>
                              <span class="summary-value">{{ row.previousSubmissions[0].productName || '-' }}</span>
                            </div>
                            <div class="summary-item">
                              <span class="summary-label">{{ $t('sampleBD.tiktokIdDetail') }}</span>
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
                                  <span class="cell-label">{{ $t('sampleBD.applyDateDetail') }}</span>
                                  <span class="cell-value">{{ formatDate(sub.date) }}</span>
                                </div>
                                <div class="submission-cell">
                                  <span class="cell-label">{{ $t('sampleBD.approvalStatus') }}</span>
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
                  </span>
                  <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">{{ $t('sampleBD.blacklist') }}</el-tag>
                </div>
              </template>
              <div v-if="popoverLoading" class="popover-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>{{ $t('sampleBD.loading') }}</span>
              </div>
              <div v-else-if="popoverInfluencer" class="influencer-popover">
                <el-descriptions :column="1" size="small">
                  <el-descriptions-item :label="$t('sampleBD.tiktokIdDetail')">
                    <span class="tiktok-id-text">{{ popoverInfluencer.tiktokId }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item :label="$t('sampleBD.tiktokName')">{{ popoverInfluencer.tiktokName || '-' }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('sampleBD.latestFollowers')">{{ formatNumber(popoverInfluencer.latestFollowers) }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('sampleBD.latestGmv')">{{ popoverInfluencer.latestGmv || '-' }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('sampleBD.status')">
                    <el-tag :type="popoverInfluencer.status === 'enabled' ? 'success' : 'info'" size="small">
                      {{ popoverInfluencer.status === 'enabled' ? $t('sampleBD.enabled') : $t('sampleBD.disabled') }}
                    </el-tag>
                    <el-tag v-if="popoverInfluencer.isBlacklisted" type="danger" size="small" style="margin-left: 4px">{{ $t('sampleBD.blacklist') }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else class="popover-empty">
                <span>{{ $t('sampleBD.influencerNotFound') }}</span>
              </div>
            </el-popover>
          </template>
        </el-table-column>

        <!-- 寄样状态 - 锁定左边 -->
        <el-table-column
          :label="$t('sampleBD.shippingStatus')"
          width="160"
          fixed="left"
        >
          <template #default="{ row }">
            <div class="sample-status">
              <el-tag :type="getSampleStatusType(row.sampleStatus)" size="small">
                {{ getSampleStatusText(row.sampleStatus) }}
              </el-tag>
              <!-- 已寄样时显示物流信息 -->
              <div v-if="row.sampleStatus === 'sent'" class="sent-info">
                <span v-if="row.logisticsCompany">
                  {{ getLogisticsCompanyText(row.logisticsCompany) }}
                </span>
                <span v-if="row.logisticsCompany && row.trackingNumber"> - </span>
                <span v-if="row.trackingNumber" class="tracking-no">{{ row.trackingNumber }}</span>
              </div>
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                {{ $t('sampleBD.refusalReasonDetail') }}: {{ row.refusalReason }}
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ formatDate(row.shippingDate) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 履约情况 -->
        <el-table-column
          :label="$t('sampleBD.fulfillment')"
          width="240"
        >
          <template #default="{ row }">
            <div class="fulfillment-info">
              <div class="fulfillment-row">
                <span
                  class="clickable-link"
                  :class="{ 'has-orders': row.orderCount > 0 }"
                  @click="goToOrders(row)"
                >
                  <el-tag
                    :type="row.isOrderGenerated ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ row.isOrderGenerated ? $t('sampleBD.orderGenerated') : $t('sampleBD.noOrder') }}
                  </el-tag>
                  <span v-if="row.isOrderGenerated && row.orderCount" class="order-count-badge">
                    {{ row.orderCount > 99 ? '...' : row.orderCount }}
                  </span>
                </span>
                <el-icon class="edit-icon" @click.stop="openFulfillmentDialog(row)"><Edit /></el-icon>
              </div>
              <div v-if="row.fulfillmentUpdatedAt" class="update-info">
                {{ row.fulfillmentUpdatedBy?.realName || row.fulfillmentUpdatedBy?.username || '-' }} {{ formatDateTime(row.fulfillmentUpdatedAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 投流信息 - 带编辑功能 -->
        <el-table-column
          :label="$t('sampleBD.adPromotion')"
          width="240"
        >
          <template #default="{ row }">
            <div class="promotion-info">
              <div class="video-list" v-if="row.videos && row.videos.length > 0">
                <div v-for="(video, idx) in row.videos" :key="idx" class="video-item">
                  <div v-if="video.videoLink" class="video-link">
                    <el-link :href="video.videoLink" target="_blank" type="primary">
                      {{ $t('sampleBD.videoLink') }}
                    </el-link>
                    <span v-if="video.videoStreamCode" class="stream-code">「{{ video.videoStreamCode }}」</span>
                    <el-tag :type="video.isAdPromotion ? 'success' : 'info'" size="small">
                      {{ video.isAdPromotion ? $t('sampleBD.adPromoted') : $t('sampleBD.noAdPromoted') }}
                    </el-tag>
                  </div>
                  <div v-else-if="video.videoStreamCode" class="stream-only">
                    {{ video.videoStreamCode }}
                  </div>
                  <div v-else>
                    --
                  </div>
                </div>
              </div>
              <div v-else class="stream-code">
                {{ row.videoStreamCode || '--' }}
                <el-icon class="edit-icon" @click.stop="openAdPromotionDialog(row)"><Edit /></el-icon>
              </div>
              <div class="promotion-status">
                <el-tag :type="row.isAdPromotion ? 'success' : 'info'" size="small">
                  {{ row.isAdPromotion ? $t('sampleBD.adPromoted') : $t('sampleBD.noAdPromoted') }}
                </el-tag>
                <span v-if="row.adPromotionTime">{{ formatDate(row.adPromotionTime) }}</span>
              </div>
              <div v-if="row.adPromotionUpdatedAt" class="update-info">
                {{ row.adPromotionUpdatedBy?.realName || row.adPromotionUpdatedBy?.username || '-' }} {{ formatDateTime(row.adPromotionUpdatedAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 申请日期 - 不再锁定 -->
        <el-table-column
          :label="$t('sampleBD.applicationDate')"
          width="120"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.date ? formatDate(row.date) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.productInfo')"
          width="300"
          prop="productName"
          sortable
        >
          <template #default="{ row }">
            <div class="product-info">
              <div class="product-id">{{ row.productId_display || row.productId || '--' }}</div>
              <el-tooltip :content="row.productName" placement="top">
                <div class="product-name">
                  {{ truncateText(row.productName, 60) }}
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.influencerData')"
          width="120"
        >
          <template #default="{ row }">
            <div class="influencer-data">
              <el-tag type="info" size="small">{{ $t('sampleBD.followers') }}</el-tag>
              <span class="follower-count">{{ formatNumber(row.followerCount) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.addressInfo')"
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
          :label="$t('sampleBD.receiveDate')"
          width="120"
          prop="receivedDate"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.receivedDate ? formatDate(row.receivedDate) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('sampleBD.operation')"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">{{ $t('sampleBD.detail') }}</el-button>
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
      :title="currentSample?.isBlacklistedInfluencer ? $t('sampleBD.influencerBlacklisted') : $t('sampleBD.sampleDetail')"
      width="900px"
      class="business-detail-dialog"
    >
      <div v-if="currentSample" class="detail-content">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentSample.isBlacklistedInfluencer"
          :title="$t('sampleBD.blacklistWarning')"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 24px"
        />

        <!-- 标签页导航 -->
        <el-tabs v-model="detailActiveTab" class="business-tabs">
          <!-- 基础信息标签页 -->
          <el-tab-pane :label="$t('sampleBD.basicInfo')" name="basic">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.tiktokIdDetail') }}</span>
                  <span class="cell-value tiktok-id-text">{{ currentSample.influencerAccount || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.applyDateDetail') }}</span>
                  <span class="cell-value">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.productNameDetail') }}</span>
                  <span class="cell-value product-name">{{ currentSample.productName || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.productIdDetail') }}</span>
                  <span class="cell-value">{{ currentSample.productId || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.sampleImage') }}</span>
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
                <h4 class="section-title">{{ $t('sampleBD.influencerStats') }}</h4>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('sampleBD.followerCount') }}</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.followerCount) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">{{ $t('sampleBD.gmv') }}</span>
                    <span class="stat-value">{{ currentSample.gmv || '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 收货地址 -->
              <div class="shipping-section">
                <h4 class="section-title">{{ $t('sampleBD.shippingInfoDetail') }}</h4>
                <div class="shipping-info">
                  <span class="shipping-value">{{ currentSample.shippingInfo || '-' }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 寄样状态标签页 -->
          <el-tab-pane :label="$t('sampleBD.shippingInfo')" name="shipping">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.shippingStatusDetail') }}</span>
                  <span class="cell-value">
                    <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="large">
                      {{ getSampleStatusText(currentSample.sampleStatus) }}
                    </el-tag>
                  </span>
                </div>
              </div>
              
              <!-- 拒绝时的原因 -->
              <div class="refusal-section" v-if="currentSample.sampleStatus === 'refused' && currentSample.refusalReason">
                <h4 class="section-title">{{ $t('sampleBD.refusalReasonTitle') }}</h4>
                <div class="refusal-reason">
                  {{ currentSample.refusalReason }}
                </div>
              </div>
              
              <!-- 已寄样时的物流信息 -->
              <div class="shipping-details" v-if="currentSample.sampleStatus === 'sent'">
                <h4 class="section-title">{{ $t('sampleBD.logisticsInfo') }}</h4>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('sampleBD.shippingDateDetail') }}</span>
                    <span class="detail-value">{{ currentSample.shippingDate ? formatDate(currentSample.shippingDate) : '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('sampleBD.logisticsCompany') }}</span>
                    <span class="detail-value">{{ currentSample.logisticsCompany || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('sampleBD.trackingNumberDetail') }}</span>
                    <span class="detail-value">{{ currentSample.trackingNumber || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('sampleBD.receivedDateDetail') }}</span>
                    <span class="detail-value">{{ currentSample.receivedDate ? formatDate(currentSample.receivedDate) : '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 状态更新信息 -->
              <div class="update-info-section" v-if="currentSample.sampleStatusUpdatedAt">
                <div class="update-item">
                  <span class="update-label">{{ $t('sampleBD.statusUpdateTime') }}</span>
                  <span class="update-value">
                    {{ currentSample.sampleStatusUpdatedBy?.realName || currentSample.sampleStatusUpdatedBy?.username || '-' }}
                    <span>{{ formatDateTime(currentSample.sampleStatusUpdatedAt) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 履约信息标签页 -->
          <el-tab-pane :label="$t('sampleBD.fulfillmentInfo')" name="fulfillment">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.orderGeneratedDetail') }}</span>
                  <span class="cell-value">
                    <el-tag :type="currentSample.isOrderGenerated ? 'success' : 'warning'" size="large">
                      {{ currentSample.isOrderGenerated ? $t('sampleBD.orderGenerated') : $t('sampleBD.noOrder') }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('sampleBD.fulfillmentTime') }}</span>
                  <span class="cell-value">{{ currentSample.fulfillmentTime || '-' }}</span>
                </div>
              </div>
              
              <!-- 视频链接 -->
              <div class="video-section" v-if="currentSample.videoLink">
                <h4 class="section-title">{{ $t('sampleBD.videoLinkDetail') }}</h4>
                <div class="video-info">
                  <el-link :href="currentSample.videoLink" target="_blank" type="primary">
                    {{ $t('sampleBD.viewVideo') }}
                  </el-link>
                </div>
              </div>
              
              <!-- 投流信息 -->
              <div class="ad-promotion-section">
                <h4 class="section-title">{{ $t('sampleBD.adPromotionDetail') }}</h4>
                <div class="ad-grid">
                  <div class="ad-item">
                    <span class="ad-label">{{ $t('sampleBD.adStatusDetail') }}</span>
                    <span class="ad-value">
                      <el-tag :type="currentSample.isAdPromotion ? 'success' : 'info'" size="large">
                        {{ currentSample.isAdPromotion ? $t('sampleBD.adPromoted') : $t('sampleBD.noAdPromoted') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="ad-item">
                    <span class="ad-label">{{ $t('sampleBD.adTimeDetail') }}</span>
                    <span class="ad-value">{{ currentSample.adPromotionTime ? formatDate(currentSample.adPromotionTime) : '-' }}</span>
                  </div>
                  <div class="ad-item wide">
                    <span class="ad-label">{{ $t('sampleBD.streamCodeDetail') }}</span>
                    <span class="ad-value">{{ currentSample.videoStreamCode || '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 更新信息 -->
              <div class="update-info-section">
                <div class="update-item" v-if="currentSample.fulfillmentUpdatedAt">
                  <span class="update-label">{{ $t('sampleBD.orderInfoUpdate') }}</span>
                  <span class="update-value">
                    {{ currentSample.fulfillmentUpdatedBy?.realName || currentSample.fulfillmentUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.fulfillmentUpdatedAt">{{ formatDateTime(currentSample.fulfillmentUpdatedAt) }}</span>
                  </span>
                </div>
                <div class="update-item" v-if="currentSample.adPromotionUpdatedAt">
                  <span class="update-label">{{ $t('sampleBD.adInfoUpdate') }}</span>
                  <span class="update-value">
                    {{ currentSample.adPromotionUpdatedBy?.realName || currentSample.adPromotionUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.adPromotionUpdatedAt">{{ formatDateTime(currentSample.adPromotionUpdatedAt) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 达人信息标签页 -->
          <el-tab-pane :label="$t('sampleBD.influencerInfo')" name="influencer">
            <div v-if="influencerDetail">
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('sampleBD.tiktokIdDetail') }}</span>
                    <span class="cell-value tiktok-id-text">{{ influencerDetail.tiktokId }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('sampleBD.tiktokName') }}</span>
                    <span class="cell-value">{{ influencerDetail.tiktokName || '-' }}</span>
                  </div>
                </div>
                
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('sampleBD.realName') }}</span>
                    <span class="cell-value">{{ influencerDetail.realName || '-' }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">{{ $t('sampleBD.nickname') }}</span>
                    <span class="cell-value">{{ influencerDetail.nickname || '-' }}</span>
                  </div>
                </div>
                
                <!-- 达人统计数据 -->
                <div class="influencer-stats">
                  <h4 class="section-title">{{ $t('sampleBD.influencerStatsData') }}</h4>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">{{ $t('sampleBD.latestFollowers') }}</span>
                      <span class="stat-value highlight-value">{{ formatNumber(influencerDetail.latestFollowers) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">{{ $t('sampleBD.latestGmv') }}</span>
                      <span class="stat-value">{{ influencerDetail.latestGmv || '-' }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 达人状态 -->
                <div class="status-section">
                  <div class="status-item">
                    <span class="status-label">{{ $t('sampleBD.influencerStatus') }}</span>
                    <span class="status-value">
                      <el-tag :type="influencerDetail.status === 'enabled' ? 'success' : 'info'" size="large">
                        {{ influencerDetail.status === 'enabled' ? $t('sampleBD.enabled') : $t('sampleBD.disabled') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">{{ $t('sampleBD.blacklistStatus') }}</span>
                    <span class="status-value">
                      <el-tag v-if="influencerDetail.isBlacklisted" type="danger" size="large">{{ $t('sampleBD.blacklist') }}</el-tag>
                      <span v-else>{{ $t('sampleBD.normal') }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else :description="$t('sampleBD.influencerNotFound')" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
        
        <!-- 创建时间信息 -->
        <div class="created-info">
          <span class="created-label">{{ $t('sampleBD.createTime') }}</span>
          <span class="created-value">{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="$t('sampleBD.addNewTitle')"
      width="700px"
    >
      <el-form
        :model="createForm"
        :rules="createRules"
        ref="createFormRef"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('sampleBD.applyDateField')" prop="date">
              <el-date-picker
                v-model="createForm.date"
                type="date"
                :placeholder="$t('sampleBD.selectDate')"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('sampleBD.productInfoField')" required>
          <el-select
            v-model="createForm.productId"
            filterable
            remote
            :placeholder="$t('sampleBD.selectProductPlaceholder')"
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

        <el-form-item :label="$t('sampleBD.tiktokIdField')" prop="influencerId" class="tiktok-label">
          <el-select
            v-model="createForm.influencerId"
            filterable
            remote
            :placeholder="$t('sampleBD.tiktokIdPlaceholder')"
            :remote-method="searchInfluencers"
            :loading="influencerLoading"
            style="width: 100%"
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

        <!-- 移除了粉丝数/GMV/月销量/均播等冗余字段，数据从达人表populate自动获取 -->

        <el-form-item :label="$t('sampleBD.addressInfoField')" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            :placeholder="$t('sampleBD.addressPlaceholder')"
          />
        </el-form-item>

        <!-- 移除了样品图片字段，现在从Product表populate自动获取 -->
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">{{ $t('sampleBD.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 投流信息编辑对话框 -->
    <el-dialog
      v-model="adPromotionDialogVisible"
      :title="$t('sampleBD.adPromotionTitle')"
      width="400px"
    >
      <el-form :model="adPromotionForm" label-width="80px">
        <el-form-item :label="$t('sampleBD.streamCodeField')">
          <el-input v-model="adPromotionForm.videoStreamCode" :placeholder="$t('sampleBD.streamCodePlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adPromotionDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleAdPromotionSave" :loading="adPromotionLoading">{{ $t('sampleBD.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 履约信息编辑对话框 -->
    <el-dialog
      v-model="fulfillmentDialogVisible"
      :title="$t('sampleBD.fulfillmentTitle')"
      width="400px"
    >
      <el-form :model="fulfillmentForm" label-width="80px">
        <el-form-item :label="$t('sampleBD.videoAddress')">
          <el-input v-model="fulfillmentForm.videoLink" :placeholder="$t('sampleBD.videoLinkPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fulfillmentDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleFulfillmentSave" :loading="fulfillmentLoading">{{ $t('sampleBD.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
import request from '@/utils/request'
import { Plus, Loading, InfoFilled, Box, TrendCharts, User, Edit } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

const userStore = useUserStore()

// 权限检查
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const loading = ref(false)
const creating = ref(false)
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailActiveTab = ref('basic')  // 详情弹层当前标签页
const adPromotionDialogVisible = ref(false)
const adPromotionForm = reactive({
  _id: '',
  videoStreamCode: ''
})
const adPromotionLoading = ref(false)

// 履约信息编辑
const fulfillmentDialogVisible = ref(false)
const fulfillmentForm = reactive({
  _id: '',
  videoLink: ''
})
const fulfillmentLoading = ref(false)

const samples = ref([])
const currentSample = ref(null)
const influencerDetail = ref(null)
const popoverInfluencer = ref(null)
const popoverLoading = ref(false)
const createFormRef = ref(null)
const cooperationProducts = ref([])
const productLoading = ref(false)

const searchForm = reactive({
  date: '',
  productName: '',
  influencerAccount: '',
  isSampleSent: null,
  isOrderGenerated: null
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
  shippingInfo: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false,
  currency: ''              // 货币单位
})

// 达人搜索相关（重构后用远程搜索选择器替代手动输入）
const influencerLoading = ref(false)
const influencerOptions = ref([])
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

const createRules = {
  date: [{ required: true, message: t('common.select') + t('sampleBD.applyDate'), trigger: 'change' }],
  productId: [{ required: true, message: t('sampleBD.selectProductPlaceholder'), trigger: 'change' }],
  influencerId: [{ required: true, message: t('sampleBD.selectInfluencer'), trigger: 'change' }]
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

const getSampleRowClassName = ({ row }) => {
  return row.isBlacklistedInfluencer ? 'blacklist-row' : ''
}

// 获取寄样状态类型
const getSampleStatusType = (status) => {
  const typeMap = {
    pending: 'warning',    // 待审核 - 黄色
    shipping: 'primary',   // 寄样中 - 蓝色
    sent: 'success',       // 已寄样 - 绿色
    refused: 'danger'      // 不合作 - 红色
  }
  return typeMap[status] || 'info'
}

// 获取寄样状态文本
const getSampleStatusText = (status) => {
  const textMap = {
    pending: t('sampleBD.pending'),
    shipping: t('sampleBD.shipping'),
    sent: t('sampleBD.sent'),
    refused: t('sampleBD.refused')
  }
  return textMap[status] || t('sampleBD.pending')
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

const loadSamples = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      companyId: userStore.companyId,
      ...searchForm
      // salesmanId 由后端数据权限中间件自动设置
    }
    const res = await request.get('/samples', { params })
    samples.value = res.samples
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load samples error:', error)
    ElMessage.error(t('sampleBD.loadFailed'))
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  Object.assign(searchForm, {
    date: '',
    productName: '',
    influencerAccount: '',
    isSampleSent: null,
    isOrderGenerated: null
  })
  pagination.page = 1
  loadSamples()
}

// 加载产品列表
const loadCooperationProducts = async () => {
  try {
    const res = await request.get('/products', { params: { companyId: userStore.companyId, status: 'active', limit: 100 } })
    cooperationProducts.value = res.data || res.products || []
  } catch (error) {
    console.error('加载产品失败:', error)
  }
}

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

const handleProductSelect = (productId) => {
  const product = cooperationProducts.value.find(p => p._id === productId)
  if (product) {
    createForm.productId = product._id
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
      params: { companyId: userStore.companyId, keyword: query, limit: 20 }
    })
    influencerOptions.value = res.influencers || []
  } catch (error) {
    console.error('搜索达人失败:', error)
  } finally {
    influencerLoading.value = false
  }
}

const showCreateDialog = () => {
  // BD页面默认salesmanId由后端数据权限自动填充，前端不传或传当前用户_id
  Object.assign(createForm, {
    date: getTodayDate(),
    productId: '',
    influencerId: '',
    shippingInfo: '',
    isSampleSent: false,
    trackingNumber: '',
    shippingDate: '',
    logisticsCompany: '',
    isOrderGenerated: false
  })
  createDialogVisible.value = true
  loadCooperationProducts()
}

const handleCreate = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    // ★ 先检查黑名单达人（通过选中的influencerId查找）
    try {
      const selectedInf = influencerOptions.value.find(i => i._id === createForm.influencerId)
      if (selectedInf && selectedInf.isBlacklisted) {
        ElMessage.error(t('sampleBD.blacklistInfluencerWarning'))
        return
      }
      if (selectedInf) {
        const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${selectedInf.tiktokId}`, {
          params: { companyId: userStore.companyId }
        })
        if (blacklistRes.isBlacklisted) {
          ElMessage.error(t('sampleBD.blacklistInfluencerWarning'))
          return
        }
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    creating.value = true
    try {
      // ★ 构造新的请求体（只包含重构后需要的字段）
      const submitPayload = {
        date: createForm.date,
        productId: createForm.productId,       // ObjectId
        influencerId: createForm.influencerId, // ObjectId
        shippingInfo: createForm.shippingInfo,
        isSampleSent: createForm.isSampleSent,
        trackingNumber: createForm.trackingNumber,
        shippingDate: createForm.shippingDate,
        logisticsCompany: createForm.logisticsCompany,
        isOrderGenerated: createForm.isOrderGenerated
      }

      await request.post('/samples', submitPayload)
      ElMessage.success(t('sampleBD.createSuccess'))
      createDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || t('sampleBD.createFailed'))
    } finally {
      creating.value = false
    }
  })
}

const viewSampleDetail = async (sample) => {
  currentSample.value = sample
  detailDialogVisible.value = true

  if (sample.influencerAccount) {
    try {
      const res = await request.get('/influencer-managements', {
        params: {
          companyId: userStore.companyId,
          keyword: sample.influencerAccount,
          limit: 1
        }
      })
      const influencers = res.influencers || []
      const matched = influencers.find(i => i.tiktokId === sample.influencerAccount)
      if (matched) {
        influencerDetail.value = matched
      } else {
        influencerDetail.value = null
      }
    } catch (error) {
      console.error('获取达人信息失败:', error)
      influencerDetail.value = null
    }
  } else {
    influencerDetail.value = null
  }
}

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

// 打开投流信息编辑弹窗
const openAdPromotionDialog = (sample) => {
  Object.assign(adPromotionForm, {
    _id: sample._id,
    videoStreamCode: sample.videoStreamCode || ''
  })
  adPromotionDialogVisible.value = true
}

// 保存投流信息
const handleAdPromotionSave = async () => {
  adPromotionLoading.value = true
  try {
    // ★ 通过Video API创建/更新视频记录
    await request.post(`/samples/${adPromotionForm._id}/videos`, {
      videoStreamCode: adPromotionForm.videoStreamCode,
      isAdPromotion: true,
      adPromotionTime: new Date().toISOString()
    })
    ElMessage.success(t('sampleBD.saveSuccess'))
    adPromotionDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save ad promotion error:', error)
    ElMessage.error(t('sampleBD.saveFailed'))
  } finally {
    adPromotionLoading.value = false
  }
}

// 打开履约信息编辑弹窗
const openFulfillmentDialog = (sample) => {
  Object.assign(fulfillmentForm, {
    _id: sample._id,
    videoLink: sample.videoLink || ''
  })
  fulfillmentDialogVisible.value = true
}

// ★ 保存履约信息（重构后：通过Video API创建视频记录）
const handleFulfillmentSave = async () => {
  if (!fulfillmentForm.videoLink?.trim()) {
    ElMessage.warning(t('videos.enterVideoLinkWarning'))
    return
  }
  fulfillmentLoading.value = true
  try {
    // 通过样品的子路由Video API创建视频记录
    await request.post(`/samples/${fulfillmentForm._id}/videos`, {
      videoLink: fulfillmentForm.videoLink,
      isAdPromotion: false
    })
    ElMessage.success(t('sampleBD.saveSuccess'))
    fulfillmentDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save fulfillment error:', error)
    ElMessage.error(t('sampleBD.saveFailed'))
  } finally {
    fulfillmentLoading.value = false
  }
}

// 跳转到TikTok订单页面
const goToOrders = async (sample) => {
  if (!sample.isOrderGenerated) return
  
  router.push({
    path: '/report-orders',
    query: {
      influencerAccount: sample.influencerAccount,
      productId: sample.productId
    }
  })
}

const openSubmissionDetail = (submission) => {
  // 找到对应的完整sample记录
  const sample = samples.value.find(s => s._id === submission.sampleId)
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

.refusal-reason {
  font-size: 10px;
  color: #f56c6c;
  margin-top: 2px;
}

.refusal-reason-detail {
  color: #f56c6c;
  font-weight: 500;
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

.video-link {
  font-size: 11px;
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

.stream-code {
  font-size: 12px;
  color: #757575;
  display: flex;
  align-items: center;
  gap: 6px;
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

.bottom-info {
  text-align: right;
  padding-top: 12px;
  border-top: 1px solid #e8ebf0;
  color: #a0aec0;
  font-size: 12px;
}

.blacklist-row {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.blacklist-row td {
  background-color: #f5f5f5 !important;
  color: #666;
}

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

.el-input-number {
  width: 100%;
}

.el-input-number :deep(.el-input__wrapper) {
  width: 100%;
  min-width: unset;
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
</style>
