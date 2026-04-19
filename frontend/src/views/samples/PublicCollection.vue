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
              }" @copy-field="onCopyField" />
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

          <!-- 视频信息 -->
          <el-table-column :label="$t('samplePublic.video')" width="200">
            <template #default="{ row }">
              <div class="video-info">
                <div v-if="row.videoLink || row.sampleImage">
                  <a v-if="row.videoLink" :href="row.videoLink" target="_blank" class="video-link">
                    <el-icon><VideoCamera /></el-icon>
                    {{ $t('samplePublic.viewVideo') }}
                  </a>
                  <el-image 
                    v-if="row.sampleImage" 
                    :src="row.sampleImage" 
                    :preview-src-list="[row.sampleImage]"
                    fit="cover"
                    class="sample-thumb"
                  >
                    <template #error>
                      <div class="image-error"><el-icon><Picture /></el-icon></div>
                    </template>
                  </el-image>
                </div>
                <div class="video-ad-info" v-if="row.videoStreamCode || row.isAdPromotion !== undefined">
                  <span class="stream-code" v-if="row.videoStreamCode">{{ row.videoStreamCode }}</span>
                  <el-switch
                    v-if="row.isAdPromotion !== undefined"
                    v-model="row.isAdPromotion"
                    @change="handleAdPromotionChange(row)"
                    size="small"
                    style="margin-left: 8px;"
                  />
                </div>
                <span v-if="!row.videoLink && !row.sampleImage && !row.videoStreamCode && row.isAdPromotion === undefined" class="no-video">--</span>
              </div>
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
        <el-tab-pane label="商家视角" name="businessView">
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
                    }" @copy-field="onCopyField" />
                  </template>
                </el-table-column>
                
                <!-- 样品申请数量 -->
                <el-table-column :label="$t('samplePublic.sampleApplications')" width="140">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><Document /></el-icon>
                      <span>{{ productStats[row._id]?.sampleCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 视频数量 -->
                <el-table-column :label="$t('samplePublic.videoCount')" width="120">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><VideoCamera /></el-icon>
                      <span>{{ productStats[row._id]?.videoCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 投流视频数量 -->
                <el-table-column :label="$t('samplePublic.adPromotionCount')" width="140">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><Star /></el-icon>
                      <span>{{ productStats[row._id]?.adPromotionCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 达人数 -->
                <el-table-column :label="$t('samplePublic.influencerCount')" width="120">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><User /></el-icon>
                      <span>{{ productStats[row._id]?.influencerCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 出单情况 -->
                <el-table-column :label="$t('samplePublic.orderGenerated')" width="120">
                  <template #default="{ row }">
                    <div class="stat-item">
                      <el-icon><Money /></el-icon>
                      <span>{{ productStats[row._id]?.orderGeneratedCount || 0 }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <!-- 操作 -->
                <el-table-column :label="$t('samplePublic.operations')" width="180" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" @click="viewProductDetails(row)">
                      {{ $t('samplePublic.viewDetails') }}
                    </el-button>
                    <el-button type="info" size="small" @click="viewProductVideos(row)">
                      {{ $t('samplePublic.viewVideos') }}
                    </el-button>
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
      </el-tabs>
    </div>

    <!-- 样品申请详情弹窗 - 重新设计为商务感 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="currentEditRow ? $t('samplePublic.sampleDetail') : $t('samplePublic.modifyShippingStatus')"
      width="700px"
      :close-on-click-modal="false"
      class="business-detail-dialog"
    >
      <div v-if="currentEditRow">
        <el-tabs v-model="detailActiveTab" class="business-tabs">
          <!-- 基础信息标签页 -->
          <el-tab-pane :label="$t('samplePublic.basicInfo')" name="basic">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samplePublic.tiktokIdDetail') || $t('samplePublic.tiktokId') }}：</span>
                  <span class="cell-value tiktok-id-text">{{ currentEditRow.influencerAccount || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samplePublic.applicationDate') }}：</span>
                  <span class="cell-value">{{ currentEditRow.date ? formatDate(currentEditRow.date) : '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell wide">
                  <span class="cell-label">{{ $t('samplePublic.productNameDetail') || $t('samplePublic.productName') }}：</span>
                  <span class="cell-value product-name">{{ currentEditRow.productName || '-' }}</span>
                </div>
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samplePublic.productIdDetail') || $t('samplePublic.productId') }}：</span>
                  <span class="cell-value">{{ currentEditRow.productId || '-' }}</span>
                </div>
              </div>
              
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samplePublic.productImage') }}：</span>
                  <div class="cell-value">
                    <el-image 
                      v-if="currentEditRow.productImage" 
                      :src="currentEditRow.productImage" 
                      style="width: 60px; height: 60px" 
                      fit="cover" 
                      :preview-src-list="[currentEditRow.productImage]" 
                    />
                    <span v-else>-</span>
                  </div>
                </div>
              </div>
              
              <!-- 投流信息 -->
              <div class="ad-promotion-section">
                <h4 class="section-title">{{ $t('samplePublic.adInfo') || '投流信息' }}</h4>
                <div class="ad-grid">
                  <div class="ad-item">
                    <span class="ad-label">{{ $t('samplePublic.adStatusDetail') || $t('samplePublic.adStatus') }}：</span>
                    <span class="ad-value">
                      <el-tag :type="currentEditRow.isAdPromotion ? 'success' : 'info'" size="large">
                        {{ currentEditRow.isAdPromotion ? $t('samplePublic.adPromoted') : $t('samplePublic.noAdPromoted') }}
                      </el-tag>
                    </span>
                  </div>
                  <div class="ad-item wide">
                    <span class="ad-label">{{ $t('samplePublic.streamCodeDetail') || $t('samplePublic.streamCode') }}：</span>
                    <span class="ad-value">{{ currentEditRow.videoStreamCode || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 寄样状态标签页 -->
          <el-tab-pane :label="$t('samplePublic.shippingStatus')" name="shipping">
            <div class="info-grid">
              <div class="info-row">
                <div class="info-cell">
                  <span class="cell-label">{{ $t('samplePublic.currentStatus') || '当前状态' }}：</span>
                  <span class="cell-value">
                    <el-tag :type="getSampleStatusType(currentEditRow.sampleStatus)" size="large">
                      {{ getSampleStatusText(currentEditRow.sampleStatus) }}
                    </el-tag>
                  </span>
                </div>
              </div>
              
              <!-- 状态编辑表单 -->
              <div class="status-edit-section">
                <h4 class="section-title">{{ $t('samplePublic.modifyShippingStatus') }}</h4>
                <el-form :model="sampleStatusForm" label-width="100px">
                  <el-form-item :label="$t('samplePublic.shippingStatusLabel')">
                    <el-select v-model="sampleStatusForm.sampleStatus" style="width: 100%" @change="handleStatusChange">
                      <el-option :label="$t('samplePublic.pending')" value="pending" />
                      <el-option :label="$t('samplePublic.sent')" value="sent" />
                      <el-option :label="$t('samplePublic.refused')" value="refused" />
                    </el-select>
                  </el-form-item>
                  <!-- 已寄样时显示物流信息 -->
                  <template v-if="sampleStatusForm.sampleStatus === 'sent'">
                    <el-form-item :label="$t('samplePublic.logisticsCompany')">
                      <el-select v-model="sampleStatusForm.logisticsCompany" :placeholder="$t('samplePublic.selectLogistics')" style="width: 100%">
                        <el-option
                          v-for="opt in logisticsCompanyOptions"
                          :key="opt._id"
                          :label="opt.name"
                          :value="opt.code"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item :label="$t('samplePublic.trackingNumber')">
                      <el-input 
                        v-model="sampleStatusForm.trackingNumber" 
                        :placeholder="$t('samplePublic.enterTrackingNumber')" 
                      />
                    </el-form-item>
                  </template>
                  <el-form-item v-if="sampleStatusForm.sampleStatus === 'refused'" :label="$t('samplePublic.refusalReason')">
                    <el-input v-model="sampleStatusForm.refusalReason" type="textarea" :rows="3" :placeholder="$t('samplePublic.enterRefusalReason')" />
                  </el-form-item>
                </el-form>
              </div>
              
              <!-- 当前物流信息（如果已寄样） -->
              <div class="current-shipping-info" v-if="currentEditRow.sampleStatus === 'sent'">
                <h4 class="section-title">{{ $t('samplePublic.currentShippingInfo') || '当前物流信息' }}</h4>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samplePublic.logisticsCompany') }}：</span>
                    <span class="detail-value">{{ currentEditRow.logisticsCompany || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samplePublic.trackingNumber') || $t('samplePublic.trackingNumberDetail') || '运单号' }}：</span>
                    <span class="detail-value">{{ currentEditRow.trackingNumber || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">{{ $t('samplePublic.shippingDate') || $t('samplePublic.shippingDateDetail') || '寄出日期' }}：</span>
                    <span class="detail-value">{{ currentEditRow.shippingDate ? formatDate(currentEditRow.shippingDate) : '-' }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 拒绝原因（如果已拒绝） -->
              <div class="current-refusal-info" v-if="currentEditRow.sampleStatus === 'refused' && currentEditRow.refusalReason">
                <h4 class="section-title">{{ $t('samplePublic.currentRefusalReason') || '当前拒绝原因' }}</h4>
                <div class="refusal-reason">
                  {{ currentEditRow.refusalReason }}
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
        
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Edit, ArrowDown, User, VideoCamera, Picture, Money, Location, CopyDocument, Document, Star } from '@element-plus/icons-vue'
import axios from 'axios'
import ProductCell from '@/components/ProductCell.vue'
import InfluencerCell from '@/components/InfluencerCell.vue'

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
const activeTab = ref('sampleList') // 页签：sampleList, businessView

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

// 搜索表单
const searchForm = reactive({
  sampleStatus: 'pending', // 默认待审核
  isOrderGenerated: null,
  date: '',
  productName: '',
  influencerAccount: '',  // 达人ID
  productId: ''           // 商品ID
})

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

// 加载商家视角数据
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
    
    // 2. 获取店铺的产品列表
    const productParams = {
      keyword: businessSearchForm.productName || undefined,
      categoryId: businessSearchForm.categoryId || undefined,
      page: businessPagination.page,
      limit: businessPagination.limit
    }
    
    // 移除空值参数
    Object.keys(productParams).forEach(key => {
      if (productParams[key] === undefined) {
        delete productParams[key]
      }
    })
    
    const productsRes = await axios.get(`${API_BASE}/public/products`, { params: productParams })
    
    if (productsRes.data.success) {
      // 过滤出当前店铺的产品（基于识别码）
      const allProducts = productsRes.data.data.products || []
      // 由于public/products API可能返回所有店铺的产品，我们需要在前端过滤
      // 更好的做法是后端支持shopId参数，但当前API可能不支持
      // 暂时显示所有产品，后续优化
      products.value = allProducts
      businessPagination.total = productsRes.data.data.pagination?.total || 0
      
      // 3. 为每个产品获取统计信息（模拟数据，实际需要后端API支持）
      for (const product of products.value) {
        // 模拟统计数据
        const videoStats = {
          sampleCount: Math.floor(Math.random() * 20), // 模拟样品申请数量
          videoCount: Math.floor(Math.random() * 10), // 模拟视频数量
          adPromotionCount: Math.floor(Math.random() * 5), // 模拟投流数量
          influencerCount: Math.floor(Math.random() * 8), // 模拟达人数
          orderGeneratedCount: Math.floor(Math.random() * 15) // 模拟出单数量
        }
        
        productStats.value[product._id] = videoStats
      }
      
      businessViewError.value = null
    } else {
      businessViewError.value = productsRes.data.message || '加载产品列表失败'
    }
  } catch (err) {
    console.error('Load business view data error:', err)
    businessViewError.value = err.response?.data?.message || t('samplePublic.networkError')
  } finally {
    businessViewLoading.value = false
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
const handleAdPromotionChange = async (row) => {
  try {
    const identificationCode = getIdentificationCode()

    const res = await axios.put(`${API_BASE}/public/samples/batch`, null, {
      params: {
        s: identificationCode,
        isAdPromotion: row.isAdPromotion,
        sampleIds: row._id
      }
    })

    if (res.data.success) {
      ElMessage.success(t('samplePublic.updateSuccess'))
    } else {
      ElMessage.error(res.data.message)
      // 回滚状态
      row.isAdPromotion = !row.isAdPromotion
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || t('samplePublic.updateFailed'))
    // 回滚状态
    row.isAdPromotion = !row.isAdPromotion
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

// 查看产品详情
const viewProductDetails = (product) => {
  ElMessage.info(`查看产品详情: ${product.name}`)
  // TODO: 实现产品详情弹窗
}

// 查看产品视频
const viewProductVideos = (product) => {
  ElMessage.info(`查看产品视频: ${product.name}`)
  // TODO: 实现产品视频列表弹窗
}

// 监听页签切换
watch(activeTab, (newTab) => {
  if (newTab === 'businessView') {
    loadBusinessViewData()
  }
})

onMounted(() => {
  loadSamples()
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
</style>
