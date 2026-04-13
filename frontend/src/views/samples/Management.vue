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

        <el-form-item :label="'商品ID'">
          <el-input
            v-model="searchForm.productId"
            placeholder="商品ID"
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

        <el-form-item :label="$t('samples.applyDate')">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            :placeholder="$t('samples.selectDate')"
            clearable
            style="width: 150px"
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
          :label="$t('samples.tiktokId')"
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
                          <h4>历史申样记录 ({{ row.duplicateCount }})</h4>
                        </div>
                        <div class="popover-content">
                          <!-- 商品和达人信息只展示一次 -->
                          <div class="summary-info" v-if="row.previousSubmissions && row.previousSubmissions.length > 0">
                            <div class="summary-item">
                              <span class="summary-label">商品名称：</span>
                              <span class="summary-value">{{ row.previousSubmissions[0].productName || '-' }}</span>
                            </div>
                            <div class="summary-item">
                              <span class="summary-label">TikTok ID：</span>
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
                                  <span class="cell-label">申请日期：</span>
                                  <span class="cell-value">{{ formatDate(sub.date) }}</span>
                                </div>
                                <div class="submission-cell">
                                  <span class="cell-label">审批状态：</span>
                                  <span class="cell-value">
                                    <el-tag :type="getSampleStatusType(sub.sampleStatus)" size="small" class="status-tag">
                                      {{ getSampleStatusText(sub.sampleStatus) }}
                                    </el-tag>
                                  </span>
                                </div>
                                <div class="submission-cell">
                                  <span class="cell-label">BD：</span>
                                  <span class="cell-value">{{ sub.salesman || '-' }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </el-popover>
                  </span>
                  <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">{{ $t('samples.blacklist') }}</el-tag>
                </div>
              </template>
              <div v-if="popoverLoading" class="popover-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>{{ $t('samples.loading') }}</span>
              </div>
              <div v-else-if="popoverInfluencer" class="influencer-popover">
                <el-descriptions :column="1" size="small">
                  <el-descriptions-item :label="$t('samples.tiktokId')">
                    <span class="tiktok-id-text">{{ popoverInfluencer.tiktokId }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item :label="$t('samples.tiktokName')">{{ popoverInfluencer.tiktokName || '-' }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('samples.latestFollowers')">{{ formatNumber(popoverInfluencer.latestFollowers) }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('samples.latestGmv')">{{ popoverInfluencer.latestGmv || '-' }}</el-descriptions-item>
                  <el-descriptions-item :label="$t('samples.status')">
                    <el-tag :type="popoverInfluencer.status === 'enabled' ? 'success' : 'info'" size="small">
                      {{ popoverInfluencer.status === 'enabled' ? $t('samples.enabled') : $t('samples.disabled') }}
                    </el-tag>
                    <el-tag v-if="popoverInfluencer.isBlacklisted" type="danger" size="small" style="margin-left: 4px">{{ $t('samples.blacklist') }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else class="popover-empty">
                <span>{{ $t('samples.influencerNotFound') }}</span>
              </div>
            </el-popover>
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
                <span v-if="row.logisticsCompany">{{ row.logisticsCompany }}</span>
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
                    {{ row.isOrderGenerated ? $t('samples.orderGenerated') : $t('samples.noOrder') }}
                  </el-tag>
                  <span v-if="row.isOrderGenerated && row.orderCount" class="order-count-badge">
                    {{ row.orderCount > 99 ? '...' : row.orderCount }}
                  </span>
                </span>
                <el-icon class="edit-icon" @click.stop="openFulfillmentDialog(row)"><Edit /></el-icon>
              </div>
              <div v-if="row.videoLink" class="video-link">
                <el-link :href="row.videoLink" target="_blank" type="primary">
                  {{ $t('samples.videoLink') }}
                </el-link>
              </div>
              <div v-if="row.fulfillmentUpdatedAt" class="update-info">
                {{ row.fulfillmentUpdatedBy?.realName || row.fulfillmentUpdatedBy?.username || $t('samples.unknown') }} {{ formatDateTime(row.fulfillmentUpdatedAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 投流信息 - 带编辑功能 -->
        <el-table-column
          :label="$t('samples.adPromotion')"
          width="240"
        >
          <template #default="{ row }">
            <div class="promotion-info">
              <div class="stream-code">
                {{ row.videoStreamCode || '--' }}
                <el-icon class="edit-icon" @click.stop="openAdPromotionDialog(row)"><Edit /></el-icon>
              </div>
              <div class="promotion-status">
                <el-tag :type="row.isAdPromotion ? 'success' : 'info'" size="small">
                  {{ row.isAdPromotion ? $t('samples.adPromoted') : $t('samples.notAdPromoted') }}
                </el-tag>
                <span v-if="row.adPromotionTime">{{ formatDate(row.adPromotionTime) }}</span>
              </div>
              <div v-if="row.adPromotionUpdatedAt" class="update-info">
                {{ row.adPromotionUpdatedBy?.realName || row.adPromotionUpdatedBy?.username || $t('samples.unknown') }} {{ formatDateTime(row.adPromotionUpdatedAt) }}
              </div>
            </div>
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
            <div class="product-info">
              <div class="product-id">{{ row.productId || '--' }}</div>
              <el-tooltip :content="row.productName" placement="top">
                <div class="product-name">
                  {{ truncateText(row.productName, 60) }}
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.shop')"
          width="150"
          prop="shopName"
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.shopName || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          :label="$t('samples.influencerData')"
          width="200"
        >
          <template #default="{ row }">
            <div class="influencer-data">
              <div class="data-row">
                <el-tag type="info" size="small">{{ $t('samples.followers') }}</el-tag>
                <span class="follower-count">{{ formatNumber(row.followerCount) }}</span>
              </div>
              <div class="data-row">
                <el-tag type="info" size="small">{{ $t('samples.monthlySales') }}</el-tag>
                <span class="follower-count">{{ formatNumber(row.monthlySalesCount) }}</span>
              </div>
              <div class="data-row">
                <el-tag type="info" size="small">{{ $t('samples.avgViews') }}</el-tag>
                <span class="follower-count">{{ formatNumber(row.avgVideoViews) }}</span>
              </div>
            </div>
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
            <el-button link type="warning" @click="openEditDialog(row)" v-if="hasPermission('samples:update')">{{ $t('samples.edit') || '修改' }}</el-button>
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
          <el-tab-pane label="基础信息" name="basic">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">TikTok ID：</span>
                  <span class="cell-value tiktok-id-text">{{ currentSample.influencerAccount || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">申请日期：</span>
                  <span class="cell-value">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">BD：</span>
                  <span class="cell-value">{{ currentSample.salesman || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell wide">
                  <span class="cell-label">商品名称：</span>
                  <span class="cell-value product-name">{{ currentSample.productName || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">商品ID：</span>
                  <span class="cell-value">{{ currentSample.productId || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">样品图片：</span>
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
                <h4 class="section-title">达人数据统计</h4>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">粉丝数</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.followerCount) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">月销量</span>
                    <span class="stat-value highlight-value">{{ formatNumber(currentSample.monthlySalesCount) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">平均播放</span>
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
                <h4 class="section-title">收货地址信息</h4>
                <div class="shipping-info">
                  <span class="shipping-value">{{ currentSample.shippingInfo || '-' }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 寄样状态标签页 -->
          <el-tab-pane label="寄样状态" name="shipping">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">寄样状态：</span>
                  <span class="cell-value">
                    <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="large">
                      {{ getSampleStatusText(currentSample.sampleStatus) }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">样品已寄出：</span>
                  <span class="cell-value">
                    <el-tag :type="currentSample.isSampleSent ? 'success' : 'info'" size="large">
                      {{ currentSample.isSampleSent ? $t('samples.yes') : $t('samples.no') }}
                    </el-tag>
                  </span>
                </div>
              </div>
              
              <!-- 已寄样时的物流信息 -->
              <div class="shipping-details" v-if="currentSample.sampleStatus === 'sent'">
                <h4 class="section-title">物流信息</h4>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-label">寄出日期：</span>
                    <span class="detail-value">{{ currentSample.shippingDate ? formatDate(currentSample.shippingDate) : '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">物流公司：</span>
                    <span class="detail-value">{{ currentSample.logisticsCompany || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">运单号：</span>
                    <span class="detail-value">{{ currentSample.trackingNumber || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">签收日期：</span>
                    <span class="detail-value">{{ currentSample.receivedDate ? formatDate(currentSample.receivedDate) : '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 拒绝时的原因 -->
              <div class="refusal-section" v-if="currentSample.sampleStatus === 'refused' && currentSample.refusalReason">
                <h4 class="section-title">拒绝原因</h4>
                <div class="refusal-reason">
                  {{ currentSample.refusalReason }}
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 履约信息标签页 -->
          <el-tab-pane label="履约信息" name="fulfillment">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">订单状态：</span>
                  <span class="cell-value">
                    <el-tag :type="currentSample.isOrderGenerated ? 'success' : 'warning'" size="large">
                      {{ currentSample.isOrderGenerated ? $t('samples.orderGenerated') : $t('samples.noOrder') }}
                    </el-tag>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">履约时间：</span>
                  <span class="cell-value">{{ currentSample.fulfillmentTime || '-' }}</span>
                </div>
              </div>
              
              <!-- 视频链接 -->
              <div class="video-section" v-if="currentSample.videoLink">
                <h4 class="section-title">视频链接</h4>
                <div class="video-info">
                  <el-link :href="currentSample.videoLink" target="_blank" type="primary">
                    {{ $t('samples.viewVideo') || 'View Video' }}
                  </el-link>
                </div>
              </div>
              
              <!-- 投流信息 -->
              <div class="ad-promotion-section">
                <h4 class="section-title">投流信息</h4>
                <div class="ad-grid">
                  <div class="ad-item">
                    <span class="ad-label">投流状态：</span>
                    <span class="ad-value">
                      <el-tag :type="currentSample.isAdPromotion ? 'success' : 'info'" size="large">
                        {{ currentSample.isAdPromotion ? $t('samples.adPromoted') : $t('samples.notAdPromoted') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="ad-item">
                    <span class="ad-label">投流时间：</span>
                    <span class="ad-value">{{ currentSample.adPromotionTime ? formatDate(currentSample.adPromotionTime) : '-' }}</span>
                  </div>
                  <div class="ad-item wide">
                    <span class="ad-label">流码：</span>
                    <span class="ad-value">{{ currentSample.videoStreamCode || '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 更新信息 -->
              <div class="update-info-section">
                <div class="update-item">
                  <span class="update-label">订单信息更新：</span>
                  <span class="update-value">
                    {{ currentSample.fulfillmentUpdatedBy?.realName || currentSample.fulfillmentUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.fulfillmentUpdatedAt">{{ formatDateTime(currentSample.fulfillmentUpdatedAt) }}</span>
                  </span>
                </div>
                <div class="update-item">
                  <span class="update-label">投流信息更新：</span>
                  <span class="update-value">
                    {{ currentSample.adPromotionUpdatedBy?.realName || currentSample.adPromotionUpdatedBy?.username || '-' }}
                    <span v-if="currentSample.adPromotionUpdatedAt">{{ formatDateTime(currentSample.adPromotionUpdatedAt) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 达人信息标签页 -->
          <el-tab-pane label="达人信息" name="influencer">
            <div v-if="influencerDetail">
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">TikTok ID：</span>
                    <span class="cell-value tiktok-id-text">{{ influencerDetail.tiktokId }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">TikTok名称：</span>
                    <span class="cell-value">{{ influencerDetail.tiktokName || '-' }}</span>
                  </div>
                </div>
                
                <div class="info-row">
                  <div class="info-cell">
                    <span class="cell-label">真实姓名：</span>
                    <span class="cell-value">{{ influencerDetail.realName || '-' }}</span>
                  </div>
                  <div class="info-cell">
                    <span class="cell-label">昵称：</span>
                    <span class="cell-value">{{ influencerDetail.nickname || '-' }}</span>
                  </div>
                </div>
                
                <!-- 达人统计数据 -->
                <div class="influencer-stats">
                  <h4 class="section-title">达人统计数据</h4>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <span class="stat-label">最新粉丝数</span>
                      <span class="stat-value highlight-value">{{ formatNumber(influencerDetail.latestFollowers) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">最新GMV</span>
                      <span class="stat-value">{{ influencerDetail.latestGmv || '-' }}</span>
                    </div>
                  </div>
                </div>
                
                <!-- 达人状态 -->
                <div class="status-section">
                  <div class="status-item">
                    <span class="status-label">达人状态：</span>
                    <span class="status-value">
                      <el-tag :type="influencerDetail.status === 'enabled' ? 'success' : 'info'" size="large">
                        {{ influencerDetail.status === 'enabled' ? $t('samples.enabled') : $t('samples.disabled') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">黑名单状态：</span>
                    <span class="status-value">
                      <el-tag v-if="influencerDetail.isBlacklisted" type="danger" size="large">{{ $t('samples.blacklist') }}</el-tag>
                      <span v-else>正常</span>
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
          <span class="created-label">创建时间：</span>
          <span class="created-value">{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="editingSample ? ($t('samples.editSample') || '修改样品') : $t('samples.createSample')"
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
            <el-form-item :label="$t('samples.bd')" prop="salesman">
              <el-select v-model="createForm.salesman" :placeholder="$t('samples.selectBD') || 'Select BD'" filterable style="width: 100%" :loading="bdLoading">
                <el-option
                  v-for="user in users"
                  :key="user._id"
                  :label="user.realName || user.username"
                  :value="user.realName || user.username"
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
            :placeholder="$t('samples.searchProduct') || 'Search product'"
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

        <el-form-item :label="$t('samples.tiktokId')" prop="influencerAccount" class="tiktok-label">
          <el-input v-model="createForm.influencerAccount" :placeholder="$t('samples.tiktokId')" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('samples.followers')" prop="followerCount">
              <el-input-number v-model="createForm.followerCount" :min="0" :controls="false" :placeholder="$t('samples.followers')" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="GMV" prop="gmv">
              <div style="display: flex; align-items: center; gap: 4px;">
                <el-select v-model="createForm.currency" :placeholder="$t('samples.currency') || 'Currency'" style="width: 70px">
                  <el-option v-for="c in currencyList" :key="c.code" :label="c.name" :value="c.code" />
                </el-select>
                <el-input-number v-model="createForm.gmv" :min="0" :precision="2" :controls="false" style="flex: 1" placeholder="GMV" />
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="$t('samples.monthlySales')" prop="monthlySalesCount">
              <el-input-number v-model="createForm.monthlySalesCount" :min="0" :controls="false" :placeholder="$t('samples.monthlySales')" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('samples.avgViews')" prop="avgVideoViews">
              <el-input-number v-model="createForm.avgVideoViews" :min="0" :controls="false" :placeholder="$t('samples.avgViews')" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="$t('samples.addressInfo')" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            :placeholder="$t('samples.enterAddress') || 'Enter address'"
          />
        </el-form-item>

        <el-form-item :label="$t('samples.sampleImage') || 'Sample Image'">
          <el-input v-model="createForm.sampleImage" placeholder="Image URL" />
        </el-form-item>

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
              <el-form-item :label="$t('samples.logisticsCompany') || 'Logistics'">
                <el-input v-model="createForm.logisticsCompany" :placeholder="$t('samples.enterLogistics') || 'Enter logistics company'" />
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
        <el-button @click="createDialogVisible = false">{{ $t('common.cancel') || 'Cancel' }}</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="creating">{{ editingSample ? ($t('common.save') || '保存') : ($t('common.confirm') || 'Confirm') }}</el-button>
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
          <el-form-item :label="$t('samples.logisticsCompany') || '物流公司'">
            <el-select v-model="sampleStatusForm.logisticsCompany" placeholder="Select logistics company" style="width: 100%">
              <el-option
                v-for="opt in logisticsCompanyOptions"
                :key="opt._id"
                :label="opt.name"
                :value="opt.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="快递单号" :required="sampleStatusForm.logisticsCompany !== 'default'">
            <el-input v-model="sampleStatusForm.trackingNumber" placeholder="Enter tracking number" />
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

    <!-- 投流信息编辑对话框 -->
    <el-dialog
      v-model="adPromotionDialogVisible"
      :title="$t('samples.updateAdPromotion')"
      width="400px"
    >
      <el-form :model="adPromotionForm" label-width="80px">
        <el-form-item :label="$t('samples.adPromotion')">
          <el-switch v-model="adPromotionForm.isAdPromotion" />
        </el-form-item>
        <el-form-item :label="$t('samples.streamCode') || 'Stream Code'">
          <el-input v-model="adPromotionForm.videoStreamCode" :placeholder="$t('samples.enterStreamCode') || 'Enter stream code'" :disabled="!adPromotionForm.isAdPromotion" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adPromotionDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleAdPromotionSave" :loading="adPromotionLoading">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 履约信息编辑对话框 -->
    <el-dialog
      v-model="fulfillmentDialogVisible"
      :title="$t('samples.updateFulfillment')"
      width="400px"
    >
      <el-form :model="fulfillmentForm" label-width="80px">
        <el-form-item :label="$t('samples.videoLink')">
          <el-input v-model="fulfillmentForm.videoLink" :placeholder="$t('samples.enterVideoLink')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fulfillmentDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleFulfillmentSave" :loading="fulfillmentLoading">{{ $t('common.save') }}</el-button>
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
import { Upload, Plus, Loading, InfoFilled, Box, TrendCharts, User, Edit, Warning } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

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
const adPromotionDialogVisible = ref(false)
const adPromotionForm = reactive({
  _id: '',
  videoStreamCode: '',
  isAdPromotion: false
})
const adPromotionLoading = ref(false)

// 履约信息编辑
const fulfillmentDialogVisible = ref(false)
const fulfillmentForm = reactive({
  _id: '',
  videoLink: ''
})
const fulfillmentLoading = ref(false)

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

const searchForm = reactive({
  date: '',
  productName: '',
  influencerAccount: '',
  salesman: '',
  sampleStatus: '',
  isOrderGenerated: null,
  productId: ''  // 商品ID搜索
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const createForm = reactive({
  date: '',
  productName: '',
  productId: '',
  tiktokProductId: '',  // 新增
  influencerAccount: '',
  followerCount: 0,
  monthlySalesCount: 0,
  avgVideoViews: 0,
  gmv: 0,
  currency: '',
  salesman: '',
  shippingInfo: '',
  sampleImage: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false
})

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

const createRules = {
  date: [{ required: true, message: 'Please select date', trigger: 'change' }],
  productId: [{ required: true, message: 'Please select product', trigger: 'change' }],
  influencerAccount: [{ required: true, message: 'Please enter TikTok ID', trigger: 'blur' }],
  salesman: [{ required: true, message: 'Please select BD', trigger: 'change' }]
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
    date: '',
    productName: '',
    influencerAccount: '',
    salesman: '',
    sampleStatus: '',
    isOrderGenerated: null,
    productId: ''
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
    createForm.productName = product.name || product.productName || ''
    createForm.productId = product._id  // 存 MongoDB _id 用于后端查询
  }
}

const showCreateDialog = () => {
  editingSample.value = null  // 重置编辑状态
  // 默认归属BD为当前登录用户
  const currentUser = userStore.user
  Object.assign(createForm, {
    date: getTodayDate(),
    productName: '',
    productId: '',
    tiktokProductId: '',
    influencerAccount: '',
    followerCount: 0,
    monthlySalesCount: 0,
    avgVideoViews: 0,
    gmv: 0,
    salesman: currentUser?._id || currentUser?.id || '',
    shippingInfo: '',
    sampleImage: '',
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
  
  // 填充表单数据
  Object.assign(createForm, {
    date: sample.date || '',
    productName: sample.productName || '',
    productId: sample.productId || '',
    tiktokProductId: sample.tiktokProductId || '',
    influencerAccount: sample.influencerAccount || '',
    followerCount: sample.followerCount || 0,
    monthlySalesCount: sample.monthlySalesCount || 0,
    avgVideoViews: sample.avgVideoViews || 0,
    gmv: sample.gmv || 0,
    currency: sample.currency || '',
    salesman: sample.salesman || '',
    shippingInfo: sample.shippingInfo || '',
    sampleImage: sample.sampleImage || '',
    isSampleSent: sample.isSampleSent || false,
    trackingNumber: sample.trackingNumber || '',
    shippingDate: sample.shippingDate || '',
    logisticsCompany: sample.logisticsCompany || '',
    isOrderGenerated: sample.isOrderGenerated || false
  })
  
  createDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return

    // 如果是编辑模式，直接提交
    if (editingSample.value) {
      creating.value = true
      try {
        await request.put(`/samples/${editingSample.value._id}`, createForm)
        ElMessage.success(t('samples.saveSuccess'))
        createDialogVisible.value = false
        editingSample.value = null
        resetCreateForm()
        loadSamples()
      } catch (error) {
        console.error('Update sample error:', error)
        ElMessage.error(error.response?.data?.message || t('samples.saveError') || 'Failed to update')
      } finally {
        creating.value = false
      }
      return
    }

    // 新建模式
    // 先检查是否为黑名单达人
    try {
      const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${createForm.influencerAccount}`, {
        params: { companyId: userStore.companyId }
      })
      if (blacklistRes.isBlacklisted) {
        ElMessage.error(t('samples.blacklistInfluencerWarning') || 'This influencer is blacklisted, reduce contact!')
        return
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    // 检查当天是否已有相同记录（date + productId + influencerAccount）
    try {
      const checkRes = await request.get('/samples', {
        params: {
          companyId: userStore.companyId,
          date: createForm.date,
          productId: createForm.productId,
          influencerAccount: createForm.influencerAccount,
          limit: 1
        }
      })
      if (checkRes.data && checkRes.data.length > 0) {
        ElMessage.error('当天已有这位达人对此商品的申样记录，请勿重复提交')
        return
      }
    } catch (checkError) {
      console.error('检查重复记录失败:', checkError)
      // 如果检查失败，继续提交，后端会再次检查
    }

    creating.value = true
    try {
      await request.post('/samples', createForm)

      // 检查TikTok ID是否在达人表中存在
      try {
        const influencerRes = await request.get('/influencer-managements', {
          params: {
            companyId: userStore.companyId,
            keyword: createForm.influencerAccount,
            limit: 1
          }
        })
        const influencers = influencerRes.influencers || []
        const matchedInfluencer = influencers.find(i => i.tiktokId === createForm.influencerAccount)

        if (matchedInfluencer) {
          // 添加维护记录
          await request.post(`/influencer-managements/${matchedInfluencer._id}/maintenance`, {
            followers: createForm.followerCount,
            gmv: createForm.gmv,
            remark: '样品申请'
          })
          console.log('已添加达人维护记录')
        }
      } catch (infError) {
        console.error('检查达人或添加维护记录失败:', infError)
      }

      ElMessage.success(t('samples.saveSuccess'))
      createDialogVisible.value = false
      resetCreateForm()
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || t('samples.createError') || 'Failed to create')
    } finally {
      creating.value = false
    }
  })
}

// 重置新建表单
const resetCreateForm = () => {
  Object.assign(createForm, {
    date: '',
    productName: '',
    productId: '',
    tiktokProductId: '',
    influencerAccount: '',
    followerCount: 0,
    monthlySalesCount: 0,
    avgVideoViews: 0,
    gmv: 0,
    currency: '',
    salesman: '',
    shippingInfo: '',
    sampleImage: '',
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
  
  // 尝试获取达人信息
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

// 打开投流信息编辑弹窗
const openAdPromotionDialog = (sample) => {
  Object.assign(adPromotionForm, {
    _id: sample._id,
    videoStreamCode: sample.videoStreamCode || '',
    isAdPromotion: sample.isAdPromotion || false
  })
  adPromotionDialogVisible.value = true
}

// 保存投流信息
const handleAdPromotionSave = async () => {
  adPromotionLoading.value = true
  try {
    await request.put(`/samples/${adPromotionForm._id}`, {
      videoStreamCode: adPromotionForm.videoStreamCode,
      isAdPromotion: adPromotionForm.isAdPromotion
    })
    ElMessage.success(t('samples.saveSuccess'))
    adPromotionDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save ad promotion error:', error)
    ElMessage.error(t('samples.saveError') || 'Failed to save')
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
  // 已寄样时：选择非default时快递单号必填
  if (sampleStatusForm.sampleStatus === 'sent' && sampleStatusForm.logisticsCompany !== 'default' && !sampleStatusForm.trackingNumber) {
    ElMessage.error('快递单号不能为空')
    return
  }
  sampleStatusLoading.value = true
  try {
    const payload = {
      sampleStatus: sampleStatusForm.sampleStatus,
      refusalReason: sampleStatusForm.sampleStatus === 'refused' ? sampleStatusForm.refusalReason : ''
    }
    // 已寄样时发送物流信息
    if (sampleStatusForm.sampleStatus === 'sent') {
      payload.logisticsCompany = sampleStatusForm.logisticsCompany
      payload.trackingNumber = sampleStatusForm.trackingNumber
    }
    await request.put(`/samples/${sampleStatusForm._id}`, payload)
    ElMessage.success(t('samples.saveSuccess'))
    sampleStatusDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save sample status error:', error)
    ElMessage.error(t('samples.saveError') || 'Failed to save')
  } finally {
    sampleStatusLoading.value = false
  }
}

// 保存履约信息
const handleFulfillmentSave = async () => {
  fulfillmentLoading.value = true
  try {
    await request.put(`/samples/${fulfillmentForm._id}`, {
      videoLink: fulfillmentForm.videoLink
    })
    ElMessage.success(t('samples.saveSuccess'))
    fulfillmentDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save fulfillment error:', error)
    ElMessage.error(t('samples.saveError') || 'Failed to save')
  } finally {
    fulfillmentLoading.value = false
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

const deleteSample = async (sample) => {
  await ElMessageBox.confirm(t('samples.confirmDelete'), t('common.warning') || 'Warning', {
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
  ElMessage.info(t('samples.importing') || 'Importing, please wait...')
  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const res = await request.post('/samples/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success(res.message || t('samples.importSuccess') || 'Import successful')

    if (res.data) {
      const summary = `${t('samples.added') || 'Added'}: ${res.data.added}\n${t('samples.updated') || 'Updated'}: ${res.data.updated}`

      if (res.data.errors && res.data.errors.length > 0) {
        const errorDetails = res.data.errors.map(e => `Row ${e.row}: ${e.error}`).join('\n')
        ElMessageBox.alert(
          `${summary}\n${t('samples.failed') || 'Failed'}: ${res.data.failed}\n\nError Details:\n${errorDetails}`,
          t('samples.importResult') || 'Import Result',
          { type: 'warning' }
        )
      } else {
        ElMessage.success(summary)
      }
    }

    loadSamples()
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error(t('samples.importError') || 'Import failed, please try again later')
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
    ElMessage.info('正在加载详情...')
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

.submission-item:hover {
  background-color: #f5f7fa;
}
</style>
