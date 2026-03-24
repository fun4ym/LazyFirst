<template>
  <div class="product-tab">
    <!-- 搜索筛选 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-select v-model="filters.status" placeholder="状态" clearable @change="loadData">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-input v-model="filters.keyword" placeholder="搜索商品ID/名称/店铺" clearable @change="loadData">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.activityId" placeholder="参与活动" clearable @change="loadData">
            <el-option v-for="act in activities" :key="act._id" :label="act.name" :value="act._id" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="showCreateDialog" v-if="hasPermission('products:create')">新增商品</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 统计信息 -->
    <div class="stats-info">
      <span>共 {{ pagination.total }} 条</span>
    </div>

    <!-- 产品列表 -->
    <el-table :data="products" stripe v-loading="loading" :scroll-x="true">
      <el-table-column label="TikTok商品" width="320" fixed class-name="tiktok-green-label">
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
      <el-table-column label="店铺" width="150">
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
              <div class="shop-info-item"><strong>店铺：</strong>{{ row.shopId?.shopName || row.shopId?.name || '-' }}</div>
              <div class="shop-info-item"><strong>店铺号：</strong>{{ row.shopId?.shopNumber || '-' }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.name"><strong>联系人：</strong>{{ row.shopId.contactId.name }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.phone"><strong>电话：</strong>{{ row.shopId.contactId.phone }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.email"><strong>邮箱：</strong>{{ row.shopId.contactId.email }}</div>
              <div class="shop-info-item" v-if="row.shopId?.contactId?.address"><strong>地址：</strong>{{ row.shopId.contactId.address }}</div>
            </div>
          </el-popover>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="productCategory" label="商品类目" :width="128" show-overflow-tooltip />
      <el-table-column prop="productGrade" label="商品等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getGradeType(row.productGrade)">
            {{ getGradeText(row.productGrade) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="过去7天成单" width="120" align="center">
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
            <div v-if="loadingOrderStats[row._id]?.loading" class="loading-tip">加载中...</div>
            <div v-else-if="getOrderStats(row, '7days').orders?.length > 0">
              <el-table :data="getPaginatedOrders(row, '7days')" size="small" max-height="300">
                <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
                <el-table-column prop="influencerUsername" label="达人" width="100" show-overflow-tooltip />
                <el-table-column prop="creatorName" label="归属BD" width="80" show-overflow-tooltip />
                <el-table-column prop="totalAmount" label="交易金额" width="80" />
                <el-table-column label="创建时间" width="140">
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
            <div v-else class="empty-tip">暂无订单数据</div>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column label="过去3个月成单" width="120" align="center">
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
            <div v-if="loadingOrderStats[row._id]?.loading" class="loading-tip">加载中...</div>
            <div v-else-if="getOrderStats(row, '3months').orders?.length > 0">
              <el-table :data="getPaginatedOrders(row, '3months')" size="small" max-height="300">
                <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
                <el-table-column prop="influencerUsername" label="达人" width="100" show-overflow-tooltip />
                <el-table-column prop="creatorName" label="归属BD" width="80" show-overflow-tooltip />
                <el-table-column prop="totalAmount" label="交易金额" width="80" />
                <el-table-column label="创建时间" width="140">
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
            <div v-else class="empty-tip">暂无订单数据</div>
          </el-popover>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProduct(row)" v-if="hasPermission('products:read')">详情</el-button>
          <el-button link type="primary" @click="showReport(row)" v-if="hasPermission('products:read')">报表</el-button>
          <el-button link type="primary" @click="editProduct(row)" v-if="hasPermission('products:update')">编辑</el-button>
          <el-button link type="danger" @click="deleteProduct(row)" v-if="hasPermission('products:delete')">删除</el-button>
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
      :title="editingProduct ? '编辑商品' : '新增商品'"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="form-container">
        <el-form :model="form" ref="formRef" label-width="120px" label-position="right">
          <!-- TikTok shop信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">TikTok Shop 信息</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="TikTok商品ID" prop="productId" required class="tiktok-green-label">
                  <el-input v-model="form.productId" placeholder="请输入商品ID" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商品名称">
                  <el-input v-model="form.productName" placeholder="请输入商品名称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="店铺">
                  <el-select v-model="form.shopId" placeholder="请选择店铺" style="width: 100%">
                    <el-option v-for="shop in shops" :key="shop._id" :label="shop.shopName" :value="shop._id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商品类目">
                  <el-select v-model="form.productCategory" placeholder="请选择商品类目" style="width: 100%">
                    <el-option v-for="cat in productCategories" :key="cat" :label="cat" :value="cat" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="广场佣金率(%)">
                  <el-input-number v-model="form.squareCommissionRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 商品信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">商品信息</span>
            </div>
            <el-form-item label="商品等级">
              <el-select v-model="form.productGrade" placeholder="请选择">
                <el-option label="普通" value="ordinary" />
                <el-option label="爆款" value="hot" />
                <el-option label="主推款" value="main" />
                <el-option label="新品" value="new" />
              </el-select>
            </el-form-item>
            <el-form-item label="商品简介">
              <el-input v-model="form.productIntro" type="textarea" :rows="3" placeholder="请输入商品简介" />
            </el-form-item>
            <el-form-item label="参考视频">
              <el-input v-model="form.referenceVideo" placeholder="请输入参考视频链接" />
            </el-form-item>
            <el-form-item label="卖点">
              <el-input v-model="form.sellingPoints" type="textarea" :rows="2" placeholder="请输入商品卖点" />
            </el-form-item>
          </div>

          <!-- 活动配置 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">活动配置</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="TAP专属链" class="tiktok-green-label">
                  <el-input v-model="form.tapExclusiveLink" placeholder="可选" class="tiktok-green-input" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="寄样方式">
                  <el-select v-model="form.sampleMethod" placeholder="请选择" style="width: 100%">
                    <el-option label="线上" value="线上" />
                    <el-option label="线下" value="线下" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="合作国家">
                  <el-select v-model="form.cooperationCountry" placeholder="请选择国家" style="width: 100%">
                    <el-option v-for="country in countries" :key="country" :label="country" :value="country" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 达人要求 -->
            <div class="subsection-header">达人要求</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="GMV">
                  <el-input-number v-model="form.requirementGmv" :min="0" placeholder="GMV以上" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="月销售件数">
                  <el-input-number v-model="form.requirementMonthlySales" :min="0" placeholder="月销售件数以上" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="粉丝数">
                  <el-input-number v-model="form.requirementFollowers" :min="0" placeholder="粉丝数以上" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="月均播放量">
                  <el-input-number v-model="form.requirementAvgViews" :min="0" placeholder="月均播放量以上" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="要求说明">
              <el-input v-model="form.requirementRemark" type="textarea" :rows="3" :maxlength="1000" placeholder="请输入要求说明（最多1000个字符）" />
            </el-form-item>
          </div>

          <!-- 佣金信息 -->
          <div class="form-section">
            <div class="section-header">
              <span class="section-title">活动佣金配置</span>
              <el-button type="primary" size="small" @click="addActivityCommission">
                <el-icon><Plus /></el-icon>
                添加活动
              </el-button>
            </div>
            <div v-if="form.activityCommissions.length === 0" class="empty-tip">
              请至少添加一个活动配置
            </div>
            <div v-for="(ac, index) in form.activityCommissions" :key="index" class="activity-commission-item">
              <div class="activity-header">
                <span class="activity-title">活动配置 {{ index + 1 }}</span>
                <el-button link type="danger" size="small" @click="removeActivityCommission(index)" v-if="form.activityCommissions.length > 1">
                  删除
                </el-button>
              </div>
              <el-row :gutter="16">
                <el-col :span="24">
                  <el-form-item label="活动名称" :prop="`activityCommissions.${index}.activityId`" :rules="{ required: true, message: '请选择活动', trigger: 'change' }">
                    <el-select v-model="ac.activityId" placeholder="选择活动" style="width: 100%" @change="validateActivityDuplication(index)">
                      <el-option v-for="act in activities" :key="act._id" :label="act.name" :value="act._id" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <!-- 推广时佣金配置 -->
              <el-divider content-position="left">推广时</el-divider>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item label="给达人(%)">
                    <el-input-number v-model="ac.promotionInfluencerRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="原本(%)">
                    <el-input-number v-model="ac.promotionOriginalRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="公司自留(%)">
                    <el-input-number v-model="ac.promotionCompanyRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <!-- 投广告时佣金配置 -->
              <el-divider content-position="left">投广告时</el-divider>
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-form-item label="给达人(%)">
                    <el-input-number v-model="ac.adInfluencerRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="原本(%)">
                    <el-input-number v-model="ac.adOriginalRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="公司自留(%)">
                    <el-input-number v-model="ac.adCompanyRate" :min="0" :max="100" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" size="large">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="合作产品详情" width="900px" :close-on-click-modal="false">
      <div v-if="currentProduct">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="TikTok商品ID">{{ currentProduct.tiktokProductId || currentProduct.productId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品名称">{{ currentProduct.name || currentProduct.productName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="SKU">{{ currentProduct.sku || '-' }}</el-descriptions-item>
          <el-descriptions-item label="店铺">{{ currentProduct.shopId?.shopName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商品类目">{{ currentProduct.productCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="价格">{{ currentProduct.price ? '$' + currentProduct.price : '-' }}</el-descriptions-item>
          <el-descriptions-item label="TAP专属链">{{ currentProduct.tapExclusiveLink || '-' }}</el-descriptions-item>
          <el-descriptions-item label="达人要求">{{ currentProduct.influencerRequirement || '-' }}</el-descriptions-item>
          <el-descriptions-item label="广场佣金率">{{ currentProduct.squareCommissionRate ? (currentProduct.squareCommissionRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentProduct.status === 'active' ? 'success' : 'info'">
              {{ currentProduct.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>商品信息</el-divider>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="商品简介">{{ currentProduct.productIntro || '-' }}</el-descriptions-item>
          <el-descriptions-item label="参考视频">{{ currentProduct.referenceVideo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="卖点">{{ currentProduct.sellingPoints || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>活动佣金配置</el-divider>
        <div v-if="currentProduct.activityCommissions && currentProduct.activityCommissions.length > 0">
          <div v-for="(ac, index) in currentProduct.activityCommissions" :key="index" style="margin-bottom: 16px;">
            <el-card>
              <template #header>
                <span>活动配置 {{ index + 1 }} - {{ activities.find(a => a._id === ac.activityId)?.name || '-' }}</span>
              </template>
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-divider content-position="center">推广时</el-divider>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="给达人">{{ ac.promotionInfluencerRate ? (ac.promotionInfluencerRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                    <el-descriptions-item label="原本">{{ ac.promotionOriginalRate ? (ac.promotionOriginalRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                    <el-descriptions-item label="公司自留">{{ ac.promotionCompanyRate ? (ac.promotionCompanyRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                  </el-descriptions>
                </el-col>
                <el-col :span="12">
                  <el-divider content-position="center">投广告时</el-divider>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="给达人">{{ ac.adInfluencerRate ? (ac.adInfluencerRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                    <el-descriptions-item label="原本">{{ ac.adOriginalRate ? (ac.adOriginalRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                    <el-descriptions-item label="公司自留">{{ ac.adCompanyRate ? (ac.adCompanyRate * 100).toFixed(2) + '%' : '-' }}</el-descriptions-item>
                  </el-descriptions>
                </el-col>
              </el-row>
            </el-card>
          </div>
        </div>
        <div v-else class="empty-tip">暂无活动配置</div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 报表对话框 -->
    <el-dialog v-model="showReportDialog" title="产品销售报表" width="1200px" :close-on-click-modal="false">
      <div v-if="reportProduct && reportData">
        <el-tabs v-model="reportPeriod" @tab-change="loadReportData">
          <el-tab-pane label="过去7天" name="7days" />
          <el-tab-pane label="过去14天" name="14days" />
          <el-tab-pane label="本自然月" name="month" />
        </el-tabs>

        <div v-if="loadingReport" class="loading-tip">加载中...</div>
        <div v-else>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-card class="report-card">
                <template #header>
                  <span>销售量趋势</span>
                </template>
                <div ref="lineChartRef" style="height: 300px;"></div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card class="report-card">
                <template #header>
                  <span>销售量分布</span>
                </template>
                <div ref="pieChartRef" style="height: 300px;"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="report-card" style="margin-top: 16px;">
            <template #header>
              <span>BD销售排行 (Top 5)</span>
            </template>
            <el-table :data="reportData.bdStats?.slice(0, 5)" stripe>
              <el-table-column type="index" label="排名" width="80" />
              <el-table-column prop="bdName" label="BD名称" />
              <el-table-column prop="count" label="销售量" align="center" />
              <el-table-column label="占比" align="center">
                <template #default="{ row }">
                  {{ ((row.count / (reportData.totalOrders || 1)) * 100).toFixed(1) }}%
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card class="report-card" style="margin-top: 16px;">
            <template #header>
              <span>达人销售排行 (Top 10)</span>
            </template>
            <el-table :data="reportData.influencerStats?.slice(0, 10)" stripe>
              <el-table-column type="index" label="排名" width="80" />
              <el-table-column prop="influencerName" label="达人名称" />
              <el-table-column prop="count" label="销售量" align="center" />
              <el-table-column label="占比" align="center">
                <template #default="{ row }">
                  {{ ((row.count / (reportData.totalOrders || 1)) * 100).toFixed(1) }}%
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </div>
      <template #footer>
        <el-button @click="showReportDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'
import * as echarts from 'echarts'

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
  tapExclusiveLink: '',
  sampleMethod: '线上',
  cooperationCountry: '',
  requirementGmv: 0,
  requirementMonthlySales: 0,
  requirementFollowers: 0,
  requirementAvgViews: 0,
  requirementRemark: '',
  productImages: [],
  productIntro: '',
  referenceVideo: '',
  sellingPoints: '',
  squareCommissionRate: 0,
  activityCommissions: []
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

const addActivityCommission = () => {
  form.activityCommissions.push({
    activityId: '',
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
  // 转换活动佣金率
  if (data.activityCommissions && Array.isArray(data.activityCommissions)) {
    data.activityCommissions = data.activityCommissions.map(ac => ({
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
  if (data.activityCommissions && Array.isArray(data.activityCommissions)) {
    data.activityCommissions = data.activityCommissions.map(ac => ({
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

const removeActivityCommission = (index) => {
  if (form.activityCommissions.length <= 1) {
    ElMessage.warning('至少需要保留一个活动配置')
    return
  }
  form.activityCommissions.splice(index, 1)
}

const validateActivityDuplication = (currentIndex) => {
  const currentActivityId = form.activityCommissions[currentIndex]?.activityId
  if (!currentActivityId) return

  const duplicateIndex = form.activityCommissions.findIndex((ac, index) =>
    index !== currentIndex && ac.activityId === currentActivityId
  )

  if (duplicateIndex !== -1) {
    ElMessage.error('同一产品不能重复参与同一活动')
    form.activityCommissions[currentIndex].activityId = ''
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
    tapExclusiveLink: row.tapExclusiveLink,
    sampleMethod: row.sampleMethod || '线上',
    cooperationCountry: row.cooperationCountry,
    sampleTarget: row.sampleTarget,
    influencerRequirement: row.influencerRequirement,
    productImages: row.productImages || [],
    productIntro: row.productIntro,
    referenceVideo: row.referenceVideo,
    sellingPoints: row.sellingPoints,
    squareCommissionRate: row.squareCommissionRate ? row.squareCommissionRate * 100 : 0,
    // 兼容 Product 的 sku/name 字段（用于内部标识）
    sku: row.sku || row.tiktokProductId || '',
    name: row.name || row.productName || '',
    price: row.price || 0,
    activityCommissions: row.activityCommissions && row.activityCommissions.length > 0
      ? JSON.parse(JSON.stringify(row.activityCommissions))
      : []
  }
  convertCommissionRatesToPercent(formData)
  Object.assign(form, formData)
  if (form.activityCommissions.length === 0) {
    addActivityCommission()
  }
  showDialog.value = true
}

const deleteProduct = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除"${row.name || row.productName}"吗?`, '提示', {
      type: 'warning'
    })
    await request.delete(`/products/${row._id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  // 验证至少有一个活动配置
  if (!form.activityCommissions || form.activityCommissions.length === 0) {
    ElMessage.error('请至少添加一个活动配置')
    return
  }

  // 验证每个活动配置都有活动ID
  const hasEmptyActivity = form.activityCommissions.some(ac => !ac.activityId)
  if (hasEmptyActivity) {
    ElMessage.error('请为每个活动配置选择活动')
    return
  }

  // 验证活动是否有重复
  const activityIds = form.activityCommissions.map(ac => ac.activityId)
  const uniqueIds = [...new Set(activityIds)]
  if (activityIds.length !== uniqueIds.length) {
    ElMessage.error('同一产品不能重复参与同一活动')
    return
  }

  try {
    const data = convertCommissionRates({
      companyId: userStore.companyId,
      ...form
    })
    if (editingProduct.value) {
      await request.put(`/products/${editingProduct.value._id}`, data)
      ElMessage.success('更新成功')
    } else {
      await request.post('/products', data)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '提交失败')
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
    tapExclusiveLink: '',
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
    activityCommissions: []
  })
  addActivityCommission()
}

const getGradeText = (grade) => {
  const map = {
    ordinary: '普通',
    hot: '爆款',
    main: '主推款',
    new: '新品'
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
</style>
