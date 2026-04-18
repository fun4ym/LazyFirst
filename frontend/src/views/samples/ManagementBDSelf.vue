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
                <span v-if="row.logisticsCompany" class="logistics-company-small">
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
            </div>
          </template>
        </el-table-column>

        <!-- 履约视频 - 带编辑功能 -->
        <el-table-column
          :label="$t('sampleBD.fulfillmentVideo')"
          width="320"
        >
          <template #default="{ row }">
            <div class="fulfillment-video-col">
              <!-- 视频列表 - 每条视频一行 -->
              <template v-if="row.videos && row.videos.length > 0">
                <div v-for="(video, idx) in row.videos" :key="idx" class="video-row"><!-- 视频链接 -->
                  <a
                    v-if="video.videoLink"
                    :href="video.videoLink"
                    target="_blank"
                    class="video-link-text"
                  >{{ $t('sampleBD.videoLink') }}</a>
                  <span v-else class="video-link-empty">{{ $t('sampleBD.noVideo') }}</span>

<!-- 复制图标 -->
                  <svg
                    v-if="video.videoLink"
                    class="icon copy-icon"
                    viewBox="0 0 1024 1024"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    @click.stop="copyVideoLink(video.videoLink)"
                  >
                    <path d="M 96.1 575.7 a 32.2 32.1 0 1 0 64.4 0 32.2 32.1 0 1 0 -64.4 0 Z" fill="#4D4D4D"></path>
                    <path d="M 736.1 63.9 H 417 c -70.4 0 -128 57.6 -128 128 h -64.9 c -70.4 0 -128 57.6 -128 128 v 128 c -0.1 17.7 14.4 32 32.2 32 17.8 0 32.2 -14.4 32.2 -32.1 V 320 c 0 -35.2 28.8 -64 64 -64 H 289 v 447.8 c 0 70.4 57.6 128 128 128 h 255.1 c -0.1 35.2 -28.8 63.8 -64 63.8 H 224.5 c -35.2 0 -64 -28.8 -64 -64 V 703.5 c 0 -17.7 -14.4 -32.1 -32.2 -32.1 -17.8 0 -32.3 14.4 -32.3 32.1 v 128.3 c 0 70.4 57.6 128 128 128 h 384.1 c 70.4 0 128 -57.6 128 -128 h 65 c 70.4 0 128 -57.6 128 -128 V 255.9 l -193 -192 z m 0.1 63.4 l 127.7 128.3 H 800 c -35.2 0 -64 -28.8 -64 -64 v -64.3 h 0.2 z m 64 641 H 416.1 c -35.2 0 -64 -28.8 -64 -64 v -513 c 0 -35.2 28.8 -64 64 -64 H 671 V 191 c 0 70.4 57.6 128 128 128 h 65.2 v 385.3 c 0 35.2 -28.8 64 -64 64 z" fill="#4D4D4D"></path>
                  </svg>
                  <span v-else class="icon-placeholder"></span>

