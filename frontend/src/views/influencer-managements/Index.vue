<template>
  <div class="influencer-management-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <el-button type="primary" @click="showCreateDialog = true" v-if="hasPermission('influencers:create')">{{ $t('influencer.addInfluencer') }}</el-button>
        </div>
      </template>

      <!-- 页签 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 达人列表 -->
        <el-tab-pane :label="$t('influencer.influencerList')" name="list">

          <!-- 搜索筛选 -->
      <div class="filter-section">
      <!-- 第一行：基本筛选 -->
      <el-row :gutter="16" class="filter-row">
        <el-col :span="5">
          <el-select v-model="filters.poolType" :placeholder="$t('influencer.poolType')" clearable @change="loadData">
            <el-option :label="$t('common.all')" value="" />
            <el-option :label="$t('influencer.publicSea')" value="public" />
            <el-option :label="$t('influencer.privateSea')" value="private" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.status" :placeholder="$t('common.status')" clearable @change="loadData">
            <el-option :label="$t('common.all')" value="" />
            <el-option :label="$t('common.enable')" value="enabled" />
            <el-option :label="$t('common.disable')" value="disabled" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filters.categoryTag" :placeholder="$t('influencer.categoryTag')" clearable @change="loadData">
            <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-input v-model="filters.keyword" :placeholder="$t('influencer.tiktokId') + ' ' + $t('common.fuzzySearch')" clearable @change="loadData" style="width: 100%">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>

        <!-- 第二行：数据筛选 -->
        <el-row :gutter="16" class="filter-row">
          <el-col :span="4">
            <el-input-number v-model="displayFollowersFrom" :min="0" :placeholder="$t('influencer.followers')" clearable style="width: 100%" @change="handleFollowersFilterChange" />
            <div class="filter-label">{{ $t('influencer.followers') }} ≥ (K)</div>
          </el-col>
          <el-col :span="4">
            <el-input-number v-model="filters.gmvFrom" :min="0" :placeholder="$t('influencer.latestGmv')" clearable @change="loadData" style="width: 100%" />
            <div class="filter-label">{{ $t('influencer.latestGmv') }} ≥</div>
          </el-col>
          <el-col :span="4">
            <el-input-number v-model="filters.monthlySalesFrom" :min="0" :placeholder="$t('influencer.monthlySalesCount')" clearable @change="loadData" style="width: 100%" />
            <div class="filter-label">{{ $t('influencer.monthlySalesCount') }} ≥</div>
          </el-col>
          <el-col :span="4">
            <el-input-number v-model="filters.avgViewsFrom" :min="0" :placeholder="$t('influencer.avgVideoViews')" clearable @change="loadData" style="width: 100%" />
            <div class="filter-label">{{ $t('influencer.avgVideoViews') }} ≥</div>
          </el-col>
        </el-row>
      </div>

      <!-- 批量操作 -->
      <div class="batch-actions-bar" v-if="hasPermission('influencers:update')">
        <el-button type="warning" :disabled="selectedIds.length === 0" @click="batchClaim">{{ $t('influencer.batchClaim') }}</el-button>
        <el-button type="danger" :disabled="selectedIds.length === 0" @click="batchRelease">{{ $t('influencer.batchRelease') }}</el-button>
        <span class="selected-count" v-if="selectedIds.length > 0">已选择 {{ selectedIds.length }} 条</span>
      </div>

      <!-- 达人列表 -->
      <el-table :data="influencers" stripe @selection-change="handleSelectionChange" :row-class-name="getRowClassName">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="tiktokId" :label="$t('influencer.tiktokId')" min-width="160" fixed="left">
          <template #default="{ row }">
            <div class="tiktok-id-wrapper">
              <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.tiktokId }}</span>
              <div class="order-badges" v-if="influencerOrderStats[row._id] !== undefined">
                <span v-if="influencerOrderStats[row._id]?.lastWeekCount > 0" class="order-badge week" title="最近一周成单">
                  📦 {{ influencerOrderStats[row._id].lastWeekCount }}
                </span>
                <span v-if="influencerOrderStats[row._id]?.lastMonthCount >= 10" class="order-badge month-10" title="最近一个月成单10个以上">
                  📊 10+
                </span>
                <span v-if="influencerOrderStats[row._id]?.lastMonthCount >= 100" class="order-badge month-100" title="最近一个月成单100个以上">
                  ⭐ 100+
                </span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.bd')" width="80" fixed="left">
          <template #default="{ row }">
            <el-tag v-if="row.poolType === 'public'" type="info">{{ $t('influencer.publicSea') }}</el-tag>
            <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tiktokName" :label="$t('influencer.tiktokName')" min-width="150" />
        <el-table-column :label="$t('influencer.influencerParams')" width="200">
          <template #default="{ row }">
            <div>{{ $t('influencer.followers') }}: {{ formatFollowers(row.latestFollowers) }}</div>
            <div>
              <el-tooltip content="月销金额" placement="top">
                <span>GMV: {{ row.latestGmv || 0 }}</span>
              </el-tooltip>
            </div>
            <div>{{ $t('influencer.monthlySalesCount') }}: {{ row.monthlySalesCount || 0 }}</div>
            <div>{{ $t('influencer.avgVideoViews') }}: {{ row.avgVideoViews || 0 }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.suitableCategories')" width="150">
          <template #default="{ row }">
            <el-tag v-for="cat in row.suitableCategories" :key="cat._id" size="small" type="success">{{ cat.name }}</el-tag>
            <span v-if="!row.suitableCategories || row.suitableCategories.length === 0" class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.categoryTag')" width="120">
          <template #default="{ row }">
            <el-tag v-for="tag in row.categoryTags" :key="tag._id" size="small">{{ tag.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.latestMaintenance')" width="180">
          <template #default="{ row }">
            <div class="maintenance-info">
              <div>{{ $t('common.time') }}: {{ formatDate(row.latestMaintenanceTime) }}</div>
              <div>{{ $t('influencer.maintainer') }}: {{ row.latestMaintainerName || '-' }}</div>
              <div v-if="row.latestRemark" class="remark-text">{{ $t('common.remark') }}: {{ row.latestRemark }}</div>
              <div v-else class="remark-empty">{{ $t('common.remark') }}: -</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.maintenanceStatus')" width="100">
          <template #default="{ row }">
            <el-tag :type="getMaintenanceStatusType(row.maintenanceStatus)" size="small">
              {{ getMaintenanceStatusText(row.maintenanceStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('influencer.blacklist')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isBlacklisted" type="danger" size="small">{{ $t('influencer.blacklisted') }}</el-tag>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.operation')" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isBlacklisted && hasPermission('influencers:update')" link type="primary" @click="editInfluencer(row)">{{ $t('influencer.edit') }}</el-button>
            <el-button v-if="row.isBlacklisted" link type="info" disabled>{{ $t('influencer.frozen') }}</el-button>
            <el-button v-if="hasPermission('orders:read')" link type="success" @click="goToOrders(row)">{{ $t('influencer.viewOrders') }}</el-button>
            <el-button v-if="row.poolType === 'public' && !row.isBlacklisted && hasPermission('influencers:update')" link type="warning" @click="claimInfluencer(row)">{{ $t('influencer.claim') }}</el-button>
            <el-button v-if="row.poolType === 'private' && !row.isBlacklisted && hasPermission('influencers:update')" link type="danger" @click="releaseInfluencer(row)">{{ $t('influencer.release') }}</el-button>
            <el-button v-if="!row.isBlacklisted && hasPermission('influencers:update')" link type="danger" @click="addToBlacklist(row)">{{ $t('influencer.blacklist') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper" v-if="activeTab === 'list'">
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
        </el-tab-pane>

        <!-- 小黑屋页签 -->
        <el-tab-pane :label="$t('menu.blacklist')" name="blacklist">
          <!-- 搜索筛选 -->
          <div class="filter-section">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-input v-model="blacklistFilters.keyword" :placeholder="$t('influencer.searchInfluencerPlaceholder')" clearable @change="loadBlacklist">
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
            </el-row>
          </div>

          <!-- 黑名单列表 -->
          <el-table :data="blacklistInfluencers" stripe v-loading="blacklistLoading" :row-class-name="getRowClassName">
            <el-table-column prop="tiktokId" :label="$t('influencer.tiktokId')" min-width="160" fixed="left">
              <template #default="{ row }">
                <span class="tiktok-id-cell clickable" @click="viewDetail(row)">{{ row.tiktokId }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="tiktokName" :label="$t('influencer.tiktokName')" min-width="150" />
            <el-table-column :label="$t('influencer.bd')" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.poolType === 'public'" type="info">{{ $t('influencer.publicSea') }}</el-tag>
                <el-tag v-else type="success">{{ row.assignedTo?.realName || row.assignedTo?.username || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('influencer.latestGmv')" width="150">
              <template #default="{ row }">
                <div>{{ $t('influencer.followers') }}: {{ formatFollowers(row.latestFollowers) }}</div>
                <div>
                  <el-tooltip content="月销金额" placement="top">
                    <span>GMV: {{ row.latestGmv }}</span>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('influencer.blacklistInfo')" width="200">
              <template #default="{ row }">
                <div>{{ row.blacklistedByName || '-' }} {{ formatDate(row.blacklistedAt) }}</div>
                <div v-if="row.blacklistReason" class="remark-text">{{ row.blacklistReason }}</div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.operation')" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="success" @click="releaseFromBlacklist(row)" v-if="hasPermission('influencers:update')">{{ $t('influencer.release') }}</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="blacklistPagination.page"
              v-model:page-size="blacklistPagination.limit"
              :total="blacklistPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadBlacklist"
              @current-change="loadBlacklist"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingInfluencer ? $t('influencer.editInfluencer') : $t('influencer.addInfluencer')"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" label-position="right">

        <!-- 头部信息区 -->
        <div class="edit-header">
          <div class="edit-avatar">
            <el-icon :size="40"><User /></el-icon>
          </div>
          <div class="edit-title-area">
            <div class="edit-id-row">
              <el-form-item :label="$t('influencer.tiktokId')" prop="tiktokId" required class="tiktok-green-label inline-form-item">
                <el-input v-model="form.tiktokId" :placeholder="$t('common.input') + $t('influencer.tiktokId')" class="tiktok-green-input" />
              </el-form-item>
              <el-form-item :label="$t('common.status')" prop="status" required class="inline-form-item">
                <el-radio-group v-model="form.status">
                  <el-radio value="enabled">{{ $t('common.enable') }}</el-radio>
                  <el-radio value="disabled">{{ $t('common.disable') }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
          </div>
        </div>

        <!-- 基础信息 -->
        <div class="edit-section">
          <div class="edit-section-title">
            <span>{{ $t('influencer.tiktokInfo') }}</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('influencer.tiktokName')" prop="tiktokName" required>
                <el-input v-model="form.tiktokName" :placeholder="$t('common.input') + $t('influencer.tiktokName')" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('influencer.originalTiktokId')" class="tiktok-green-label">
                <el-input v-model="form.originalTiktokId" :placeholder="$t('influencer.originalTiktokIdTip')" class="tiktok-green-input" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('influencer.formerNames')">
                <el-input v-model="form.formerNames" :placeholder="$t('influencer.formerNamesTip')" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('influencer.formerIds')">
                <el-input v-model="form.formerIds" :placeholder="$t('influencer.formerIdsTip')" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 数据指标 -->
        <div class="edit-section">
          <div class="edit-section-title">
            <span>{{ $t('influencer.influencerParams') }}</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item :label="$t('influencer.latestFollowersNum')">
                <el-input-number v-model="editDisplayFollowers" :min="0" :controls="false" placeholder="K" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('influencer.latestGmvAmount')">
                <el-input-number v-model="form.latestGmv" :min="0" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('influencer.monthlySalesCount')">
                <el-input-number v-model="form.monthlySalesCount" :min="0" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('influencer.avgVideoViews')">
                <el-input-number v-model="form.avgVideoViews" :min="0" :controls="false" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 分类标签 -->
        <div class="edit-section">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('influencer.categoryTag')">
                <el-select v-model="form.categoryTags" multiple :placeholder="$t('common.select')" style="width: 100%">
                  <el-option v-for="tag in categoryTags" :key="tag._id" :label="tag.name" :value="tag._id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('influencer.suitableCategories')">
                <el-select v-model="form.suitableCategories" multiple :placeholder="$t('common.select')" style="width: 100%">
                  <el-option v-for="cat in suitableCategoryOptions" :key="cat._id" :label="cat.name" :value="cat._id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 个人信息 -->
        <div class="edit-section">
          <div class="edit-section-title">
            <span>{{ $t('influencer.personalInfo') || $t('user.realName') }}</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('influencer.realName')">
                <el-input v-model="form.realName" :placeholder="$t('influencer.realNameTip')" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('influencer.nickname')">
                <el-input v-model="form.nickname" :placeholder="$t('influencer.nicknameTip')" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('influencer.gender')">
                <el-radio-group v-model="form.gender">
                  <el-radio value="male">{{ $t('influencer.male') }}</el-radio>
                  <el-radio value="female">{{ $t('influencer.female') }}</el-radio>
                  <el-radio value="other">{{ $t('influencer.other') }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 联系方式 -->
        <div class="edit-section">
          <div class="edit-section-title">
            <span>{{ $t('influencer.contactInfo') }}</span>
          </div>
          <el-form-item :label="$t('influencer.phone')">
            <div class="dynamic-inputs">
              <div v-for="(phone, index) in form.phoneNumbers" :key="'phone-' + index" class="input-item">
                <el-input v-model="form.phoneNumbers[index]" :placeholder="$t('influencer.phoneTip')" />
                <el-button v-if="form.phoneNumbers.length > 1" type="danger" link @click="removePhone(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button type="primary" link @click="addPhone" class="add-btn">
                <el-icon><Plus /></el-icon> {{ $t('influencer.addPhone') }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item :label="$t('influencer.address')">
            <div class="dynamic-inputs">
              <div v-for="(address, index) in form.addresses" :key="'address-' + index" class="input-item">
                <el-input v-model="form.addresses[index]" :placeholder="$t('influencer.addressTip')" />
                <el-button v-if="form.addresses.length > 1" type="danger" link @click="removeAddress(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button type="primary" link @click="addAddress" class="add-btn">
                <el-icon><Plus /></el-icon> {{ $t('influencer.addAddress') }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item :label="$t('influencer.socialAccount')">
            <div class="dynamic-inputs">
              <div v-for="(social, index) in form.socialAccounts" :key="'social-' + index" class="input-item">
                <el-input v-model="form.socialAccounts[index]" :placeholder="$t('influencer.socialAccountTip')" />
                <el-button v-if="form.socialAccounts.length > 1" type="danger" link @click="removeSocial(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button type="primary" link @click="addSocial" class="add-btn">
                <el-icon><Plus /></el-icon> {{ $t('influencer.addSocial') }}
              </el-button>
            </div>
          </el-form-item>
        </div>

      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false" size="large">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSubmit" size="large">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="currentInfluencer?.isBlacklisted ? $t('influencer.influencerDetailBlacklist') : $t('influencer.influencerDetail')"
      width="900px"
      :class="currentInfluencer?.isBlacklisted ? 'detail-dialog-blacklist' : ''">
      <div v-if="currentInfluencer" :class="currentInfluencer.isBlacklisted ? 'detail-content-blacklist' : ''">

        <!-- 黑名单警告 -->
        <el-alert
          v-if="currentInfluencer.isBlacklisted"
          :title="$t('influencer.influencerBlacklistedWarning')"
          type="error"
          :description="`${$t('influencer.blacklistTime')}：${formatDate(currentInfluencer.blacklistedAt)} | ${$t('influencer.blacklistedBy')}：${currentInfluencer.blacklistedByName || '-'} | ${$t('influencer.reason')}：${currentInfluencer.blacklistReason || '-'}`"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <!-- 头部区域 -->
        <div class="detail-header">
          <div class="detail-avatar">
            <el-icon :size="48"><User /></el-icon>
          </div>
          <div class="detail-title">
            <div class="detail-id-row">
              <span class="detail-tiktok-id">{{ currentInfluencer.tiktokId }}</span>
              <el-tag :type="currentInfluencer.status === 'enabled' ? 'success' : 'info'" size="small">
                {{ currentInfluencer.status === 'enabled' ? $t('common.enabled') : $t('common.disabled') }}
              </el-tag>
              <el-tag v-if="currentInfluencer.isBlacklisted" type="danger" size="small">{{ $t('influencer.blacklisted') }}</el-tag>
            </div>
            <div class="detail-name">{{ currentInfluencer.tiktokName || '-' }}</div>
            <div class="detail-bd">
              <span class="bd-label">BD:</span>
              <el-tag v-if="currentInfluencer.poolType === 'public'" type="info" size="small">{{ $t('influencer.publicSea') }}</el-tag>
              <span v-else>{{ currentInfluencer.assignedTo?.realName || currentInfluencer.assignedTo?.username || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 核心指标卡片 -->
        <div class="detail-stats">
          <div class="stat-card">
            <div class="stat-label">{{ $t('influencer.latestFollowersNum') }}</div>
            <div class="stat-value">{{ formatFollowers(currentInfluencer.latestFollowers) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('influencer.latestGmvAmount') }}</div>
            <div class="stat-value">{{ currentInfluencer.latestGmv || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('influencer.monthlySalesCount') }}</div>
            <div class="stat-value">{{ currentInfluencer.monthlySalesCount || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('influencer.avgVideoViews') }}</div>
            <div class="stat-value">{{ currentInfluencer.avgVideoViews || 0 }}</div>
          </div>
        </div>

        <!-- 基本信息和联系方式 -->
        <div class="detail-info-grid">
          <div class="info-section">
            <div class="section-title">{{ $t('influencer.basicInfo') }}</div>
            <div class="info-row" v-if="currentInfluencer.realName">
              <span class="info-label">{{ $t('influencer.realName') }}</span>
              <span class="info-value">{{ currentInfluencer.realName }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.nickname">
              <span class="info-label">{{ $t('influencer.nickname') }}</span>
              <span class="info-value">{{ currentInfluencer.nickname }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.gender">
              <span class="info-label">{{ $t('influencer.gender') }}</span>
              <span class="info-value">{{ getGenderText(currentInfluencer.gender) }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.formerIds">
              <span class="info-label">{{ $t('influencer.formerIds') }}</span>
              <span class="info-value">{{ currentInfluencer.formerIds }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.formerNames">
              <span class="info-label">{{ $t('influencer.formerNames') }}</span>
              <span class="info-value">{{ currentInfluencer.formerNames }}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="section-title">{{ $t('influencer.contactInfo') }}</div>
            <div class="info-row" v-if="currentInfluencer.phoneNumbers?.length">
              <span class="info-label">{{ $t('influencer.phoneNumbers') }}</span>
              <span class="info-value">{{ currentInfluencer.phoneNumbers.filter(p => p).join(', ') }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.addresses?.length">
              <span class="info-label">{{ $t('influencer.addresses') }}</span>
              <span class="info-value">{{ currentInfluencer.addresses.filter(a => a).join(', ') }}</span>
            </div>
            <div class="info-row" v-if="currentInfluencer.socialAccounts?.length">
              <span class="info-label">{{ $t('influencer.socialAccounts') }}</span>
              <span class="info-value">{{ currentInfluencer.socialAccounts.filter(s => s).join(', ') }}</span>
            </div>
          </div>
        </div>

        <!-- 分类标签 -->
        <div class="detail-tags" v-if="currentInfluencer.suitableCategories?.length || currentInfluencer.categoryTags?.length">
          <div class="tag-group" v-if="currentInfluencer.suitableCategories?.length">
            <span class="tag-label">{{ $t('influencer.suitableCategories') }}:</span>
            <el-tag v-for="cat in currentInfluencer.suitableCategories" :key="cat._id" type="success" size="small">{{ cat.name }}</el-tag>
          </div>
          <div class="tag-group" v-if="currentInfluencer.categoryTags?.length">
            <span class="tag-label">{{ $t('influencer.categoryTag') }}:</span>
            <el-tag v-for="tag in currentInfluencer.categoryTags" :key="tag._id" size="small">{{ tag.name }}</el-tag>
          </div>
        </div>

        <!-- 最新维护信息 -->
        <div class="latest-maintenance">
          <div class="maintenance-header">
            <span class="maintenance-title">{{ $t('influencer.latestMaintenance') }}</span>
            <el-tag :type="getMaintenanceStatusType(currentInfluencer.maintenanceStatus)" size="small">
              {{ getMaintenanceStatusText(currentInfluencer.maintenanceStatus) }}
            </el-tag>
          </div>
          <div class="maintenance-content">
            <span class="maintenance-time">{{ formatDate(currentInfluencer.latestMaintenanceTime) }}</span>
            <span class="maintenance-sep">|</span>
            <span class="maintenance-person">{{ $t('influencer.maintainer') }}: {{ currentInfluencer.latestMaintainerName || '-' }}</span>
            <span class="maintenance-sep" v-if="currentInfluencer.latestRemark">|</span>
            <span class="maintenance-remark" v-if="currentInfluencer.latestRemark">{{ currentInfluencer.latestRemark }}</span>
          </div>
        </div>

        <!-- 维护历史 -->
        <div class="maintenance-history">
          <div class="history-header">
            <span class="history-title">{{ $t('influencer.maintenanceRecord') }}</span>
            <el-button v-if="!currentInfluencer.isBlacklisted" type="primary" size="small" @click="showMaintenanceForm = !showMaintenanceForm">
              {{ showMaintenanceForm ? $t('common.close') : $t('influencer.addRecord') }}
            </el-button>
          </div>

          <!-- 添加维护表单（可收起） -->
          <div v-if="showMaintenanceForm && !currentInfluencer.isBlacklisted" class="maintenance-form">
            <el-form :model="maintenanceForm" label-width="80px">
              <el-row :gutter="16">
                <el-col :span="6">
                  <el-form-item :label="$t('influencer.followers')">
                    <el-input-number v-model="displayFollowers" :min="0" :controls="false" placeholder="K" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item :label="$t('influencer.latestGmv')">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <el-tooltip content="月销金额" placement="top">
                        <span style="font-size: 12px; color: #909399; cursor: help;">(?)</span>
                      </el-tooltip>
                      <span style="font-size: 12px; color: #606266;">{{ currentDefaultCurrencySymbol }}</span>
                      <el-input-number v-model="maintenanceForm.gmv" :min="0" :controls="false" style="flex: 1" />
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item :label="$t('influencer.monthlySalesCount')">
                    <el-input-number v-model="maintenanceForm.monthlySalesCount" :min="0" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="6">
                  <el-form-item :label="$t('influencer.avgVideoViews')">
                    <el-input-number v-model="maintenanceForm.avgVideoViews" :min="0" :controls="false" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="16">
                <el-col :span="24">
                  <el-form-item :label="$t('common.remark')">
                    <el-input v-model="maintenanceForm.remark" placeholder="选填" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-button type="primary" @click="addMaintenance">{{ $t('influencer.submitRecord') }}</el-button>
            </el-form>
          </div>

          <!-- 维护记录表格 -->
          <el-table :data="maintenances" stripe size="small">
            <el-table-column prop="createdAt" :label="$t('common.time')" width="160">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column :label="$t('influencer.followers')" width="90">
              <template #default="{ row }">{{ formatFollowers(row.followers) }}</template>
            </el-table-column>
            <el-table-column prop="gmv" :label="$t('influencer.latestGmv')" width="120">
              <template #default="{ row }">
                <span>{{ row.currency || currentDefaultCurrencySymbol }}{{ row.gmv || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="monthlySalesCount" :label="$t('influencer.monthlySalesCount')" width="90" />
            <el-table-column prop="avgVideoViews" :label="$t('influencer.avgVideoViews')" width="100" />
            <el-table-column prop="maintainerName" :label="$t('influencer.maintainer')" width="100" />
            <el-table-column prop="remark" :label="$t('common.remark')" />
          </el-table>
        </div>

      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete, User } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import AuthManager from '@/utils/auth'

const { t } = useI18n()

const router = useRouter()

const userStore = useUserStore()

// 权限检查函数
const hasPermission = (perm) => AuthManager.hasPermission(perm)

const activeTab = ref('list')
const influencers = ref([])
const categoryTags = ref([])
const suitableCategoryOptions = ref([])
const selectedIds = ref([])
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showMaintenanceForm = ref(false)
const editingInfluencer = ref(null)
const currentInfluencer = ref(null)
const maintenances = ref([])

// 编辑表单的K单位粉丝数
const editDisplayFollowers = ref(0)

// 黑名单相关
const blacklistInfluencers = ref([])
const blacklistLoading = ref(false)
const blacklistFilters = reactive({ keyword: '' })
const blacklistPagination = reactive({ page: 1, limit: 20, total: 0 })

const filters = reactive({
  poolType: '',
  status: '',
  categoryTag: '',
  keyword: '',
  gmvFrom: '',
  monthlySalesFrom: '',
  followersFrom: '',
  avgViewsFrom: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 达人订单统计
const influencerOrderStats = ref({})

const form = reactive({
  tiktokName: '',
  tiktokId: '',
  formerNames: '',
  formerIds: '',
  originalTiktokId: '',
  status: 'enabled',
  categoryTags: [],
  suitableCategories: [],
  latestFollowers: 0,
  latestGmv: 0,
  monthlySalesCount: 0,
  avgVideoViews: 0,
  realName: '',
  nickname: '',
  gender: 'other',
  addresses: [''],
  phoneNumbers: [''],
  socialAccounts: ['']
})

const rules = {
  tiktokName: [{ required: true, message: t('common.input') + t('influencer.tiktokName'), trigger: 'blur' }],
  tiktokId: [{ required: true, message: t('common.input') + t('influencer.tiktokId'), trigger: 'blur' }],
  status: [{ required: true, message: t('common.select') + t('common.status'), trigger: 'change' }]
}

const maintenanceForm = reactive({
  followers: 0,
  gmv: 0,
  currency: '',
  monthlySalesCount: 0,
  avgVideoViews: 0,
  remark: ''
})

// 粉丝数输入显示（K为单位）
const displayFollowers = ref(0)
const displayFollowersFrom = ref(null)

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
      maintenanceForm.currency = defaultCurrency.code
    }
  } catch (error) {
    console.error('Load currencies error:', error)
  }
}

// 获取当前默认货币符号
const currentDefaultCurrencySymbol = computed(() => {
  const defaultCurrency = currencyList.value.find(c => c.isDefault)
  return defaultCurrency?.symbol || '¥'
})

const addPhone = () => {
  form.phoneNumbers.push('')
}

const removePhone = (index) => {
  if (form.phoneNumbers.length > 1) {
    form.phoneNumbers.splice(index, 1)
  }
}

const addAddress = () => {
  form.addresses.push('')
}

const removeAddress = (index) => {
  if (form.addresses.length > 1) {
    form.addresses.splice(index, 1)
  }
}

const addSocial = () => {
  form.socialAccounts.push('')
}

const removeSocial = (index) => {
  if (form.socialAccounts.length > 1) {
    form.socialAccounts.splice(index, 1)
  }
}

const loadCategoryTags = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'influencerCategory', limit: 1000 }
    })
    categoryTags.value = res.data?.data || res.data || []
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
  }
}

const loadSuitableCategories = async () => {
  try {
    const res = await request.get('/base-data', {
      params: { type: 'category', limit: 1000 }
    })
    suitableCategoryOptions.value = res.data?.data || res.data || []
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
  }
}

const loadData = async () => {
  try {
    const params = {
      companyId: userStore.companyId,
      ...filters,
      page: pagination.page,
      limit: pagination.limit
    }
    // 粉丝数筛选：K转回原始值
    if (displayFollowersFrom.value !== null && displayFollowersFrom.value !== '') {
      params.followersFrom = parseFollowersToDb(displayFollowersFrom.value)
    }
    // 过滤掉空字符串的筛选条件
    Object.keys(params).forEach(key => {
      if (params[key] === '') delete params[key]
    })
    const res = await request.get('/influencer-managements', { params })
    influencers.value = res.influencers || []
    pagination.total = res.total || 0
    pagination.page = res.page || 1

    // 加载达人订单统计
    loadInfluencerOrderStats()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  }
}

// 粉丝数筛选变化处理
const handleFollowersFilterChange = () => {
  loadData()
}

// 页签切换
const handleTabChange = (tabName) => {
  if (tabName === 'blacklist') {
    loadBlacklist()
  }
}

// 加载黑名单列表
const loadBlacklist = async () => {
  blacklistLoading.value = true
  try {
    const params = {
      companyId: userStore.companyId,
      keyword: blacklistFilters.keyword,
      page: blacklistPagination.page,
      limit: blacklistPagination.limit
    }
    const res = await request.get('/influencer-managements/blacklist/list', { params })
    blacklistInfluencers.value = res.influencers || []
    blacklistPagination.total = res.total || 0
    blacklistPagination.page = res.page || 1
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  } finally {
    blacklistLoading.value = false
  }
}

// 跳转到 TikTok 订单页面
const goToOrders = (row) => {
  router.push({
    path: '/orders',
    query: { influencer: row.tiktokId }
  })
}

// 加载达人订单统计
const loadInfluencerOrderStats = async () => {
  try {
    const influencerIds = influencers.value.map(i => i._id).join(',')
    if (!influencerIds) return

    const res = await request.get('/product-stats/influencer-order-stats', {
      params: {
        companyId: userStore.companyId,
        influencerIds
      }
    })

    console.log('达人订单统计返回:', res)
    console.log('达人订单统计详情:', JSON.stringify(res))
    // 可能是直接返回数组或 { success, data } 结构
    const data = res.data || res
    if (Array.isArray(data)) {
      const statsMap = {}
      data.forEach(item => {
        statsMap[item.influencerId] = item.stats
      })
      influencerOrderStats.value = statsMap
      console.log('达人订单统计Map:', statsMap)
    }
  } catch (error) {
    console.error('加载达人订单统计失败:', error)
  }
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item._id)
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 粉丝数格式化：展示时除1000，加K后缀
const formatFollowers = (value) => {
  if (!value && value !== 0) return '-'
  const k = value / 1000
  if (k >= 1) {
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return value.toString()
}

// 粉丝数反向转换：输入值乘1000存入数据库
const parseFollowersToDb = (value) => {
  if (!value && value !== 0) return 0
  return Math.round(value * 1000)
}

const getGenderText = (gender) => {
  const map = { male: t('influencer.male'), female: t('influencer.female'), other: t('influencer.other') }
  return map[gender] || t('influencer.other')
}

const getMaintenanceStatusText = (status) => {
  const map = {
    public: t('influencer.maintenancePublic'),
    normal: t('influencer.maintenanceNormal'),
    maintenance_needed: t('influencer.maintenanceNeeded'),
    at_risk: t('influencer.atRisk'),
    about_to_release: t('influencer.aboutToRelease'),
    released: t('influencer.released'),
    pending: t('influencer.maintenanceNeeded')
  }
  return map[status] || status
}

const getMaintenanceStatusType = (status) => {
  const map = {
    public: 'info',
    normal: 'success',
    maintenance_needed: 'warning',
    at_risk: 'danger',
    about_to_release: 'danger',
    released: 'info',
    pending: 'warning'
  }
  return map[status] || ''
}

// 获取行样式
const getRowClassName = ({ row }) => {
  return row.isBlacklisted ? 'blacklist-row' : ''
}

// 标记黑名单
const addToBlacklist = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('influencer.blacklistConfirmTip', { name: row.tiktokId }),
      t('influencer.blacklistConfirm'),
      { type: 'warning' }
    )

    const { value: reason } = await ElMessageBox.prompt(t('influencer.blacklistReasonTip'), t('influencer.blacklistReasonTitle'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel')
    })

    await request.post(`/influencer-managements/${row._id}/blacklist`, { reason: reason || '' })
    ElMessage.success(t('influencer.blacklistSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
    }
  }
}

// 释放黑名单
const releaseFromBlacklist = async (row) => {
  try {
    await ElMessageBox.confirm(
      t('influencer.releaseConfirmTip', { name: row.tiktokId }),
      t('influencer.releaseConfirm'),
      { type: 'warning' }
    )

    await request.post(`/influencer-managements/${row._id}/release-blacklist`)
    ElMessage.success(t('influencer.releaseBlacklistSuccess'))
    // 如果当前在小黑屋页面，刷新列表
    if (activeTab.value === 'blacklist') {
      loadBlacklist()
    } else {
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
    }
  }
}

const handleSubmit = async () => {
  if (editingInfluencer.value) {
    await updateInfluencer()
  } else {
    await createInfluencer()
  }
}

const createInfluencer = async () => {
  try {
    // 准备提交数据
    const submitData = {
      companyId: userStore.companyId,
      tiktokName: form.tiktokName,
      tiktokId: form.tiktokId,
      formerNames: form.formerNames,
      formerIds: form.formerIds,
      originalTiktokId: form.originalTiktokId,
      status: form.status,
      categoryTags: form.categoryTags,
      suitableCategories: form.suitableCategories,
      latestFollowers: parseFollowersToDb(editDisplayFollowers.value),
      latestGmv: form.latestGmv,
      monthlySalesCount: form.monthlySalesCount,
      avgVideoViews: form.avgVideoViews,
      realName: form.realName,
      nickname: form.nickname,
      gender: form.gender,
      phoneNumbers: form.phoneNumbers.filter(p => p.trim()),
      addresses: form.addresses.filter(a => a.trim()),
      socialAccounts: form.socialAccounts.filter(s => s.trim())
    }

    console.log('创建达人 - 前端提交数据:', JSON.stringify(submitData, null, 2))

    await request.post('/influencer-managements', submitData)
    ElMessage.success(t('influencer.createSuccess'))
    showCreateDialog.value = false
    resetForm()
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
  }
}

const updateInfluencer = async () => {
  try {
    const data = {
      ...form,
      latestFollowers: parseFollowersToDb(editDisplayFollowers.value),
      phoneNumbers: form.phoneNumbers.filter(p => p.trim()),
      addresses: form.addresses.filter(a => a.trim()),
      socialAccounts: form.socialAccounts.filter(s => s.trim())
    }
    await request.put(`/influencer-managements/${editingInfluencer.value._id}`, data)
    ElMessage.success(t('influencer.updateSuccess'))
    showCreateDialog.value = false
    editingInfluencer.value = null
    resetForm()
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
  }
}

const editInfluencer = (row) => {
  // 检查是否为黑名单达人
  if (row.isBlacklisted) {
    ElMessage.warning(t('influencer.cannotEditBlacklist'))
    return
  }
  editingInfluencer.value = row
  Object.assign(form, {
    tiktokName: row.tiktokName,
    tiktokId: row.tiktokId,
    formerNames: row.formerNames,
    formerIds: row.formerIds,
    originalTiktokId: row.originalTiktokId,
    status: row.status,
    categoryTags: (row.categoryTags || []).map(t => t._id || t),
    suitableCategories: (row.suitableCategories || []).map(c => c._id || c),
    latestFollowers: row.latestFollowers || 0,
    latestGmv: row.latestGmv || 0,
    monthlySalesCount: row.monthlySalesCount || 0,
    avgVideoViews: row.avgVideoViews || 0,
    realName: row.realName,
    nickname: row.nickname,
    gender: row.gender,
    addresses: (row.addresses || []).length > 0 ? [...row.addresses] : [''],
    phoneNumbers: (row.phoneNumbers || []).length > 0 ? [...row.phoneNumbers] : [''],
    socialAccounts: (row.socialAccounts || []).length > 0 ? [...row.socialAccounts] : ['']
  })
  // 设置K单位粉丝数
  editDisplayFollowers.value = row.latestFollowers ? row.latestFollowers / 1000 : 0
  showCreateDialog.value = true
}

const viewDetail = async (row) => {
  try {
    currentInfluencer.value = row
    const res = await request.get(`/influencer-managements/${row._id}`)
    maintenances.value = res.maintenances || []
    showDetailDialog.value = true
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  }
}

const addMaintenance = async () => {
  try {
    const payload = {
      ...maintenanceForm,
      followers: parseFollowersToDb(displayFollowers.value)
    }
    await request.post(`/influencer-managements/${currentInfluencer.value._id}/maintenance`, payload)
    ElMessage.success(t('influencer.addRecordSuccess'))
    displayFollowers.value = 0
    maintenanceForm.gmv = 0
    maintenanceForm.monthlySalesCount = 0
    maintenanceForm.avgVideoViews = 0
    maintenanceForm.remark = ''
    viewDetail(currentInfluencer.value)
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(t('influencer.loadFailed'))
  }
}

const claimInfluencer = async (row) => {
  try {
    await request.post(`/influencer-managements/${row._id}/claim`)
    ElMessage.success(t('influencer.claimSuccess'))
    loadData()
  } catch (error) {
    console.error(t('influencer.loadFailed') + ':', error)
    ElMessage.error(error.message || t('influencer.loadFailed'))
  }
}

const releaseInfluencer = async (row) => {
  try {
    await ElMessageBox.confirm(t('influencer.releaseToPublicConfirm'), t('common.info'), {
      type: 'warning'
    })
    await request.post(`/influencer-managements/${row._id}/release`)
    ElMessage.success(t('influencer.releaseSuccess'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(t('influencer.loadFailed') + ':', error)
      ElMessage.error(t('influencer.loadFailed'))
    }
  }
}

const batchClaim = async () => {
  try {
    await request.post('/influencer-managements/batch', {
      action: 'claim',
      influencerIds: selectedIds.value
    })
    ElMessage.success('批量领取成功')
    selectedIds.value = []
    loadData()
  } catch (error) {
    console.error('批量领取失败:', error)
    ElMessage.error('批量领取失败')
  }
}

const batchRelease = async () => {
  try {
    await ElMessageBox.confirm(`确定要释放选中的${selectedIds.value.length}个达人到公海吗?`, '提示', {
      type: 'warning'
    })
    await request.post('/influencer-managements/batch', {
      action: 'release',
      influencerIds: selectedIds.value
    })
    ElMessage.success('批量释放成功')
    selectedIds.value = []
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量释放失败:', error)
      ElMessage.error('批量释放失败')
    }
  }
}

const resetForm = () => {
  Object.assign(form, {
    tiktokName: '',
    tiktokId: '',
    formerNames: '',
    formerIds: '',
    originalTiktokId: '',
    status: 'enabled',
    categoryTags: [],
    suitableCategories: [],
    monthlySalesCount: 0,
    avgVideoViews: 0,
    realName: '',
    nickname: '',
    gender: 'other',
    addresses: [''],
    phoneNumbers: [''],
    socialAccounts: ['']
  })
}

onMounted(() => {
  loadCategoryTags()
  loadSuitableCategories()
  
  // 从 URL 读取筛选参数
  const urlParams = new URLSearchParams(window.location.search)
  const gmvFrom = urlParams.get('gmvFrom')
  const monthlySalesFrom = urlParams.get('monthlySalesFrom')
  const followersFrom = urlParams.get('followersFrom')
  const avgViewsFrom = urlParams.get('avgViewsFrom')
  
  filters.gmvFrom = gmvFrom ? parseFloat(gmvFrom) : null
  filters.monthlySalesFrom = monthlySalesFrom ? parseInt(monthlySalesFrom) : null
  filters.followersFrom = followersFrom ? parseInt(followersFrom) : null
  filters.avgViewsFrom = avgViewsFrom ? parseFloat(avgViewsFrom) : null
  
  loadData()
  loadCurrencies()
})
</script>

<style scoped>
.influencer-management-page {
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

.filter-section {
  margin-bottom: 20px;
}

.filter-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
  text-align: center;
}

.batch-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.filter-row {
  margin-bottom: 12px;
}

.batch-actions-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.selected-count {
  font-size: 13px;
  color: #606266;
  margin-left: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.remark-text {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.remark-empty {
  font-size: 12px;
  color: #ccc;
}

.maintenance-info {
  font-size: 12px;
  line-height: 1.6;
}

/* 表单样式 */
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #dee2e6;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
}

.section-desc {
  font-size: 13px;
  color: #6c757d;
}

.form-tip {
  font-size: 12px;
  color: #868e96;
  margin-top: 4px;
}

.dynamic-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-item .el-input {
  flex: 1;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  margin-top: 4px;
  border: 1px dashed #409eff;
  background: #f0f7ff;
  color: #409eff;
}

.add-btn:hover {
  background: #e6f3ff;
}

/* 滚动条样式 */
.form-container::-webkit-scrollbar {
  width: 6px;
}

.form-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.form-container::-webkit-scrollbar-track {
  background: #f1f3f5;
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

/* TikTok ID 文字颜色 */
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

.tiktok-id-text {
  color: #6DAD19;
  font-weight: 500;
}

/* TikTok ID 包装器和订单统计徽章 */
.tiktok-id-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.order-badge.week {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
}

.order-badge.month-10 {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
}

.order-badge.month-100 {
  background-color: #ffebe6;
  color: #D3290F;
  border: 1px solid #D3290F;
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

/* 详情对话框黑名单样式 */
.detail-dialog-blacklist {
  background-color: #f5f5f5 !important;
  border: 2px solid #333 !important;
}

.detail-dialog-blacklist :deep(.el-dialog__body) {
  background-color: #f5f5f5;
}

.text-gray {
  color: #999;
}

/* ========================================
   达人详情弹层新样式 - 商务高级版
   ======================================== */

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* 基本信息和联系方式 */
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

/* 分类标签 */
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.tag-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

/* 最新维护信息 */
.latest-maintenance {
  padding: 12px 16px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d4edfc 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 3px solid #409eff;
}

.maintenance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.maintenance-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.maintenance-content {
  font-size: 13px;
  color: #606266;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.maintenance-time {
  font-weight: 500;
}

.maintenance-sep {
  color: #c0c4cc;
}

.maintenance-person {
  color: #409eff;
}

.maintenance-remark {
  color: #606266;
  font-style: italic;
}

/* 维护历史 */
.maintenance-history {
  margin-top: 16px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

/* 添加维护表单 */
.maintenance-form {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

/* ========================================
   编辑弹层样式
   ======================================== */

/* 编辑头部 */
.edit-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.edit-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.edit-title-area {
  flex: 1;
}

.edit-id-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.edit-id-row .inline-form-item {
  margin-bottom: 0;
}

.edit-id-row .inline-form-item :deep(.el-form-item__label) {
  width: auto !important;
  margin-right: 8px;
}

.edit-id-row .inline-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

/* 编辑区块 */
.edit-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.edit-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

/* TikTok绿色标签 */
.tiktok-green-label :deep(.el-form-item__label) {
  color: #6DAD19;
  font-weight: 500;
}

.tiktok-green-input :deep(.el-input__wrapper) {
  border-color: #6DAD19;
}

.tiktok-green-input :deep(.el-input__wrapper:hover) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}

.tiktok-green-input :deep(.el-input__wrapper.is-focus) {
  border-color: #6DAD19;
  box-shadow: 0 0 0 1px #6DAD19 inset;
}
</style>
