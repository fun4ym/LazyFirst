<template>
  <div class="activities-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('activities:create')">
            <el-icon><Plus /></el-icon>
            新建活动
          </el-button>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="活动名称">
          <el-input
            v-model="searchForm.name"
            placeholder="活动名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="活动类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="自发起" value="self_initiated" />
            <el-option label="商家发起" value="merchant_initiated" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待发布" value="pending" />
            <el-option label="即将开始" value="upcoming" />
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadActivities">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="activities" v-loading="loading" stripe>
        <el-table-column prop="tikTokActivityId" label="TikTok活动ID" width="180" fixed="left" class-name="tiktok-id-label" />
        <el-table-column prop="name" label="活动名称" width="200" fixed="left" />
        <el-table-column prop="type" label="活动类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="参与商品" width="120" align="center">
          <template #default="{ row }">
            <el-popover
              placement="right"
              :width="600"
              trigger="hover"
              @show="loadActivityProducts(row)"
            >
              <template #reference>
                <el-button link type="primary" @click="goToProductPage(row)">
                  {{ productCounts[row._id] || 0 }}
                </el-button>
              </template>
              <div v-if="loadingProducts[row._id]" class="loading-tip">加载中...</div>
              <div v-else-if="activityProducts[row._id]?.length > 0">
                <el-table :data="getPaginatedProducts(row)" size="small" max-height="300">
                  <el-table-column label="商品ID" width="180">
                    <template #default="{ row: product }">
                      <el-button link type="primary" @click="viewProductDetail(product)">
                        {{ product.tiktokProductId || product.productId || product._id }}
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column prop="name" label="商品名称" min-width="150" show-overflow-tooltip />
                  <el-table-column label="店铺" width="100" show-overflow-tooltip>
                    <template #default="{ row: product }">
                      {{ product.shopId?.shopName || '-' }}
                    </template>
                  </el-table-column>
                </el-table>
                <div class="pagination-container">
                  <el-pagination
                    small
                    :current-page="productPagination[row._id]?.page || 1"
                    :page-size="10"
                    :total="productCounts[row._id] || 0"
                    layout="prev, pager, next, total"
                    @current-change="(page) => handleProductPageChange(row, page)"
                  />
                </div>
              </div>
              <div v-else class="empty-tip">暂无参与商品</div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="creatorName" label="创建人" width="120" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)" v-if="hasPermission('activities:read')">详情</el-button>
            <el-button link type="primary" @click="showEditDialog(row)" v-if="hasPermission('activities:update')">编辑</el-button>
            <el-button link type="success" @click="showImportDialog(row)" v-if="hasPermission('admin')">导入商品</el-button>
            <el-button link type="danger" @click="handleDelete(row)" v-if="hasPermission('activities:delete')">删除</el-button>
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
      :title="isEdit ? '编辑活动' : '新建活动'"
      width="700px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="TikTok活动ID" class="tiktok-id-label">
          <el-input v-model="form.tikTokActivityId" placeholder="TikTok活动ID" class="tiktok-id-input" />
        </el-form-item>

        <el-form-item label="活动名称" prop="name">
          <el-input v-model="form.name" placeholder="活动名称" />
        </el-form-item>

        <el-form-item label="活动类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="self_initiated">自发起</el-radio>
            <el-radio value="merchant_initiated">商家发起</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endDate">
              <el-date-picker
                v-model="form.endDate"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 活动配置 -->
        <el-divider content-position="left">活动配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="TAP专属链">
              <el-input v-model="form.tapLink" placeholder="TAP专属链接" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="寄样方式">
              <el-select v-model="form.sampleMethod" placeholder="选择寄样方式" clearable style="width: 100%">
                <el-option label="线上" value="线上" />
                <el-option label="线下" value="线下" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合作国家">
              <el-select v-model="form.cooperationCountry" placeholder="选择合作国家" clearable style="width: 100%">
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

        <!-- 达人要求 -->
        <el-divider content-position="left">达人要求</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="GMV">
              <el-input-number v-model="form.requirementGmv" :min="0" placeholder="GMV" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="货币单位">
              <el-select v-model="form.gmvCurrency" placeholder="请选择货币" style="width: 100%">
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
            <el-form-item label="月销售件数">
              <el-input-number v-model="form.requirementMonthlySales" :min="0" placeholder="月销售件数" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="粉丝数">
              <el-input-number v-model="form.requirementFollowers" :min="0" placeholder="粉丝数" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月均播放量">
              <el-input-number v-model="form.requirementAvgViews" :min="0" placeholder="月均播放量" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="要求说明">
          <el-input v-model="form.requirementRemark" type="textarea" :rows="2" placeholder="达人要求说明" />
        </el-form-item>

        <!-- 佣金配置 - 推广时 -->
        <el-divider content-position="left">佣金配置 - 推广时</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="给达人(%)">
              <el-input-number v-model="form.promotionInfluencerRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原本(%)">
              <el-input-number v-model="form.promotionOriginalRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="公司自留(%)">
              <el-input-number v-model="form.promotionCompanyRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 佣金配置 - 投广告时 -->
        <el-divider content-position="left">佣金配置 - 投广告时</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="给达人(%)">
              <el-input-number v-model="form.adInfluencerRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="原本(%)">
              <el-input-number v-model="form.adOriginalRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="公司自留(%)">
              <el-input-number v-model="form.adCompanyRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="活动描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="活动描述" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="活动详情" width="1000px">
      <div v-if="currentActivity">
        <!-- 活动信息 -->
        <h4 class="section-title">活动信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="TikTok活动ID">
            {{ currentActivity.tikTokActivityId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="活动名称">
            {{ currentActivity.name }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 冗余信息 -->
        <h4 class="section-title">冗余信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="活动类型">
            <el-tag :type="getTypeTagType(currentActivity.type)">
              {{ getTypeText(currentActivity.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentActivity.status)">
              {{ getStatusText(currentActivity.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatDate(currentActivity.startDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            {{ formatDate(currentActivity.endDate) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 其他信息 -->
        <h4 class="section-title">其他信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="合作中心">
            {{ currentActivity.partnerCenter || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="预算">
            ฿{{ formatMoney(currentActivity.budget) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 活动配置 -->
        <h4 class="section-title">活动配置</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="TAP专属链">
            {{ currentActivity.tapLink || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="寄样方式">
            {{ currentActivity.sampleMethod || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="合作国家">
            {{ currentActivity.cooperationCountry || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 达人要求 -->
        <h4 class="section-title">达人要求</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="GMV">
            {{ currentActivity.requirementGmv || 0 }} {{ currentActivity.gmvCurrency || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="月销件数">
            {{ currentActivity.requirementMonthlySales || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="粉丝数">
            {{ currentActivity.requirementFollowers || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="月均播放量">
            {{ currentActivity.requirementAvgViews || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="要求说明" :span="2">
            {{ currentActivity.requirementRemark || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 佣金配置 - 推广时 -->
        <h4 class="section-title">佣金配置 - 推广时</h4>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="给达人(%)">
            {{ currentActivity.promotionInfluencerRate || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="原本(%)">
            {{ currentActivity.promotionOriginalRate || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="公司自留(%)">
            {{ currentActivity.promotionCompanyRate || 0 }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 佣金配置 - 投广告时 -->
        <h4 class="section-title">佣金配置 - 投广告时</h4>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="给达人(%)">
            {{ currentActivity.adInfluencerRate || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="原本(%)">
            {{ currentActivity.adOriginalRate || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="公司自留(%)">
            {{ currentActivity.adCompanyRate || 0 }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 数据信息 -->
        <h4 class="section-title">数据信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="创建人">
            {{ currentActivity.creatorName || currentActivity.creator?.realName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(currentActivity.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 变更历史 -->
        <h4 class="section-title">
          变更历史
          <el-button link type="primary" @click="loadHistory" style="margin-left: 10px">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </h4>
        <el-table :data="histories" stripe v-loading="historyLoading">
          <el-table-column prop="action" label="操作类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getActionType(row.action)">
                {{ getActionText(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="changedByName" label="操作人" width="120" />
          <el-table-column prop="changes" label="变更内容" min-width="200">
            <template #default="{ row }">
              <el-tag
                v-for="(value, key) in row.changes"
                :key="key"
                style="margin-right: 5px; margin-bottom: 5px"
                size="small"
              >
                {{ getFieldName(key) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="操作时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 商品详情对话框 -->
    <el-dialog v-model="productDetailVisible" title="商品详情" width="900px" :close-on-click-modal="false" class="product-detail-dialog">
      <div v-if="currentProduct" class="detail-wrapper">
        <!-- 商品头部 -->
        <div class="detail-head">
          <div class="head-main">
            <span class="head-id">{{ currentProduct.tiktokProductId || currentProduct.productId || '-' }}</span>
            <h3 class="head-title">{{ currentProduct.name || currentProduct.productName || '-' }}</h3>
          </div>
          <el-tag :type="currentProduct.status === 'active' ? 'success' : 'info'">{{ currentProduct.status === 'active' ? '启用' : '禁用' }}</el-tag>
        </div>

        <!-- 基本信息 -->
        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item label="SKU">{{ currentProduct.sku || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺">{{ currentProduct.shopId?.shopName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品类目">{{ currentProduct.productCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="广场佣金率">{{ currentProduct.squareCommissionRate ? (currentProduct.squareCommissionRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="售价" class-name="price-cell">
            {{ currentProduct.sellingPrice ? currentProduct.sellingPrice + ' ' + (currentProduct.currency || 'USD') : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="价格区间" :span="2" class-name="price-cell">
            {{ currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0 ? currentProduct.priceRangeMin : '-' }}
            {{ (currentProduct.priceRangeMin || currentProduct.priceRangeMin === 0) && (currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0) ? ' - ' : '' }}
            {{ currentProduct.priceRangeMax || currentProduct.priceRangeMax === 0 ? currentProduct.priceRangeMax + ' ' + (currentProduct.currency || 'USD') : '' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 商品说明 -->
        <div v-if="currentProduct.productIntro || currentProduct.referenceVideo || currentProduct.sellingPoints" class="detail-section">
          <div class="section-title">商品说明</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-if="currentProduct.productIntro" label="简介">{{ currentProduct.productIntro }}</el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.referenceVideo" label="参考视频">
              <a :href="currentProduct.referenceVideo" target="_blank" class="link-text">{{ currentProduct.referenceVideo }}</a>
            </el-descriptions-item>
            <el-descriptions-item v-if="currentProduct.sellingPoints" label="卖点">{{ currentProduct.sellingPoints }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 参与活动 -->
        <div v-if="currentProduct.activityConfigs && currentProduct.activityConfigs.length > 0" class="detail-section">
          <div class="section-title">参与活动 <span class="section-count">({{ currentProduct.activityConfigs.length }})</span></div>
          <div v-for="(ac, index) in currentProduct.activityConfigs" :key="index" class="activity-block">
            <div class="activity-title">
              <span class="activity-tag">{{ ac.activityId?.tikTokActivityId || '-' }}</span>
              <span class="activity-name">{{ ac.activityId?.name || '-' }}</span>
            </div>
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="活动链接" :span="3">
                <a v-if="ac.activityLink" :href="ac.activityLink" target="_blank" class="link-text">{{ ac.activityLink }}</a>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="GMV">{{ ac.requirementGmv ? ac.requirementGmv + ' ' + (ac.gmvCurrency || currentProduct.currency || 'USD') : '-' }}</el-descriptions-item>
              <el-descriptions-item label="月销件数">{{ ac.requirementMonthlySales || 0 }}</el-descriptions-item>
              <el-descriptions-item label="粉丝数">{{ ac.requirementFollowers || 0 }}</el-descriptions-item>
              <el-descriptions-item label="月均播放">{{ ac.requirementAvgViews || 0 }}</el-descriptions-item>
              <el-descriptions-item label="寄样方式">{{ ac.sampleMethod || '-' }}</el-descriptions-item>
              <el-descriptions-item label="合作国家">{{ ac.cooperationCountry || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="commission-row">
              <div class="commission-item">
                <span class="commission-label">推广佣金</span>
                <div class="commission-rates">
                  <span>达人 {{ ac.promotionInfluencerRate ? (ac.promotionInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>原本 {{ ac.promotionOriginalRate ? (ac.promotionOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>公司 {{ ac.promotionCompanyRate ? (ac.promotionCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
              <div class="commission-item">
                <span class="commission-label">广告佣金</span>
                <div class="commission-rates">
                  <span>达人 {{ ac.adInfluencerRate ? (ac.adInfluencerRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>原本 {{ ac.adOriginalRate ? (ac.adOriginalRate * 100).toFixed(2) + '%' : '-' }}</span>
                  <span>公司 {{ ac.adCompanyRate ? (ac.adCompanyRate * 100).toFixed(2) + '%' : '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-section">
          <el-empty description="暂无参与活动" :image-size="60" />
        </div>
      </div>
    </el-dialog>

    <!-- 导入商品对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入TikTok商品"
      width="600px"
    >
      <div class="import-tips">
        <p><strong>操作步骤：</strong></p>
        <ol>
          <li>进入 TikTok Shop Partner Center → 达人匹配 → 服务商合作</li>
          <li>点击「查看详情」进入合作详情页面</li>
          <li>在「已通过」页签中找到「导出链接」</li>
          <li>下载Excel文件并上传到此处</li>
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
          上传Excel文件
        </el-button>
        <template #tip>
          <div class="upload-tip">支持 .xlsx, .xls 格式</div>
        </template>
      </el-upload>

      <div v-if="importLoading" class="import-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在导入，请稍候...
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importLoading">确定导入</el-button>
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
import { Plus, Refresh, Upload, Loading } from '@element-plus/icons-vue'
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
    { required: true, message: '请输入活动名称', trigger: 'blur' }
  ],
  startDate: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ]
}

const formatMoney = (value) => {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const getTypeText = (type) => {
  const texts = {
    self_initiated: '自发起',
    merchant_initiated: '商家发起'
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
    pending: '待发布',
    upcoming: '即将开始',
    active: '进行中',
    ended: '已结束'
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
    create: '创建',
    update: '更新',
    delete: '删除',
    status_change: '状态变更'
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

const getFieldName = (key) => {
  const names = {
    tikTokActivityId: 'TikTok活动ID',
    name: '活动名称',
    type: '活动类型',
    status: '状态',
    startDate: '开始时间',
    endDate: '结束时间',
    budget: '预算',
    description: '活动描述',
    partnerCenter: '合作中心'
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
    ElMessage.warning('请先选择Excel文件')
    return
  }

  if (!currentImportActivity.value?.tikTokActivityId) {
    ElMessage.warning('该活动未设置TikTok活动ID，无法导入')
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

    ElMessage.success(res.message || '导入成功')
    importDialogVisible.value = false
    // 刷新商品数量
    loadProductCounts()
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error(error.response?.data?.message || '导入失败')
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
    sampleMethod: '',
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
        ElMessage.success('更新成功')
      } else {
        await request.post('/activities', data)
        ElMessage.success('创建成功')
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
    await ElMessageBox.confirm(`确定要删除活动"${row.name}"吗？`, '提示', {
      type: 'warning'
    })
    await request.delete(`/activities/${row._id}`)
    ElMessage.success('删除成功')
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
    console.error('加载活动商品数量失败:', error)
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
    activityProducts.value = {
      ...activityProducts.value,
      [activity._id]: res.data?.products || res.products || []
    }
    productPagination.value = {
      ...productPagination.value,
      [activity._id]: { page: 1, total: res.data?.pagination?.total || res.total || 0 }
    }
  } catch (error) {
    console.error('加载活动商品失败:', error)
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
    console.error('获取商品详情失败:', error)
    ElMessage.error('获取商品详情失败')
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
</style>