<!-- 加热/待加热火焰图标 - 以推流码判断是否投流 -->
                  <svg
                    v-if="video.videoStreamCode && video.videoStreamCode.trim()"
                    class="icon fire-icon heated"
                    viewBox="0 0 1024 1024"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    @click.stop="copyStreamCode(video.videoStreamCode)"
                    style="cursor: pointer;"
                  >
                    <path d="M 730.289826 190.531934 c 23.222322 53.94432 26.710915 143.090263 -21.368132 185.948409 C 630.863922 61.957495 435.714498 0.58343 435.714498 0.58343 c 23.221323 159.889858 -81.547364 334.866981 -184.46386 466.756184 -3.488593 -63.20128 -7.194974 -105.946537 -40.774181 -171.090919 C 203.281483 413.396293 118.244527 506.426443 93.3888 623.573042 c -30.090615 161.83296 24.856726 275.321132 234.068418 400.011364 -65.630907 -143.090263 -30.089616 -225.035239 21.369131 -299.322693 54.946341 -85.488515 69.337288 -167.433491 69.337288 -167.433491 s 44.261776 57.601748 26.709916 148.689796 c 74.35239 -89.144944 88.743337 -232.577873 78.168664 -284.579091 C 693.223024 545.627161 769.428605 820.950291 670.219489 1019.926978 c 524.827473 -314.295071 129.189838 -781.165143 60.071336 -829.395044 z" fill="#FF6A00"></path>
                  </svg>
                  <svg
                    v-else-if="video.videoLink"
                    class="icon fire-icon unheated"
                    viewBox="0 0 1024 1024"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                  >
                    <path d="M 730.289826 190.531934 c 23.222322 53.94432 26.710915 143.090263 -21.368132 185.948409 C 630.863922 61.957495 435.714498 0.58343 435.714498 0.58343 c 23.221323 159.889858 -81.547364 334.866981 -184.46386 466.756184 -3.488593 -63.20128 -7.194974 -105.946537 -40.774181 -171.090919 C 203.281483 413.396293 118.244527 506.426443 93.3888 623.573042 c -30.090615 161.83296 24.856726 275.321132 234.068418 400.011364 -65.630907 -143.090263 -30.089616 -225.035239 21.369131 -299.322693 54.946341 -85.488515 69.337288 -167.433491 69.337288 -167.433491 s 44.261776 57.601748 26.709916 148.689796 c 74.35239 -89.144944 88.743337 -232.577873 78.168664 -284.579091 C 693.223024 545.627161 769.428605 820.950291 670.219489 1019.926978 c 524.827473 -314.295071 129.189838 -781.165143 60.071336 -829.395044 z" fill="#bfbfbf"></path>
                  </svg>
                  <span v-else class="icon-placeholder"></span>

<!-- 复制投流码文字 -->
                  <span
                    v-if="video.videoStreamCode && video.videoStreamCode.trim()"
                    class="stream-code-text"
                    @click.stop="copyStreamCode(video.videoStreamCode)"
                  >复制投流码</span>

<!-- 编辑图标 -->
                  <el-icon class="edit-icon" @click.stop="openVideoEditDialog(row, video, idx)"><Edit /></el-icon>
