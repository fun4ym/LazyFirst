<template>
  <div class="report-orders-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>{{ $t('order.orderManagement') }}</h3>
          <div class="header-actions">
            <el-button type="warning" @click="handleGenerateBill" :loading="generatingBill" :disabled="selectedOrders.length === 0">
              <el-icon><Tickets /></el-icon>
              生成账单 ({{ selectedOrders.length }})
            </el-button>
            <el-button type="success" @click="handleMatchBD" :loading="matchingBD" v-if="hasPermission('orders:btn-match-bd')">
              <el-icon><Connection /></el-icon>
              {{ $t('order.bdMatch') }}
            </el-button>
            <el-button type="primary" @click="showImportDialog" v-if="hasPermission('orders:btn-import')">
              <el-icon><Upload /></el-icon>
              {{ $t('order.importExcel') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 页签 -->
      <el-tabs v-model="activeTab" class="order-tabs">
        <el-tab-pane label="TikTok订单" name="orders"></el-tab-pane>
        <el-tab-pane label="账单" name="bills"></el-tab-pane>
      </el-tabs>

      <!-- 搜索筛选 -->
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item :label="$t('order.orderNo')">
          <el-input
            v-model="searchForm.orderNo"
            :placeholder="$t('order.orderNo')"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item :label="$t('influencer.tiktokId')">
          <el-input
            v-model="searchForm.influencerUsername"
            :placeholder="$t('influencer.tiktokId')"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item :label="$t('order.shop')">
          <el-input
            v-model="searchForm.shopName"
            :placeholder="$t('order.shop')"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="商品ID">
          <el-input
            v-model="searchForm.productId"
            placeholder="商品ID"
            clearable
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item :label="$t('order.orderStatus')">
          <el-select
            v-model="searchForm.orderStatus"
            :placeholder="$t('order.orderStatus')"
            clearable
            style="width: 120px"
          >
            <el-option :label="$t('common.all')" value="" />
            <el-option :label="$t('order.completed')" value="已完成" />
            <el-option :label="$t('order.inProgress')" value="进行中" />
            <el-option :label="$t('status.cancelled')" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('order.createTime')">
          <el-date-picker
            v-model="createTimeRange"
            type="daterange"
            range-separator="-"
            :start-placeholder="$t('common.startDate')"
            :end-placeholder="$t('common.endDate')"
            value-format="YYYY-MM-DD"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item :label="$t('order.paymentTime')">
          <el-date-picker
            v-model="paymentTimeRange"
            type="daterange"
            range-separator="-"
            :start-placeholder="$t('common.startDate')"
            :end-placeholder="$t('common.endDate')"
            value-format="YYYY-MM-DD"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="searchForm.onlyPaid">{{ $t('order.showPaidOnly') }}</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">{{ $t('common.search') }}</el-button>
          <el-button @click="resetSearch">{{ $t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 订单列表 -->
      <div v-show="activeTab === 'orders'">
        <!-- 表格 -->
        <el-table :data="orders" v-loading="loading" stripe border @sort-change="handleSortChange" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" fixed="left" />
        <el-table-column
          label="TikTok ID"
          width="160"
          fixed="left"
          prop="influencerUsername"
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
                  <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.influencerUsername || '--' }}</span>
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

        <el-table-column
          label="归属BD"
          width="120"
          prop="bdName"
          sortable
        >
          <template #default="{ row }">
            <div class="column-text bd-name">{{ row.bdName || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="佣金" width="150" fixed="left">
          <template #default="{ row }">
            <div class="commission">
              <div>{{ formatMoney(row.actualAffiliatePartnerCommission || 0) }}</div>
              <div v-if="row.actualAffiliateServiceProviderShopAdPayment" class="ad-commission">
                {{ formatMoney(row.actualAffiliateServiceProviderShopAdPayment || 0) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="订单" width="200">
          <template #default="{ row }">
            <div class="order-no" style="font-size: 10px">{{ row.orderNo || '--' }}</div>
            <div class="sub-order-no" style="font-size: 8px">{{ row.subOrderNo || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column
          label="商品"
          width="280"
          prop="shopName"
          sortable
        >
          <template #default="{ row }">
            <div class="product-info">
              <div class="product-id-sku">
                <span style="font-size: 10px">{{ row.productId || '--' }}</span>
                <span v-if="row.sku" class="sku-tag">{{ row.sku }}</span>
              </div>
              <el-tooltip :content="`${row.productName}\n店铺代码: ${row.shopCode || '--'}`" placement="top">
                <div class="product-name" style="font-size: 8px">
                  {{ truncateText(row.productName, 50) }}
                </div>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="交易" width="180">
          <template #default="{ row }">
            <div class="trade-info">
              <div>{{ formatMoney(row.productPrice || 0) }}</div>
              <div>数量: {{ row.orderQuantity || 0 }}</div>
              <div class="status-icon">
                <el-icon v-if="row.orderStatus === '已完成'" color="#67C23A"><CircleCheck /></el-icon>
                <el-icon v-else color="#409EFF"><Clock /></el-icon>
                <span>{{ row.orderStatus || '--' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="佣金率" width="280">
          <template #default="{ row }">
            <div class="commission-rates">
              <span v-if="row.affiliatePartnerCommissionRate">
                公司{{ (row.affiliatePartnerCommissionRate * 100).toFixed(0) }}%
              </span>
              <span v-if="row.creatorCommissionRate">
                达人{{ (row.creatorCommissionRate * 100).toFixed(0) }}%
              </span>
              <span v-if="row.serviceProviderRewardCommissionRate">
                服{{ (row.serviceProviderRewardCommissionRate * 100).toFixed(0) }}%
              </span>
              <span v-if="row.influencerRewardCommissionRate">
                达人{{ (row.influencerRewardCommissionRate * 100).toFixed(0) }}%
              </span>
              <span v-if="row.affiliateServiceProviderShopAdCommissionRate" class="ad-rate">
                公司{{ (row.affiliateServiceProviderShopAdCommissionRate * 100).toFixed(0) }}%
              </span>
              <span v-if="row.influencerShopAdCommissionRate" class="ad-rate">
                达人{{ (row.influencerShopAdCommissionRate * 100).toFixed(0) }}%
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="时间"
          width="180"
          prop="createTime"
          sortable
        >
          <template #default="{ row }">
            <div class="time-info">
              <div>创 {{ row.createTime ? formatDate(row.createTime) : '--' }}</div>
              <div>达 {{ row.orderDeliveryTime ? formatDate(row.orderDeliveryTime) : '--' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="打款"
          width="180"
          prop="commissionSettlementTime"
          sortable
        >
          <template #default="{ row }">
            <div class="payment-info">
              <div>{{ row.commissionSettlementTime ? formatDate(row.commissionSettlementTime) : '--' }}</div>
              <div class="payment-no">{{ row.paymentNo || '--' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="结算" width="100" fixed="right">
          <template #default="{ row }">
            <el-tag :type="row.settlementStatus === '已结清' ? 'success' : 'warning'" size="small">
              {{ row.settlementStatus || '未结清' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-show="activeTab === 'orders'"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadOrders"
        @current-change="loadOrders"
        style="margin-top: 20px"
      />
      </div>

      <!-- 账单列表 -->
      <div v-show="activeTab === 'bills'" v-loading="billsLoading">
        <el-table :data="bills" stripe border>
          <el-table-column prop="billNo" label="账单号" width="180" />
          <el-table-column label="有效日期区间" width="200">
            <template #default="{ row }">
              {{ formatDate(row.validStartDate) }} ~ {{ formatDate(row.validEndDate) }}
            </template>
          </el-table-column>
          <el-table-column label="佣金总额" width="150">
            <template #default="{ row }">
              <span class="commission-total">{{ formatMoney(row.totalCommission) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="订单数" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isSettled ? 'success' : 'warning'" size="small">
                {{ row.isSettled ? '已结清' : '未结清' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewBillDetail(row)">详情</el-button>
              <el-button link type="success" @click="showSettleDialog(row)" :disabled="row.isSettled">结算</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="billsPagination.page"
          v-model:page-size="billsPagination.limit"
          :total="billsPagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadBills"
          @current-change="loadBills"
          style="margin-top: 20px"
        />
      </div>
    </el-card>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入订单数据"
      width="600px"
    >
      <el-alert
        title="导入提示"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p style="margin: 5px 0; line-height: 1.5">
            请选择 TikTok Shop Partner Center 中「财务」-「收益」-「导出订单」导出的 Excel，
            并原则上秉持先导入待打款记录，再导入已打款记录
          </p>
        </template>
      </el-alert>

      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        accept=".xlsx,.xls"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .xlsx, .xls 格式文件
          </div>
        </template>
      </el-upload>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="currentDetail?.isBlacklistedInfluencer ? '订单详情（黑名单达人）' : '订单详情'"
      width="800px"
      :class="currentDetail?.isBlacklistedInfluencer ? 'detail-dialog-blacklist' : ''"
    >
      <div v-if="currentDetail" :class="currentDetail.isBlacklistedInfluencer ? 'detail-content-blacklist' : ''">
        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentDetail.isBlacklistedInfluencer"
          title="该订单关联的达人已被列入黑名单"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />
        <el-descriptions :column="2" border v-if="currentDetail">
        <el-descriptions-item label="达人用户名">{{ currentDetail.influencerUsername || '--' }}</el-descriptions-item>
        <el-descriptions-item label="订单ID" label-class-name="tiktok-green-label">{{ currentDetail.orderNo || '--' }}</el-descriptions-item>
        <el-descriptions-item label="子订单ID">{{ currentDetail.subOrderNo || '--' }}</el-descriptions-item>
        <el-descriptions-item label="商品ID" label-class-name="tiktok-green-label">{{ currentDetail.productId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="商品名称" :span="2">{{ currentDetail.productName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ currentDetail.sku || '--' }}</el-descriptions-item>
        <el-descriptions-item label="店铺代码">{{ currentDetail.shopCode || '--' }}</el-descriptions-item>
        <el-descriptions-item label="店铺名称">{{ currentDetail.shopName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">{{ currentDetail.orderStatus || '--' }}</el-descriptions-item>
        <el-descriptions-item label="商品价格">{{ formatMoney(currentDetail.productPrice || 0) }}</el-descriptions-item>
        <el-descriptions-item label="下单件数">{{ currentDetail.orderQuantity || 0 }}</el-descriptions-item>
        <el-descriptions-item label="内容形式">{{ currentDetail.contentType || '--' }}</el-descriptions-item>
        <el-descriptions-item label="内容ID">{{ currentDetail.contentId || '--' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentDetail.createTime ? formatDate(currentDetail.createTime) : '--' }}</el-descriptions-item>
        <el-descriptions-item label="订单送达时间">{{ currentDetail.orderDeliveryTime ? formatDate(currentDetail.orderDeliveryTime) : '--' }}</el-descriptions-item>
        <el-descriptions-item label="佣金结算时间">{{ currentDetail.commissionSettlementTime ? formatDate(currentDetail.commissionSettlementTime) : '--' }}</el-descriptions-item>
        <el-descriptions-item label="实际计佣金额">{{ formatMoney(currentDetail.actualCommissionAmount || 0) }}</el-descriptions-item>
        <el-descriptions-item label="联盟合作伙伴佣金">{{ formatMoney(currentDetail.actualAffiliatePartnerCommission || 0) }}</el-descriptions-item>
        <el-descriptions-item label="创作者佣金">{{ formatMoney(currentDetail.actualCreatorCommission || 0) }}</el-descriptions-item>
        <el-descriptions-item label="达人奖励佣金">{{ formatMoney(currentDetail.actualInfluencerRewardCommission || 0) }}</el-descriptions-item>
        <el-descriptions-item label="服务商奖励佣金">{{ formatMoney(currentDetail.actualServiceProviderRewardCommission || 0) }}</el-descriptions-item>
        <el-descriptions-item label="联盟服务商广告佣金">{{ formatMoney(currentDetail.actualAffiliateServiceProviderShopAdPayment || 0) }}</el-descriptions-item>
        <el-descriptions-item label="达人店铺广告佣金">{{ formatMoney(currentDetail.actualInfluencerShopAdPayment || 0) }}</el-descriptions-item>
        <el-descriptions-item label="已退货数量">{{ currentDetail.returnedProductCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="已退款数量">{{ currentDetail.refundedProductCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="打款单号">{{ currentDetail.paymentNo || '--' }}</el-descriptions-item>
        <el-descriptions-item label="付款方式">{{ currentDetail.paymentMethod || '--' }}</el-descriptions-item>
        <el-descriptions-item label="付款账户">{{ currentDetail.paymentAccount || '--' }}</el-descriptions-item>
        <el-descriptions-item label="IVA">{{ currentDetail.iva || '--' }}</el-descriptions-item>
        <el-descriptions-item label="ISR">{{ currentDetail.isr || '--' }}</el-descriptions-item>
        <el-descriptions-item label="平台">{{ currentDetail.platform || '--' }}</el-descriptions-item>
        <el-descriptions-item label="归因类型">{{ currentDetail.attributionType || '--' }}</el-descriptions-item>
      </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 账单详情对话框 -->
    <el-dialog v-model="billDetailDialogVisible" title="账单详情" width="900px">
      <div v-if="currentBill">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="账单号">{{ currentBill.billNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentBill.isSettled ? 'success' : 'warning'">
              {{ currentBill.isSettled ? '已结清' : '未结清' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="有效日期区间" :span="2">
            {{ formatDate(currentBill.validStartDate) }} ~ {{ formatDate(currentBill.validEndDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="佣金总额">
            <span class="commission-total">{{ formatMoney(currentBill.totalCommission) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentBill.orderCount }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentBill.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="结算时间" v-if="currentBill.isSettled">
            {{ formatDate(currentBill.settlementTime) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- BD明细 -->
        <div v-if="currentBill.orderDetails" style="margin-top: 20px">
          <h4>BD明细</h4>
          <el-table :data="currentBill.orderDetails" stripe border>
            <el-table-column prop="bdName" label="BD" width="150" />
            <el-table-column label="佣金总额" width="150">
              <template #default="{ row }">
                <span class="commission-total">{{ formatMoney(row.commission) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="orderCount" label="订单数" width="100" />
          </el-table>

          <!-- 订单详情 -->
          <div v-for="bd in currentBill.orderDetails" :key="bd.bdName" style="margin-top: 16px">
            <h5>{{ bd.bdName }} - 订单明细</h5>
            <el-table :data="bd.orders" stripe border size="small" max-height="300">
              <el-table-column prop="orderNo" label="订单号" width="180" />
              <el-table-column prop="productName" label="商品名称" min-width="200" />
              <el-table-column label="佣金" width="120">
                <template #default="{ row }">
                  {{ formatMoney(row.commission) }}
                </template>
              </el-table-column>
              <el-table-column label="结算状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.settlementStatus === '已结清' ? 'success' : 'warning'" size="small">
                    {{ row.settlementStatus || '未结清' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="paymentNo" label="打款单号" width="150" />
              <el-table-column label="打款日期" width="120">
                <template #default="{ row }">
                  {{ row.commissionSettlementTime ? formatDate(row.commissionSettlementTime) : '--' }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="billDetailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 结算对话框 -->
    <el-dialog v-model="settleDialogVisible" title="结算账单" width="600px">
      <div v-if="currentBill">
        <el-alert
          title="结算确认"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <p>账单号：{{ currentBill.billNo }}</p>
            <p>佣金总额：{{ formatMoney(currentBill.totalCommission) }}</p>
          </template>
        </el-alert>

        <el-form :model="settleForm" label-width="100px">
          <el-form-item label="选择BD" required>
            <el-select v-model="settleForm.bdName" placeholder="请选择BD" style="width: 100%" @change="handleBdChange">
              <el-option
                v-for="bd in currentBill.bdList"
                :key="bd.bdName"
                :label="bd.bdName"
                :value="bd.bdName"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="银行账号">
            <el-input v-model="settleForm.bankAccount" placeholder="请输入银行账号" />
          </el-form-item>

          <el-form-item label="银行流水号" required>
            <el-input v-model="settleForm.bankFlowNo" placeholder="请输入银行流水单号" />
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="settleForm.note" type="textarea" placeholder="请输入备注" :rows="2" />
          </el-form-item>

          <el-divider />

          <el-button type="primary" link @click="addSettlementNote" + v-if="settleForm.bdName">
            <el-icon><Plus /></el-icon> 添加下一条
          </el-button>

          <div v-if="settleForm.notes.length > 0" style="margin-top: 16px">
            <h4>已添加的结算记录</h4>
            <el-table :data="settleForm.notes" stripe border size="small">
              <el-table-column prop="bdName" label="BD" width="120" />
              <el-table-column prop="bankAccount" label="银行账号" width="180" />
              <el-table-column prop="bankFlowNo" label="流水号" width="150" />
              <el-table-column prop="note" label="备注" min-width="150" />
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button link type="danger" size="small" @click="removeSettlementNote($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="settleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSettle" :loading="settling" :disabled="settleForm.notes.length === 0">
          确认结算
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import request from '@/utils/request'
import { Upload, UploadFilled, CircleCheck, Clock, Connection, Loading, Tickets, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

const hasPermission = (perm) => AuthManager.hasPermission(perm)

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const importing = ref(false)
const matchingBD = ref(false)
const generatingBill = ref(false)
const importDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const orders = ref([])
const fileList = ref([])
const uploadFile = ref(null)
const createTimeRange = ref([])
const paymentTimeRange = ref([])
const currentDetail = ref(null)
const currencySymbol = ref('฿')
const sortBy = ref('')
const sortOrder = ref('')
const popoverInfluencer = ref(null)
const popoverLoading = ref(false)

// 多选相关
const selectedOrders = ref([])
const activeTab = ref('orders')

// 账单相关
const billsLoading = ref(false)
const bills = ref([])
const billsPagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})
const billDetailDialogVisible = ref(false)
const currentBill = ref(null)

// 结算相关
const settleDialogVisible = ref(false)
const settling = ref(false)
const settleForm = reactive({
  bdName: '',
  bankAccount: '',
  bankFlowNo: '',
  note: '',
  notes: []
})

const searchForm = reactive({
  orderNo: '',
  shopName: '',
  influencerUsername: '',
  productId: '',
  orderStatus: '',
  startDate: '',
  endDate: '',
  paymentStartDate: '',
  paymentEndDate: '',
  onlyPaid: false
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const formatMoney = (value) => {
  if (!value) return `${currencySymbol.value}0.00`
  return `${currencySymbol.value}${Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

const formatDate = (date) => {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('zh-CN')
}

const truncateText = (text, maxLength) => {
  if (!text) return '--'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

// 加载悬停弹层中的达人信息
const loadInfluencerPopover = async (row) => {
  popoverInfluencer.value = null
  if (!row.influencerUsername) return
  
  popoverLoading.value = true
  try {
    const res = await request.get('/influencer-managements', {
      params: {
        companyId: userStore.companyId,
        keyword: row.influencerUsername,
        limit: 10
      }
    })
    console.log('达人搜索结果:', res)
    const influencers = res.influencers || res.data || []
    const matched = influencers.find(i => i.tiktokId === row.influencerUsername)
    popoverInfluencer.value = matched || null
  } catch (error) {
    console.error('获取达人信息失败:', error)
    popoverInfluencer.value = null
  } finally {
    popoverLoading.value = false
  }
}

const loadCurrencySymbol = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { page: 1, limit: 100, type: 'currency' }
    })
    // 查找泰国泰铢的符号
    const thaiBaht = res.data?.find(c => c.name === '泰铢' || c.code === 'THB')
    if (thaiBaht) {
      currencySymbol.value = thaiBaht.symbol || '฿'
    }
  } catch (error) {
    console.error('Load currency error:', error)
  }
}

const handleSortChange = ({ prop, order }) => {
  if (order) {
    sortBy.value = prop
    sortOrder.value = order === 'ascending' ? '1' : '-1'
  } else {
    sortBy.value = ''
    sortOrder.value = ''
  }
  loadOrders()
}

const handleMatchBD = async () => {
  await ElMessageBox.confirm(
    'BD匹配将根据样品管理表中的数据，自动匹配订单的归属BD。\n' +
    '匹配规则：productId + influencerUsername 相同的记录。\n\n' +
    '确定要执行BD匹配吗？',
    'BD匹配',
    {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    }
  )

  matchingBD.value = true
  try {
    const res = await request.post('/report-orders/match-bd')
    const data = res.data || res
    ElMessage.success(
      `BD匹配完成！\n` +
      `订单总数：${data.totalOrders}\n` +
      `匹配成功：${data.matchedCount}\n` +
      `已更新：${data.updatedCount}\n` +
      `未匹配：${data.unmatchedCount}`
    )
    loadOrders()
  } catch (error) {
    console.error('Match BD error:', error)
    console.error('Error response:', error.response?.data)
    ElMessage.error(error.response?.data?.message || 'BD匹配失败')
  } finally {
    matchingBD.value = false
  }
}

// 多选变化
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

// 生成账单
const handleGenerateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要生成账单的订单')
    return
  }

  const orderIds = selectedOrders.value.map(o => o._id)

  await ElMessageBox.confirm(
    `已选择 ${selectedOrders.value.length} 条订单，确定要生成账单吗？`,
    '生成账单',
    {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    }
  )

  generatingBill.value = true
  try {
    const res = await request.post('/report-orders/bills/generate', { orderIds })
    ElMessage.success('账单生成成功！')
    selectedOrders.value = []
    // 刷新订单列表
    loadOrders()
    // 切换到账单页签
    activeTab.value = 'bills'
    loadBills()
  } catch (error) {
    console.error('Generate bill error:', error)
    ElMessage.error(error.response?.data?.message || '生成账单失败')
  } finally {
    generatingBill.value = false
  }
}

// 加载账单列表
const loadBills = async () => {
  billsLoading.value = true
  try {
    const params = {
      page: billsPagination.page,
      limit: billsPagination.limit
    }
    const res = await request.get('/report-orders/bills', { params })
    bills.value = res.data?.bills || []
    billsPagination.total = res.data?.pagination?.total || 0
  } catch (error) {
    console.error('Load bills error:', error)
  } finally {
    billsLoading.value = false
  }
}

// 查看账单详情
const viewBillDetail = async (row) => {
  try {
    const res = await request.get(`/report-orders/bills/${row._id}`)
    currentBill.value = res.data
    billDetailDialogVisible.value = true
  } catch (error) {
    console.error('Load bill detail error:', error)
    ElMessage.error('加载账单详情失败')
  }
}

// 显示结算对话框
const showSettleDialog = (row) => {
  currentBill.value = row
  settleForm.bdName = ''
  settleForm.bankAccount = ''
  settleForm.bankFlowNo = ''
  settleForm.note = ''
  settleForm.notes = []
  settleDialogVisible.value = true
}

// BD变化时获取银行账号
const handleBdChange = async (bdName) => {
  if (!bdName) return
  try {
    // 获取该BD的用户信息
    const res = await request.get('/users', {
      params: { search: bdName, limit: 10 }
    })
    const users = res.users || []
    const bdUser = users.find(u => u.realName === bdName)
    if (bdUser?.bankAccount) {
      settleForm.bankAccount = bdUser.bankAccount
    } else {
      settleForm.bankAccount = ''
    }
  } catch (error) {
    console.error('Load BD bank account error:', error)
  }
}

// 添加结算备注
const addSettlementNote = () => {
  if (!settleForm.bdName) {
    ElMessage.warning('请选择BD')
    return
  }
  if (!settleForm.bankFlowNo) {
    ElMessage.warning('请输入银行流水号')
    return
  }

  settleForm.notes.push({
    bdName: settleForm.bdName,
    bankAccount: settleForm.bankAccount,
    bankFlowNo: settleForm.bankFlowNo,
    note: settleForm.note
  })

  // 重置单条输入
  settleForm.bdName = ''
  settleForm.bankAccount = ''
  settleForm.bankFlowNo = ''
  settleForm.note = ''
}

// 删除结算备注
const removeSettlementNote = (index) => {
  settleForm.notes.splice(index, 1)
}

// 提交结算
const handleSettle = async () => {
  if (settleForm.notes.length === 0) {
    ElMessage.warning('请至少添加一条结算记录')
    return
  }

  settling.value = true
  try {
    const res = await request.post(`/report-orders/bills/${currentBill.value._id}/settle`, {
      settlementNotes: settleForm.notes
    })
    ElMessage.success('结算成功！')
    settleDialogVisible.value = false
    loadBills()
  } catch (error) {
    console.error('Settle error:', error)
    ElMessage.error(error.response?.data?.message || '结算失败')
  } finally {
    settling.value = false
  }
}

// 监听页签变化
import { watch } from 'vue'
watch(activeTab, (newTab) => {
  if (newTab === 'bills') {
    loadBills()
  }
})

const loadOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }

    // 处理创建时间范围
    if (createTimeRange.value && createTimeRange.value.length === 2) {
      params.startDate = createTimeRange.value[0]
      params.endDate = createTimeRange.value[1]
    }

    // 处理打款时间范围
    if (paymentTimeRange.value && paymentTimeRange.value.length === 2) {
      params.paymentStartDate = paymentTimeRange.value[0]
      params.paymentEndDate = paymentTimeRange.value[1]
    }

    // 处理排序
    if (sortBy.value && sortOrder.value) {
      params.sortBy = sortBy.value
      params.sortOrder = sortOrder.value
    }

    const res = await request.get('/report-orders', { params })
    orders.value = res.orders || []
    pagination.total = res.pagination?.total || 0
  } catch (error) {
    console.error('Load orders error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const showImportDialog = () => {
  fileList.value = []
  uploadFile.value = null
  importDialogVisible.value = true
}

const handleFileChange = (file) => {
  uploadFile.value = file.raw
  fileList.value = [file]
}

const handleImport = async () => {
  if (!uploadFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  importing.value = true
  const formData = new FormData()
  formData.append('file', uploadFile.value)

  try {
    const res = await request.post('/report-orders/import', formData)
    ElMessage.success(res.message || '导入成功')

    // 如果有错误信息，显示警告
    if (res.data?.errors && res.data.errors.length > 0) {
      console.warn('导入错误:', res.data.errors)
      ElMessage.warning(`部分记录导入失败，请查看控制台详情`)
    }

    importDialogVisible.value = false
    loadOrders()
  } catch (error) {
    console.error('Import error:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('导入失败，请检查文件格式')
    }
  } finally {
    importing.value = false
  }
}

const viewDetail = (row) => {
  currentDetail.value = row
  detailDialogVisible.value = true
}

const resetSearch = () => {
  Object.assign(searchForm, {
    orderNo: '',
    shopName: '',
    influencerUsername: '',
    productId: '',
    orderStatus: '',
    startDate: '',
    endDate: '',
    paymentStartDate: '',
    paymentEndDate: '',
    onlyPaid: false
  })
  createTimeRange.value = []
  paymentTimeRange.value = []
  sortBy.value = ''
  sortOrder.value = ''
  pagination.page = 1
  loadOrders()
}

onMounted(() => {
  // 从 URL 参数初始化搜索条件
  if (route.query.influencer) {
    searchForm.influencerUsername = route.query.influencer
  }
  // 兼容 influencerAccount 参数
  if (route.query.influencerAccount) {
    searchForm.influencerUsername = route.query.influencerAccount
  }
  if (route.query.orderNo) {
    searchForm.orderNo = route.query.orderNo
  }
  if (route.query.shopName) {
    searchForm.shopName = route.query.shopName
  }
  // 兼容 productId 参数
  if (route.query.productId) {
    searchForm.productId = route.query.productId
  }

  loadCurrencySymbol()
  loadOrders()
})
</script>

<style scoped>
.report-orders-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
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

.column-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-text.bd-name {
  font-weight: 600;
  color: #6a1b9a;
}

.tiktok-id-column {
  color: #6DAD19;
  font-weight: 500;
}

.order-no {
  font-weight: 500;
  color: #303133;
}

.sub-order-no {
  color: #909399;
  margin-top: 2px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-id-sku {
  display: flex;
  gap: 8px;
  color: #606266;
}

.product-id-sku .sku-tag {
  background: #E6F7FF;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 10px;
}

.product-name {
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.product-name:hover {
  color: #409EFF;
}

.trade-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.commission {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 500;
  color: #67C23A;
}

.commission .ad-commission {
  background: #FFF7CC;
  padding: 2px 6px;
  border-radius: 2px;
  display: inline-block;
  width: fit-content;
}

.commission-rates,
.ad-commission-rates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.commission-rates span {
  padding: 2px 6px;
  background: #F0F2F5;
  border-radius: 2px;
  font-size: 12px;
  color: #606266;
}

.commission-rates .ad-rate {
  background: #FFF7CC;
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #909399;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-no {
  font-size: 12px;
  color: #606266;
}

.upload-demo {
  margin: 20px 0;
}

.el-button + .el-button {
  margin-left: 8px;
}

/* TikTok绿色样式 */
:deep(.el-descriptions__label.tiktok-green-label) {
  color: #6DAD19;
}
</style>
