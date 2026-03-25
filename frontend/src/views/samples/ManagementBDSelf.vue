<template>
  <div class="sample-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <div class="header-actions">
            <el-button type="success" @click="showCreateDialog" v-if="hasPermission('samples-bd:create')">
              <el-icon><Plus /></el-icon>
              新增
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="TikTok ID">
          <el-input
            v-model="searchForm.influencerAccount"
            placeholder="TikTok ID"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="商品名称">
          <el-input
            v-model="searchForm.productName"
            placeholder="商品名称"
            clearable
            style="width: 150px"
          />
        </el-form-item>

        <el-form-item label="申请日期">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            placeholder="选择日期"
            clearable
            style="width: 150px"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadSamples">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
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
          label="TikTok ID"
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
                  <span class="tiktok-id-cell clickable" @click="viewSampleDetail(row)">{{ row.influencerAccount || '--' }}</span>
                  <el-tag v-if="row.isBlacklistedInfluencer" type="danger" size="small" style="margin-left: 4px">黑名单</el-tag>
                </div>
              </template>
              <div v-if="popoverLoading" class="popover-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>加载中...</span>
              </div>
              <div v-else-if="popoverInfluencer" class="influencer-popover">
                <el-descriptions :column="1" size="small">
                  <el-descriptions-item label="TikTok ID">
                    <span class="tiktok-id-text">{{ popoverInfluencer.tiktokId }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="名称">{{ popoverInfluencer.tiktokName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="最新粉丝">{{ formatNumber(popoverInfluencer.latestFollowers) }}</el-descriptions-item>
                  <el-descriptions-item label="最新GMV">{{ popoverInfluencer.latestGmv || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="状态">
                    <el-tag :type="popoverInfluencer.status === 'enabled' ? 'success' : 'info'" size="small">
                      {{ popoverInfluencer.status === 'enabled' ? '启用' : '禁用' }}
                    </el-tag>
                    <el-tag v-if="popoverInfluencer.isBlacklisted" type="danger" size="small" style="margin-left: 4px">黑名单</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div v-else class="popover-empty">
                <span>未找到达人信息</span>
              </div>
            </el-popover>
          </template>
        </el-table-column>

        <!-- 寄样状态 - 锁定左边 -->
        <el-table-column
          label="寄样状态"
          width="160"
          fixed="left"
        >
          <template #default="{ row }">
            <div class="sample-status">
              <el-tag :type="getSampleStatusType(row.sampleStatus)" size="small">
                {{ getSampleStatusText(row.sampleStatus) }}
              </el-tag>
              <div v-if="row.sampleStatus === 'refused' && row.refusalReason" class="refusal-reason">
                原因: {{ row.refusalReason }}
              </div>
              <div v-if="row.trackingNumber" class="tracking-no">
                {{ row.trackingNumber }}
              </div>
              <div v-if="row.shippingDate" class="shipping-date">
                {{ formatDate(row.shippingDate) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 履约情况 -->
        <el-table-column
          label="履约情况"
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
                    {{ row.isOrderGenerated ? '已出单' : '未出单' }}
                  </el-tag>
                  <span v-if="row.isOrderGenerated && row.orderCount" class="order-count-badge">
                    {{ row.orderCount > 99 ? '...' : row.orderCount }}
                  </span>
                </span>
                <el-icon class="edit-icon" @click.stop="openFulfillmentDialog(row)"><Edit /></el-icon>
              </div>
              <div v-if="row.videoLink" class="video-link">
                <el-link :href="row.videoLink" target="_blank" type="primary">
                  视频链接
                </el-link>
              </div>
              <div v-if="row.fulfillmentUpdatedAt" class="update-info">
                {{ row.fulfillmentUpdatedBy?.realName || row.fulfillmentUpdatedBy?.username || '未知' }} {{ formatDateTime(row.fulfillmentUpdatedAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 投流信息 - 带编辑功能 -->
        <el-table-column
          label="投流信息"
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
                  {{ row.isAdPromotion ? '已投流' : '未投流' }}
                </el-tag>
                <span v-if="row.adPromotionTime">{{ formatDate(row.adPromotionTime) }}</span>
              </div>
              <div v-if="row.adPromotionUpdatedAt" class="update-info">
                {{ row.adPromotionUpdatedBy?.realName || row.adPromotionUpdatedBy?.username || '未知' }} {{ formatDateTime(row.adPromotionUpdatedAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 申请日期 - 不再锁定 -->
        <el-table-column
          label="申请日期"
          width="120"
          prop="date"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.date ? formatDate(row.date) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="商品信息"
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
          label="达人数据"
          width="120"
        >
          <template #default="{ row }">
            <div class="influencer-data">
              <el-tag type="info" size="small">粉丝</el-tag>
              <span class="follower-count">{{ formatNumber(row.followerCount) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="收货信息"
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
          label="收样日期"
          width="120"
          prop="receivedDate"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text">{{ row.receivedDate ? formatDate(row.receivedDate) : '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="120"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
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

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentSample?.isBlacklistedInfluencer ? '详情（黑名单达人）' : '详情'"
      width="900px"
      class="business-detail-dialog"
    >
      <div v-if="currentSample" class="detail-content">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentSample.isBlacklistedInfluencer"
          title="该样品申请关联的达人已被列入黑名单"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 24px"
        />

        <!-- 基础信息卡片 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <el-icon><InfoFilled /></el-icon>
              <span>基础信息</span>
            </div>
          </template>
          <el-row :gutter="24">
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">TikTok ID</div>
                <div class="info-value tiktok-id-text">{{ currentSample.influencerAccount || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">申请日期</div>
                <div class="info-value">{{ currentSample.date ? formatDate(currentSample.date) : '-' }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">商品名称</div>
                <div class="info-value product-name">{{ currentSample.productName || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">商品ID</div>
                <div class="info-value">{{ currentSample.productId || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">样品图片</div>
                <el-image v-if="currentSample.sampleImage" :src="currentSample.sampleImage" style="width: 60px; height: 60px" fit="cover" :preview-src-list="[currentSample.sampleImage]" />
                <span v-else class="info-value">-</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">粉丝数</div>
                <div class="info-value highlight-value">{{ formatNumber(currentSample.followerCount) }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">GMV</div>
                <div class="info-value">{{ currentSample.gmv || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">收货信息</div>
                <div class="info-value shipping-value">{{ currentSample.shippingInfo || '-' }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 寄样信息卡片 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <el-icon><Box /></el-icon>
              <span>寄样信息</span>
            </div>
          </template>
          <el-row :gutter="24">
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">寄样状态</div>
                <div class="info-value">
                  <el-tag :type="getSampleStatusType(currentSample.sampleStatus)" size="large">
                    {{ getSampleStatusText(currentSample.sampleStatus) }}
                  </el-tag>
                </div>
              </div>
            </el-col>
            <el-col v-if="currentSample.sampleStatus === 'refused' && currentSample.refusalReason" :span="12">
              <div class="info-item">
                <div class="info-label">不合作原因</div>
                <div class="info-value refusal-reason-detail">{{ currentSample.refusalReason }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">发货日期</div>
                <div class="info-value">{{ currentSample.shippingDate ? formatDate(currentSample.shippingDate) : '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">物流单号</div>
                <div class="info-value">{{ currentSample.trackingNumber || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">物流公司</div>
                <div class="info-value">{{ currentSample.logisticsCompany || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">收样日期</div>
                <div class="info-value">{{ currentSample.receivedDate ? formatDate(currentSample.receivedDate) : '-' }}</div>
              </div>
            </el-col>
            <el-col v-if="currentSample.sampleStatusUpdatedAt" :span="12">
              <div class="info-item">
                <div class="info-label">状态更新</div>
                <div class="info-value update-info-detail">
                  {{ currentSample.sampleStatusUpdatedBy?.realName || currentSample.sampleStatusUpdatedBy?.username || '-' }}
                  <span>{{ formatDateTime(currentSample.sampleStatusUpdatedAt) }}</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 履约信息卡片 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span>履约信息</span>
            </div>
          </template>
          <el-row :gutter="24">
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">出单状态</div>
                <div class="info-value">
                  <el-tag :type="currentSample.isOrderGenerated ? 'success' : 'warning'" size="large">
                    {{ currentSample.isOrderGenerated ? '已出单' : '未出单' }}
                  </el-tag>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">履约时间</div>
                <div class="info-value">{{ currentSample.fulfillmentTime || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">视频链接</div>
                <div class="info-value">
                  <el-link v-if="currentSample.videoLink" :href="currentSample.videoLink" target="_blank" type="primary">
                    查看视频
                  </el-link>
                  <span v-else>-</span>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <div class="info-label">履约更新</div>
                <div class="info-value update-info-detail">
                  {{ currentSample.fulfillmentUpdatedBy?.realName || currentSample.fulfillmentUpdatedBy?.username || '-' }}
                  <span v-if="currentSample.fulfillmentUpdatedAt">{{ formatDateTime(currentSample.fulfillmentUpdatedAt) }}</span>
                </div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">投流信息</div>
                <div class="info-value">
                  <span class="stream-label">Stream Code: </span>
                  <span class="stream-value">{{ currentSample.videoStreamCode || '-' }}</span>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">投流状态</div>
                <div class="info-value">
                  <el-tag :type="currentSample.isAdPromotion ? 'success' : 'info'" size="large">
                    {{ currentSample.isAdPromotion ? '已投流' : '未投流' }}
                  </el-tag>
                </div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">投流时间</div>
                <div class="info-value">{{ currentSample.adPromotionTime ? formatDate(currentSample.adPromotionTime) : '-' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <div class="info-label">投流更新</div>
                <div class="info-value update-info-detail">
                  {{ currentSample.adPromotionUpdatedBy?.realName || currentSample.adPromotionUpdatedBy?.username || '-' }}
                  <span v-if="currentSample.adPromotionUpdatedAt">{{ formatDateTime(currentSample.adPromotionUpdatedAt) }}</span>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 达人信息卡片 -->
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>达人信息</span>
            </div>
          </template>
          <div v-if="influencerDetail">
            <el-row :gutter="24">
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">TikTok ID</div>
                  <div class="info-value tiktok-id-text">{{ influencerDetail.tiktokId }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">TikTok名称</div>
                  <div class="info-value">{{ influencerDetail.tiktokName || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">真实姓名</div>
                  <div class="info-value">{{ influencerDetail.realName || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">常用昵称</div>
                  <div class="info-value">{{ influencerDetail.nickname || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">最新粉丝</div>
                  <div class="info-value highlight-value">{{ formatNumber(influencerDetail.latestFollowers) }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">最新GMV</div>
                  <div class="info-value">{{ influencerDetail.latestGmv || '-' }}</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">状态</div>
                  <div class="info-value">
                    <el-tag :type="influencerDetail.status === 'enabled' ? 'success' : 'info'" size="large">
                      {{ influencerDetail.status === 'enabled' ? '启用' : '禁用' }}
                    </el-tag>
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <div class="info-label">黑名单状态</div>
                  <div class="info-value">
                    <el-tag v-if="influencerDetail.isBlacklisted" type="danger" size="large">黑名单</el-tag>
                    <span v-else>正常</span>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
          <el-empty v-else description="未找到达人信息" :image-size="80" />
        </el-card>

        <!-- 底部时间信息 -->
        <div class="bottom-info">
          <span>创建时间：{{ currentSample.createdAt ? formatDate(currentSample.createdAt) : '-' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 新增对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新增"
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
            <el-form-item label="申请日期" prop="date">
              <el-date-picker
                v-model="createForm.date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品信息" required>
          <el-select
            v-model="createForm.productId"
            filterable
            remote
            placeholder="搜索商品名称或ID"
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

        <el-form-item label="TikTok ID" prop="influencerAccount" class="tiktok-label">
          <el-input v-model="createForm.influencerAccount" placeholder="TikTok ID" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="粉丝数" prop="followerCount">
              <el-input-number v-model="createForm.followerCount" :min="0" :controls="false" placeholder="粉丝数" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="GMV" prop="gmv">
              <el-input-number v-model="createForm.gmv" :min="0" :precision="2" :controls="false" placeholder="GMV" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="收货信息" prop="shippingInfo">
          <el-input
            v-model="createForm.shippingInfo"
            type="textarea"
            :rows="2"
            placeholder="请输入收货信息"
          />
        </el-form-item>

        <el-form-item label="样品图片">
          <el-input v-model="createForm.sampleImage" placeholder="图片URL" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">确定</el-button>
      </template>
    </el-dialog>

    <!-- 投流信息编辑对话框 -->
    <el-dialog
      v-model="adPromotionDialogVisible"
      title="维护投流信息"
      width="400px"
    >
      <el-form :model="adPromotionForm" label-width="80px">
        <el-form-item label="投流码">
          <el-input v-model="adPromotionForm.videoStreamCode" placeholder="请输入投流码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adPromotionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdPromotionSave" :loading="adPromotionLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 履约信息编辑对话框 -->
    <el-dialog
      v-model="fulfillmentDialogVisible"
      title="维护履约信息"
      width="400px"
    >
      <el-form :model="fulfillmentForm" label-width="80px">
        <el-form-item label="视频地址">
          <el-input v-model="fulfillmentForm.videoLink" placeholder="请输入视频链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fulfillmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleFulfillmentSave" :loading="fulfillmentLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

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
  productName: '',
  productId: '',
  influencerAccount: '',
  followerCount: 0,
  gmv: 0,
  salesman: '',
  shippingInfo: '',
  sampleImage: '',
  isSampleSent: false,
  trackingNumber: '',
  shippingDate: '',
  logisticsCompany: '',
  isOrderGenerated: false
})

const createRules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  influencerAccount: [{ required: true, message: '请输入TikTok ID', trigger: 'blur' }]
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
    pending: '待审核',
    shipping: '寄样中',
    sent: '已寄样',
    refused: '不合作'
  }
  return textMap[status] || '待审核'
}

const loadSamples = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      companyId: userStore.companyId,
      ...searchForm,
      // 固定过滤当前用户（传username，不是realName，因为数据库存的是username）
      salesmanId: userStore.user?.username || userStore.username
    }
    const res = await request.get('/samples', { params })
    samples.value = res.samples
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('Load samples error:', error)
    ElMessage.error('加载数据失败')
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
    cooperationProducts.value = res.data?.products || res.products || []
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
    cooperationProducts.value = res.data?.products || res.products || []
  } catch (error) {
    console.error('搜索商品失败:', error)
  } finally {
    productLoading.value = false
  }
}

const handleProductSelect = (productId) => {
  const product = cooperationProducts.value.find(p => p._id === productId)
  if (product) {
    createForm.productName = product.name || product.productName || ''
    createForm.productId = product._id
  }
}

const showCreateDialog = () => {
  const currentUser = userStore.user
  Object.assign(createForm, {
    date: getTodayDate(),
    productName: '',
    productId: '',
    influencerAccount: '',
    followerCount: 0,
    gmv: 0,
    salesman: currentUser?.username || currentUser?.realName || '',
    shippingInfo: '',
    sampleImage: '',
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

    // 先检查是否为黑名单达人
    try {
      const blacklistRes = await request.get(`/influencer-managements/blacklist/check/${createForm.influencerAccount}`, {
        params: { companyId: userStore.companyId }
      })
      if (blacklistRes.isBlacklisted) {
        ElMessage.error('该达人被列为黑名单，减少接触！')
        return
      }
    } catch (blError) {
      console.error('检查黑名单失败:', blError)
    }

    creating.value = true
    try {
      await request.post('/samples', createForm)
      ElMessage.success('创建成功')
      createDialogVisible.value = false
      loadSamples()
    } catch (error) {
      console.error('Create sample error:', error)
      ElMessage.error(error.response?.data?.message || '创建失败')
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
    await request.put(`/samples/${adPromotionForm._id}`, {
      videoStreamCode: adPromotionForm.videoStreamCode
    })
    ElMessage.success('保存成功')
    adPromotionDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save ad promotion error:', error)
    ElMessage.error('保存失败')
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

// 保存履约信息
const handleFulfillmentSave = async () => {
  fulfillmentLoading.value = true
  try {
    await request.put(`/samples/${fulfillmentForm._id}`, {
      videoLink: fulfillmentForm.videoLink
    })
    ElMessage.success('保存成功')
    fulfillmentDialogVisible.value = false
    loadSamples()
  } catch (error) {
    console.error('Save fulfillment error:', error)
    ElMessage.error('保存失败')
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

onMounted(() => {
  loadSamples()
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
</style>