<!-- 删除图标 -->
                  <el-icon class="delete-icon" @click.stop="handleDeleteVideo(row, video, idx)"><Delete /></el-icon></div>
              </template>
              <!-- 无视频时只保留新增视频入口，不再显示 -->

              <!-- 新增视频按钮 -->
              <div class="add-video-row" @click.stop="openVideoAddDialog(row)">
                <svg class="icon add-video-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                  <path d="M 788 512.73 V 454 a 14.33 14.33 0 0 1 14.33 -14.33 h 74.73 A 14.33 14.33 0 0 1 891.42 454 v 74.7 a 14.38 14.38 0 0 1 -0.33 3 224.05 224.05 0 0 1 69.26 48.42 V 98.69 a 34.52 34.52 0 0 0 -34.5 -34.47 h -34.43 v 68.94 H 788 V 64.22 H 236.54 v 68.94 H 133.12 V 64.22 H 98.67 a 34.53 34.53 0 0 0 -34.46 34.47 v 631.1 a 52 52 0 0 0 51.67 46.78 h 341.88 l 0.3 1 H 64.21 v 79.36 a 34.52 34.52 0 0 0 34.46 34.46 h 34.44 v -34.44 h 103.43 v 34.46 h 402.82 A 222.82 222.82 0 0 1 576.48 736 c 0 -119.45 93.65 -217 211.52 -223.27 z m 0 -265.57 a 14.33 14.33 0 0 1 14.33 -14.33 h 74.73 a 14.33 14.33 0 0 1 14.37 14.33 v 74.74 a 14.33 14.33 0 0 1 -14.34 14.33 h -74.76 A 14.33 14.33 0 0 1 788 321.9 zM 222.2 749.8 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.32 v -74.73 a 14.33 14.33 0 0 1 14.33 -14.34 h 74.73 a 14.33 14.33 0 0 1 14.33 14.34 v 74.73 a 14.33 14.33 0 0 1 -14.31 14.32 z m 14.33 -221.12 A 14.34 14.34 0 0 1 222.2 543 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.32 V 454 a 14.33 14.33 0 0 1 14.36 -14.33 h 74.72 A 14.32 14.32 0 0 1 236.54 454 zM 232.34 332 a 14.31 14.31 0 0 1 -10.14 4.2 h -74.72 a 14.33 14.33 0 0 1 -14.36 -14.33 v -74.71 a 14.32 14.32 0 0 1 14.33 -14.33 h 74.73 a 14.33 14.33 0 0 1 14.33 14.33 v 74.73 a 14.3 14.3 0 0 1 -4.17 10.11 z m 213.93 295.4 a 26.12 26.12 0 0 1 -11.66 2.69 26.55 26.55 0 0 1 -13.61 -3.73 25.23 25.23 0 0 1 -12.21 -21.54 V 343.39 A 25.22 25.22 0 0 1 421 321.82 a 26.11 26.11 0 0 1 25.15 -1 l 224.18 130.65 a 25.09 25.09 0 0 1 0 45.22 h 0.07 z" fill="#8a8a8a"></path>
                  <path d="M 640.12 703.84 m 32 0 l 256.06 0 q 32 0 32 32 l 0 0 q 0 32 -32 32 l -256.06 0 q -32 0 -32 -32 l 0 0 q 0 -32 32 -32 Z" fill="#8a8a8a"></path>
                  <path d="M 832.15 576.04 m 0 32 l 0 256.06 q 0 32 -32 32 l 0 0 q -32 0 -32 -32 l 0 -256.06 q 0 -32 32 -32 l 0 0 q 32 0 32 32 Z" fill="#8a8a8a"></path>
                </svg>
                <span class="add-video-text">{{ $t('sampleBD.addVideo') }}</span>
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
            <div class="product-cell">
              <el-image v-if="row.productImage" :src="row.productImage" fit="cover" class="product-thumb" :preview-src-list="[row.productImage]" />
              <div v-else class="product-thumb-placeholder"></div>
              <div class="product-info">
                <div class="product-id purple">{{ row.productId_display || row.productId || '--' }}</div>
                <el-tooltip :content="row.productName" placement="top">
                  <div class="product-name">
                    {{ truncateText(row.productName, 50) }}
                  </div>
                </el-tooltip>
                <div class="shop-name" v-if="row.shopName">
                <svg t="1776483244387" class="shop-svg-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="32239" width="32" height="32"><path d="M 469.3 793.7 H 305.6 c -18.6 0 -33.6 -15 -33.6 -33.6 V 575.3 c 34.5 8.1 70.8 0.2 98.7 -21.6 20.5 16 45.8 0.8 -0.6 1.4 -1.4 1.4 h -83.6 c -0.8 0 -1.4 -0.6 -1.4 -1.4 V 648.4 c 0 -0.8 0.6 -1.4 1.4 -1.4 h 83.6 m 0 -17.3 h -83.6 c -10.3 0 -18.7 8.4 -18.7 18.7 v 134.9 c 0 10.3 8.4 18.7 18.7 18.7 h 83.6 c 10.3 0 18.7 -8.4 18.7 -18.7 V 648.4 c 0.1 -10.3 -8.3 -18.7 -18.7 -18.7 z" p-id="32245"></path><path d="m -12.4 -18.6 -12.4 -29.9 V 575.2 c 0 -2.6 1.2 -5.1 3.3 -6.8 2.1 -1.6 4.8 -2.2 7.4 -1.6 32.1 7.6 65.4 0.3 91.4 -20 3.1 -2.4 7.5 -2.4 10.6 0 18.8 14.7 42.3 22.8 66.2 22.8 h 0.3 c 23.9 0 47.4 -8.1 66.3 -22.8 3.1 -2.5 7.5 -2.5 10.7 0 18.8 14.7 42.3 22.8 66.2 22.8 h 0.2 c 28 0 54.6 -10.7 74.8 -30.1 a 8.7 8.7 0 0 1 12 0 c 22.1 21.3 52.4 32.2 83 29.7 2.4 -0.2 4.8 0.6 6.6 2.3 s 2.8 3.9 2.8 6.4 v 182 c 0 11.3 -4.4 21.9 -12.4 29.9 -8.1 8.1 -18.7 12.5 -30 12.5 zM 469.3 785 H 722.7 c 6.7 0 12.9 -2.6 17.6 -7.3 4.7 -4.7 7.3 -11 7.3 -17.6 v -173 h -0.4 c -29.5 0 -58.1 -10.5 -80.6 -29.5 -22.6 19.1 -50.9 29.5 -80.7 29.5 h -0.2 c -25.5 0 -50.7 -8 -71.6 -22.6 -20.9 14.6 -46 22.6 -71.6 22.6 h -0.4 c -25.5 0 -50.7 -8 -71.6 -22.6 -26.3 18.4 -58.4 25.9 -90 21.3 v 174.3 c 0 6.7 2.6 12.9 7.3 17.6 4.7 4.7 11 7.3 17.6 7.3 h 163.9 z" p-id="32241"></path><path d="M 685.2 219.6 c 19 0 36.5 10 46.2 26.3 L 817 389.6 h -0.2 c 23.2 45.9 4.9 101.9 -41 125.1 -38 19.2 -84.1 10.3 -112.1 -21.7 -19.2 20.3 -45.9 31.9 -73.8 31.8 -29.2 0 -56.9 -12.5 -76.2 -34.4 -19.3 21.9 -47 34.4 -76.2 34.4 -27.9 0 -54.6 -11.5 -73.8 -31.8 -33.9 38.6 -92.8 42.4 -131.4 8.5 -34.8 -30.6 -41.8 -82.2 -16.4 -121 l 72 -132.7 c 9.4 -17.4 27.6 -28.2 47.3 -28.2 h 350 z" fill="#99E5E2" p-id="32242"></path><path d="M 685.2 237.1 c 12.7 0 24.7 6.8 31.2 17.7 l 83.8 140.6 1 2 c 18.8 37.2 3.9 82.7 -33.3 101.6 -10.5 5.3 -22.3 8.2 -34.1 8.2 -21.8 0 -42.6 -9.4 -56.9 -25.8 l -12.7 -14.5 L 651 481 c -15.7 16.7 -37.9 26.3 -60.9 26.3 H 589.8 c -24.1 0 -47 -10.4 -62.9 -28.4 l -13.2 -15 -13.2 15 c -15.9 18.1 -38.8 28.4 -62.9 28.4 h -0.2 c -23 0 -45.2 -9.6 -60.9 -26.3 l -13.2 -14 -12.7 14.5 c -14.3 16.3 -35.1 25.7 -56.8 25.7 -18.3 0 -36 -6.7 -49.8 -18.8 -13.7 -12 -22.6 -28.6 -25 -46.6 -2.4 -18 1.7 -36.4 11.7 -51.6 l 0.4 -0.6 0.3 -0.6 72 -132.7 c 6.4 -11.7 18.6 -19 31.9 -19 h 349.9 m 0 -17.7 h -350 c -19.7 0 -37.9 10.8 -47.3 28.2 l -72 132.7 c -25.4 38.8 -18.4 90.4 16.4 121 17.7 15.5 39.6 23.2 61.4 23.2 25.9 0 51.6 -10.7 70 -31.7 19.1 20.3 45.8 31.8 73.7 31.8 h 0.2 c 29.1 0 56.8 -12.5 76.1 -34.4 19.2 21.9 46.9 34.4 76.1 34.4 H 590.1 c 27.9 0 54.5 -11.5 73.6 -31.8 18.1 20.7 43.9 31.8 70.1 31.8 14.3 0 28.7 -3.3 42 -10.1 45.9 -23.2 64.2 -79.3 41 -125.1 h 0.2 l -85.6 -143.7 c -9.7 -16.3 -27.3 -26.3 -46.2 -26.3 z" p-id="32243"></path><path d="M 555.9 802.1 h -83.6 c -10.3 0 -18.7 -8.4 -18.7 -18.7 v -135 c 0 -10.3 8.4 -18.7 18.7 -18.7 h 83.6 c 10.3 0 18.7 8.4 18.7 18.7 v 134.9 c 0.1 10.4 -8.3 18.8 -18.7 18.8 z" fill="#FF9999" p-id="32244"></path><path d="M 555.9 647 c 0.8 0 1.4 0.6 1.4 1.4 v 134.9 c 0 0.8 -0.6 1.4 -1.4 1.4 h -83.6 c -0.8 0 -1.4 -0.6 -1.4 -1.4 V 648.4 c 0 -0.8 0.6 -1.4 1.4 -1.4 h 83.6 m 0 -17.3 h -83.6 c -10.3 0 -18.7 8.4 -18.7 18.7 v 134.9 c 0 10.3 8.4 18.7 18.7 18.7 h 83.6 c 10.3 0 18.7 8.4 18.7 18.7 V 648.4 c 0.1 -10.3 -8.3 -18.7 -18.7 -18.7 z" p-id="32245"></path></svg>
                  {{ row.shopName }}
                </div>
                <div class="shop-name" v-else>--</div>
              </div>
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

    <!-- 履约内容编辑对话框（新增/编辑视频） -->
    <el-dialog
      v-model="videoEditDialogVisible"
      :title="videoEditForm.videoId ? $t('sampleBD.editVideo') : $t('sampleBD.addVideo')"
      width="450px"
    >
      <el-form :model="videoEditForm" label-width="100px" :rules="videoEditRules" ref="videoEditFormRef">
        <el-form-item :label="$t('sampleBD.videoAddress')" prop="videoLink">
          <el-input v-model="videoEditForm.videoLink" :placeholder="$t('sampleBD.videoLinkPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('sampleBD.streamCodeField')">
          <el-input v-model="videoEditForm.videoStreamCode" :placeholder="$t('sampleBD.streamCodePlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoEditDialogVisible = false">{{ $t('sampleBD.cancelBtn') }}</el-button>
        <el-button type="primary" @click="handleVideoEditSave" :loading="videoEditLoading">{{ $t('sampleBD.save') }}</el-button>
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
import { Plus, Loading, InfoFilled, Box, TrendCharts, User, Edit, Delete } from '@element-plus/icons-vue'
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
  videoLink: [{ required: true, message: () => t('sampleBD.videoLinkRequired'), trigger: 'blur' }]
}

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

// 复制视频链接到剪贴板
const copyVideoLink = async (videoLink) => {
  if (!videoLink) {
    ElMessage.warning(t('sampleBD.noVideoLinkToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(videoLink)
    ElMessage.success(t('sampleBD.copySuccess'))
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
      ElMessage.success(t('sampleBD.copySuccess'))
    } catch (e) {
      ElMessage.error(t('sampleBD.copyFailed'))
    }
    document.body.removeChild(textarea)
  }
}

// 复制投流码到剪贴板
const copyStreamCode = async (streamCode) => {
  if (!streamCode) {
    ElMessage.warning(t('sampleBD.noStreamCodeToCopy'))
    return
  }
  try {
    await navigator.clipboard.writeText(streamCode)
    ElMessage.success(t('sampleBD.copyStreamCodeSuccess'))
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
      ElMessage.success(t('sampleBD.copyStreamCodeSuccess'))
    } catch (e) {
      ElMessage.error(t('sampleBD.copyStreamCodeFailed'))
    }
    document.body.removeChild(textarea)
  }
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

      ElMessage.success(t('sampleBD.saveSuccess'))
      videoEditDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Save video error:', error)
      ElMessage.error(error.response?.data?.message || t('sampleBD.saveFailed'))
    } finally {
      videoEditLoading.value = false
    }
  })
}

// ★ 删除视频
const handleDeleteVideo = async (sample, video, index) => {
  try {
    await ElMessageBox.confirm(t('sampleBD.confirmDeleteVideo'), t('sampleBD.confirmDeleteVideo'), {
      type: 'warning'
    })
    await request.delete(`/videos/${video._id}`)
    ElMessage.success(t('sampleBD.deleteSuccess'))
    loadSamples()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete video error:', error)
      ElMessage.error(t('sampleBD.deleteFailed'))
    }
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
