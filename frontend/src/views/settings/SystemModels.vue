<template>
  <div class="system-models-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h3>系统模型</h3>
          <span class="header-tip">查看所有数据表结构及主外键关系</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="model-tabs">
        <el-tab-pane label="数据表结构" name="tables">
          <el-tabs v-model="activeTable" tab-position="left" class="inner-tabs">
            <el-tab-pane
              v-for="table in tableList"
              :key="table.name"
              :label="table.name"
              :name="table.name"
            >
          <div class="table-info">
            <h4>{{ table.name }} - {{ table.description }}</h4>
          </div>

          <el-table :data="table.fields" stripe border size="small" class="field-table">
            <el-table-column prop="field" label="字段名" width="200">
              <template #default="{ row }">
                <span class="field-name">{{ row.field }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="required" label="必填" width="60" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="ref" label="关联表" width="120">
              <template #default="{ row }">
                <el-link v-if="row.ref" type="primary" :underline="false">
                  {{ row.ref }}
                </el-link>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="default" label="默认值" width="100">
              <template #default="{ row }">
                <span class="default-value">{{ row.default || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" />
          </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>

        <!-- 主外键关系页签 -->
        <el-tab-pane label="主外键关系" name="relations">
          <div class="relations-section">
            <el-alert
              title="数据模型主外键关系说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 20px"
            >
              <template #default>
                以下展示各数据表之间的主键(PK)与外键(FK)关联关系。箭头方向表示引用关系：A → B 表示A表的某个字段引用B表的主键。
              </template>
            </el-alert>

            <el-table :data="relations" stripe border size="small">
              <el-table-column prop="sourceTable" label="源表" width="180">
                <template #default="{ row }">
                  <el-tag type="primary" size="small">{{ row.sourceTable }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sourceField" label="源字段" width="180">
                <template #default="{ row }">
                  <span class="field-name">{{ row.sourceField }}</span>
                </template>
              </el-table-column>
              <el-table-column label="关系" width="80" align="center">
                <template #default="{ row }">
                  <span class="relation-arrow">→</span>
                </template>
              </el-table-column>
              <el-table-column prop="targetTable" label="目标表" width="180">
                <template #default="{ row }">
                  <el-tag type="success" size="small">{{ row.targetTable }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="targetField" label="目标字段" width="120">
                <template #default="{ row }">
                  <span class="field-name">{{ row.targetField }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.type === 'FK' ? 'warning' : 'danger'" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" min-width="200" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const activeTab = ref('tables')
const activeTable = ref('User')

// 原始外键关系数据（未排序）
const relationsData = ref([
  { sourceTable: 'User', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'User', sourceField: 'deptId', targetTable: 'Department', targetField: '_id', type: 'FK', description: '所属部门' },
  { sourceTable: 'User', sourceField: 'roleId', targetTable: 'Role', targetField: '_id', type: 'FK', description: '角色ID' },
  { sourceTable: 'Department', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Department', sourceField: 'parentId', targetTable: 'Department', targetField: '_id', type: 'FK', description: '上级部门' },
  { sourceTable: 'Department', sourceField: 'managerId', targetTable: 'User', targetField: '_id', type: 'FK', description: '部门负责人' },
  { sourceTable: 'Role', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Influencer', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Influencer', sourceField: 'assignedTo', targetTable: 'User', targetField: '_id', type: 'FK', description: '归属BD' },
  { sourceTable: 'Influencer', sourceField: 'creatorId', targetTable: 'User', targetField: '_id', type: 'FK', description: '创建人' },
  { sourceTable: 'Shop', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Shop', sourceField: 'categoryId', targetTable: 'BaseData', targetField: '_id', type: 'FK', description: '店铺类目' },
  { sourceTable: 'Product', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Product', sourceField: 'supplierId', targetTable: 'Supplier', targetField: '_id', type: 'FK', description: '供应商' },
  { sourceTable: 'Product', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '所属店铺' },
  { sourceTable: 'Product', sourceField: 'categoryId', targetTable: 'BaseData', targetField: '_id', type: 'FK', description: '商品类目' },
  { sourceTable: 'Product', sourceField: 'gradeId', targetTable: 'BaseData', targetField: '_id', type: 'FK', description: '商品等级' },
  { sourceTable: 'Product', sourceField: 'activityCommissions.activityId', targetTable: 'Activity', targetField: '_id', type: 'FK', description: '参与活动' },
  { sourceTable: 'Activity', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Activity', sourceField: 'creatorId', targetTable: 'User', targetField: '_id', type: 'FK', description: '创建人' },
  { sourceTable: 'Order', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Order', sourceField: 'influencerId', targetTable: 'Influencer', targetField: '_id', type: 'FK', description: '达人' },
  { sourceTable: 'Order', sourceField: 'productId', targetTable: 'Product', targetField: '_id', type: 'FK', description: '商品' },
  { sourceTable: 'Order', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'Order', sourceField: 'creatorId', targetTable: 'User', targetField: '_id', type: 'FK', description: '创建人' },
  { sourceTable: 'ReportOrder', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'ReportOrder', sourceField: 'influencerId', targetTable: 'Influencer', targetField: '_id', type: 'FK', description: '达人' },
  { sourceTable: 'ReportOrder', sourceField: 'productId', targetTable: 'Product', targetField: '_id', type: 'FK', description: '商品' },
  { sourceTable: 'ReportOrder', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'SampleManagement', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'SampleManagement', sourceField: 'influencerId', targetTable: 'Influencer', targetField: '_id', type: 'FK', description: '达人' },
  { sourceTable: 'SampleManagement', sourceField: 'productId', targetTable: 'Product', targetField: '_id', type: 'FK', description: '商品' },
  { sourceTable: 'SampleManagement', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'SampleManagement', sourceField: 'applicantId', targetTable: 'User', targetField: '_id', type: 'FK', description: '申请人' },
  { sourceTable: 'BdDaily', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'BdDaily', sourceField: 'userId', targetTable: 'User', targetField: '_id', type: 'FK', description: 'BD用户' },
  { sourceTable: 'Performance', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Performance', sourceField: 'userId', targetTable: 'User', targetField: '_id', type: 'FK', description: '用户' },
  { sourceTable: 'Performance', sourceField: 'influencerId', targetTable: 'Influencer', targetField: '_id', type: 'FK', description: '达人' },
  { sourceTable: 'Commission', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Commission', sourceField: 'orderId', targetTable: 'Order', targetField: '_id', type: 'FK', description: '订单' },
  { sourceTable: 'Commission', sourceField: 'userId', targetTable: 'User', targetField: '_id', type: 'FK', description: '用户' },
  { sourceTable: 'ShopContact', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'ShopContact', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'ShopRating', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'ShopRating', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'ShopTracking', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'ShopTracking', sourceField: 'shopId', targetTable: 'Shop', targetField: '_id', type: 'FK', description: '店铺' },
  { sourceTable: 'ActivityHistory', sourceField: 'activityId', targetTable: 'Activity', targetField: '_id', type: 'FK', description: '活动' },
  { sourceTable: 'ActivityHistory', sourceField: 'changedBy', targetTable: 'User', targetField: '_id', type: 'FK', description: '修改人' },
  { sourceTable: 'InfluencerMaintenance', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'InfluencerMaintenance', sourceField: 'influencerId', targetTable: 'Influencer', targetField: '_id', type: 'FK', description: '达人' },
  { sourceTable: 'InfluencerMaintenance', sourceField: 'operatorId', targetTable: 'User', targetField: '_id', type: 'FK', description: '操作人' },
  { sourceTable: 'CooperationProduct', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Bill', sourceField: 'companyId', targetTable: 'Company', targetField: '_id', type: 'FK', description: '所属公司' },
  { sourceTable: 'Bill', sourceField: 'creatorId', targetTable: 'User', targetField: '_id', type: 'FK', description: '创建人' },
])

// 原始数据表结构（未排序）
const tableData = ref([
  {
    name: 'User',
    description: '用户表 - 系统用户信息',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'deptId', type: 'ObjectId', ref: 'Department', description: '所属部门' },
      { field: 'roleId', type: 'ObjectId', ref: 'Role', description: '角色ID' },
      { field: 'role', type: 'String', default: 'bd', description: '角色类型: admin/bd/viewer' },
      { field: 'username', type: 'String', required: true, description: '用户名(唯一)' },
      { field: 'password', type: 'String', required: true, description: '密码(加密存储)' },
      { field: 'realName', type: 'String', required: true, description: '真实姓名' },
      { field: 'phone', type: 'String', default: '', description: '手机号' },
      { field: 'email', type: 'String', description: '邮箱' },
      { field: 'avatar', type: 'String', description: '头像URL' },
      { field: 'bankAccount', type: 'String', default: '', description: '银行账号' },
      { field: 'employmentStatus', type: 'String', default: 'fulltime', description: '任职状态: fulltime/parttime/nocommission' },
      { field: 'settlementType', type: 'String', default: 'monthly', description: '结算类型: monthly/weekly' },
      { field: 'settlementDay', type: 'Number', default: 15, description: '结算日: 月结1-31, 周结1-7' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive/suspended' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Company',
    description: '公司表 - 企业/组织信息',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'name', type: 'String', required: true, description: '公司名称' },
      { field: 'contact', type: 'String', description: '联系人' },
      { field: 'phone', type: 'String', description: '联系电话' },
      { field: 'email', type: 'String', description: '邮箱' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/suspended' },
      { field: 'settings', type: 'Object', description: '公司设置' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Department',
    description: '部门表 - 组织架构',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'parentId', type: 'ObjectId', ref: 'Department', description: '上级部门' },
      { field: 'name', type: 'String', required: true, description: '部门名称' },
      { field: 'description', type: 'String', description: '部门描述' },
      { field: 'managerId', type: 'ObjectId', ref: 'User', description: '部门负责人' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Role',
    description: '角色表 - 权限角色',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'code', type: 'String', required: true, description: '角色编码(唯一)' },
      { field: 'name', type: 'String', required: true, description: '角色名称' },
      { field: 'description', type: 'String', description: '角色描述' },
      { field: 'permissions', type: 'Array', description: '权限列表' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Influencer',
    description: '达人表 - TikTok达人信息',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'tiktokName', type: 'String', required: true, description: 'TikTok名称' },
      { field: 'tiktokId', type: 'String', required: true, description: 'TikTok ID' },
      { field: 'formerNames', type: 'String', description: '曾用名' },
      { field: 'formerIds', type: 'String', description: '曾用ID' },
      { field: 'originalTiktokId', type: 'String', description: '原始TikTok ID' },
      { field: 'status', type: 'String', default: 'enabled', description: '状态: enabled/disabled' },
      { field: 'categoryTags', type: 'Array', ref: 'BaseData', description: '归类标签' },
      { field: 'realName', type: 'String', description: '真实姓名' },
      { field: 'nickname', type: 'String', description: '昵称' },
      { field: 'gender', type: 'String', description: '性别: male/female/other' },
      { field: 'addresses', type: 'Array', description: '地址列表' },
      { field: 'phoneNumbers', type: 'Array', description: '电话号码列表' },
      { field: 'socialAccounts', type: 'Array', description: '社交账号列表' },
      { field: 'poolType', type: 'String', default: 'public', description: '达人池: public/private' },
      { field: 'assignedTo', type: 'ObjectId', ref: 'User', description: '归属BD' },
      { field: 'assignedAt', type: 'Date', description: '分配时间' },
      { field: 'latestFollowers', type: 'Number', description: '最新粉丝数' },
      { field: 'latestGmv', type: 'Number', description: '最新GMV' },
      { field: 'latestMaintenanceTime', type: 'Date', description: '最新维护时间' },
      { field: 'latestMaintainerId', type: 'ObjectId', ref: 'User', description: '最新维护人' },
      { field: 'latestMaintainerName', type: 'String', description: '最新维护人姓名' },
      { field: 'latestRemark', type: 'String', description: '最新备注' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Product',
    description: '商品表 - TikTok商品信息（系统管理-商品管理使用）',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'shopId', type: 'ObjectId', ref: 'Shop', description: '关联店铺' },
      { field: 'name', type: 'String', description: '商品名称' },
      { field: 'productName', type: 'String', description: '商品名称(别名)' },
      { field: 'productId', type: 'String', description: 'TikTok商品ID' },
      { field: 'tiktokProductId', type: 'String', description: 'TikTok商品ID(别名)' },
      { field: 'tiktokSku', type: 'String', description: 'TikTok SKU' },
      { field: 'sku', type: 'String', description: '商品SKU编码' },
      { field: 'productCategory', type: 'String', description: '商品类目' },
      { field: 'price', type: 'Number', description: '商品价格' },
      { field: 'currency', type: 'String', default: 'USD', description: '货币' },
      { field: 'commissionRate', type: 'Number', default: 0.15, description: '佣金率' },
      { field: 'squareCommissionRate', type: 'Number', description: '广场佣金率(小数形式，如0.08)' },
      { field: 'tapExclusiveLink', type: 'String', description: 'TAP专属链接' },
      { field: 'influencerRequirement', type: 'String', description: '达人要求' },
      { field: 'productIntro', type: 'String', description: '商品简介' },
      { field: 'referenceVideo', type: 'String', description: '参考视频' },
      { field: 'sellingPoints', type: 'String', description: '卖点' },
      { field: 'productImages', type: 'Array', description: '商品图片列表' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'CooperationProduct',
    description: '合作产品表 - 旧版商品表(已废弃，仅用于数据迁移)',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'productId', type: 'String', required: true, description: 'TikTok商品ID' },
      { field: 'productName', type: 'String', description: '商品名称' },
      { field: 'shopId', type: 'ObjectId', ref: 'Shop', description: '关联店铺' },
      { field: 'productCategory', type: 'String', description: '商品类目' },
      { field: 'squareCommissionRate', type: 'Number', description: '广场佣金率' },
      { field: 'productGrade', type: 'String', description: '商品等级: ordinary/hot/main/new' },
      { field: 'tapExclusiveLink', type: 'String', description: 'TAP专属链接' },
      { field: 'sampleMethod', type: 'String', description: '样品方式' },
      { field: 'cooperationCountry', type: 'String', description: '合作国家' },
      { field: 'sampleTarget', type: 'String', description: '样品目标' },
      { field: 'influencerRequirement', type: 'String', description: '达人要求' },
      { field: 'productImages', type: 'Array', description: '商品图片列表' },
      { field: 'productIntro', type: 'String', description: '商品介绍' },
      { field: 'referenceVideo', type: 'String', description: '参考视频' },
      { field: 'sellingPoints', type: 'String', description: '卖点' },
      { field: 'activityCommissions', type: 'Array', description: '活动佣金配置' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Shop',
    description: '店铺表 - TikTok店铺信息',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'avatar', type: 'String', description: '店铺头像' },
      { field: 'shopName', type: 'String', required: true, description: '店铺名称' },
      { field: 'shopNumber', type: 'String', required: true, description: '店铺编号(唯一)' },
      { field: 'identificationCode', type: 'String', description: '识别码(SHA256哈希值前16位)' },
      { field: 'identificationCodeGeneratedAt', type: 'Date', description: '识别码生成时间' },
      { field: 'contactAddress', type: 'String', description: '联系地址' },
      { field: 'remark', type: 'String', description: '备注' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Activity',
    description: '活动表 - TikTok营销活动（含活动配置、达人要求、佣金配置）',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'tikTokActivityId', type: 'String', description: 'TikTok活动ID' },
      { field: 'name', type: 'String', required: true, description: '活动名称' },
      { field: 'type', type: 'String', default: 'self_initiated', description: '类型: self_initiated/merchant_initiated' },
      { field: 'partnerCenter', type: 'String', description: '合作中心' },
      { field: 'tapLink', type: 'String', description: 'TAP专属链' },
      { field: 'sampleMethod', type: 'String', description: '寄样方式: 线上/线下' },
      { field: 'cooperationCountry', type: 'String', description: '合作国家' },
      { field: 'startDate', type: 'Date', required: true, description: '开始日期' },
      { field: 'endDate', type: 'Date', required: true, description: '结束日期' },
      { field: 'budget', type: 'Number', default: 0, description: '预算' },
      { field: 'description', type: 'String', description: '活动描述' },
      { field: 'status', type: 'String', default: 'pending', description: '状态: pending/upcoming/active/ended' },
      // 达人要求
      { field: 'requirementGmv', type: 'Number', default: 0, description: '要求GMV' },
      { field: 'requirementMonthlySales', type: 'Number', default: 0, description: '要求月销售件数' },
      { field: 'requirementFollowers', type: 'Number', default: 0, description: '要求粉丝数' },
      { field: 'requirementAvgViews', type: 'Number', default: 0, description: '要求月均播放量' },
      { field: 'requirementRemark', type: 'String', description: '达人要求说明' },
      // 佣金配置 - 推广时
      { field: 'promotionInfluencerRate', type: 'Number', default: 0, description: '推广时给达人(%)' },
      { field: 'promotionOriginalRate', type: 'Number', default: 0, description: '推广时原本(%)' },
      { field: 'promotionCompanyRate', type: 'Number', default: 0, description: '推广时公司自留(%)' },
      // 佣金配置 - 投广告时
      { field: 'adInfluencerRate', type: 'Number', default: 0, description: '投广告时给达人(%)' },
      { field: 'adOriginalRate', type: 'Number', default: 0, description: '投广告时原本(%)' },
      { field: 'adCompanyRate', type: 'Number', default: 0, description: '投广告时公司自留(%)' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Order',
    description: '订单表 - TikTok订单原始数据',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'influencerId', type: 'ObjectId', ref: 'Influencer', description: '达人ID' },
      { field: 'orderNo', type: 'String', required: true, description: '订单号' },
      { field: 'subOrderNo', type: 'String', description: '子订单号' },
      { field: 'influencerUsername', type: 'String', description: '达人用户名' },
      { field: 'productId', type: 'String', description: '商品ID' },
      { field: 'productName', type: 'String', description: '商品名称' },
      { field: 'sku', type: 'String', description: 'SKU' },
      { field: 'productPrice', type: 'Number', description: '商品单价' },
      { field: 'orderQuantity', type: 'Number', default: 0, description: '订单数量' },
      { field: 'shopName', type: 'String', description: '店铺名称' },
      { field: 'shopCode', type: 'String', description: '店铺代码' },
      { field: 'orderStatus', type: 'String', description: '订单状态' },
      { field: 'contentType', type: 'String', description: '内容类型' },
      { field: 'contentId', type: 'String', description: '内容ID' },
      { field: 'affiliatePartnerCommissionRate', type: 'Number', description: '联盟伙伴佣金率' },
      { field: 'creatorCommissionRate', type: 'Number', description: '创作者佣金率' },
      { field: 'serviceProviderRewardCommissionRate', type: 'Number', description: '服务商奖励佣金率' },
      { field: 'influencerRewardCommissionRate', type: 'Number', description: '达人奖励佣金率' },
      { field: 'estimatedCommissionAmount', type: 'Number', description: '预计佣金总额' },
      { field: 'actualCommissionAmount', type: 'Number', description: '实际佣金总额' },
      { field: 'returnedProductCount', type: 'Number', description: '退货数量' },
      { field: 'refundedProductCount', type: 'Number', description: '退款数量' },
      { field: 'createTime', type: 'Date', description: '订单创建时间' },
      { field: 'orderDeliveryTime', type: 'Date', description: '订单发货时间' },
      { field: 'commissionSettlementTime', type: 'Date', description: '佣金结算时间' },
      { field: 'paymentNo', type: 'String', description: '打款号' },
      { field: 'platform', type: 'String', default: 'tiktok', description: '平台' },
      { field: 'totalAmount', type: 'Number', required: true, description: '订单总金额' },
      { field: 'commissionRate', type: 'Number', default: 0.15, description: '佣金率' },
      { field: 'currency', type: 'String', default: 'USD', description: '货币' },
      { field: 'status', type: 'String', default: 'pending', description: '状态: pending/completed/cancelled' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'ReportOrder',
    description: '报表订单表 - 每日汇总订单数据',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'influencerId', type: 'ObjectId', ref: 'Influencer', description: '达人ID' },
      { field: 'userId', type: 'ObjectId', ref: 'User', description: '用户ID' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人ID' },
      { field: 'orderNo', type: 'String', description: '订单号' },
      { field: 'subOrderNo', type: 'String', description: '子订单号' },
      { field: 'influencerUsername', type: 'String', description: '达人用户名' },
      { field: 'productId', type: 'String', description: '商品ID' },
      { field: 'productName', type: 'String', description: '商品名称' },
      { field: 'sku', type: 'String', description: 'SKU' },
      { field: 'productPrice', type: 'Number', description: '商品单价' },
      { field: 'orderQuantity', type: 'Number', default: 0, description: '订单数量' },
      { field: 'shopName', type: 'String', description: '店铺名称' },
      { field: 'shopCode', type: 'String', description: '店铺代码' },
      { field: 'orderStatus', type: 'String', description: '订单状态' },
      { field: 'contentType', type: 'String', description: '内容类型' },
      { field: 'contentId', type: 'String', description: '内容ID' },
      { field: 'summaryDate', type: 'String', required: true, description: '汇总日期(YYYY-MM-DD)' },
      { field: 'bdName', type: 'String', description: '归属BD' },
      { field: 'orderCount', type: 'Number', default: 0, description: '订单数' },
      { field: 'gmv', type: 'Number', default: 0, description: 'GMV' },
      { field: 'country', type: 'String', description: '国家' },
      // 佣金率字段
      { field: 'affiliatePartnerCommissionRate', type: 'Number', description: '联盟伙伴佣金率' },
      { field: 'creatorCommissionRate', type: 'Number', description: '创作者佣金率' },
      { field: 'serviceProviderRewardCommissionRate', type: 'Number', description: '服务商奖励佣金率' },
      { field: 'influencerRewardCommissionRate', type: 'Number', description: '达人奖励佣金率' },
      { field: 'affiliateServiceProviderShopAdCommissionRate', type: 'Number', description: '联盟服务商广告佣金率' },
      { field: 'influencerShopAdCommissionRate', type: 'Number', description: '达人广告佣金率' },
      // 预计佣金
      { field: 'estimatedCommissionAmount', type: 'Number', description: '预计佣金总额' },
      { field: 'estimatedAffiliatePartnerCommission', type: 'Number', description: '预计联盟合作伙伴佣金' },
      { field: 'estimatedServiceProviderRewardCommission', type: 'Number', description: '预计服务商奖励佣金' },
      { field: 'estimatedInfluencerRewardCommission', type: 'Number', description: '预计达人奖励佣金' },
      { field: 'estimatedCreatorCommission', type: 'Number', description: '预计创作者佣金' },
      { field: 'estimatedInfluencerShopAdPayment', type: 'Number', description: '预计达人广告付款' },
      { field: 'estimatedAffiliateServiceProviderShopAdPayment', type: 'Number', description: '预计联盟服务商广告付款' },
      // 实际佣金
      { field: 'actualCommissionAmount', type: 'Number', description: '实际佣金总额' },
      { field: 'actualAffiliatePartnerCommission', type: 'Number', description: '实际联盟合作伙伴佣金' },
      { field: 'actualCreatorCommission', type: 'Number', description: '实际创作者佣金' },
      { field: 'actualServiceProviderRewardCommission', type: 'Number', description: '实际服务商奖励佣金' },
      { field: 'actualInfluencerRewardCommission', type: 'Number', description: '实际达人奖励佣金' },
      { field: 'actualAffiliateServiceProviderShopAdPayment', type: 'Number', description: '实际联盟服务商广告付款' },
      { field: 'actualInfluencerShopAdPayment', type: 'Number', description: '实际达人广告付款' },
      // 退货退款
      { field: 'returnedProductCount', type: 'Number', description: '退货数量' },
      { field: 'refundedProductCount', type: 'Number', description: '退款数量' },
      // 时间字段
      { field: 'createTime', type: 'Date', description: '订单创建时间' },
      { field: 'orderDeliveryTime', type: 'Date', description: '订单发货时间' },
      { field: 'commissionSettlementTime', type: 'Date', description: '佣金结算时间' },
      // 打款信息
      { field: 'paymentNo', type: 'String', description: '打款号' },
      { field: 'paymentMethod', type: 'String', description: '打款方式' },
      { field: 'paymentAccount', type: 'String', description: '打款账号' },
      // 其他
      { field: 'iva', type: 'String', description: 'IVA' },
      { field: 'isr', type: 'String', description: 'ISR' },
      { field: 'platform', type: 'String', default: 'tiktok', description: '平台' },
      { field: 'attributionType', type: 'String', description: '归因类型' },
      { field: 'merchandiser', type: 'String', description: '跟单员' },
      { field: 'groupInfo', type: 'String', description: '分组信息' },
      { field: 'isBlacklistedInfluencer', type: 'Boolean', default: false, description: '黑名单达人标记' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'SampleManagement',
    description: '样品管理表 - 样品申请与跟踪',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'date', type: 'Date', required: true, description: '日期' },
      { field: 'productName', type: 'String', required: true, description: '商品名称' },
      { field: 'productId', type: 'String', required: true, description: '商品ID' },
      { field: 'influencerAccount', type: 'String', required: true, description: '达人账号' },
      { field: 'followerCount', type: 'Number', default: 0, description: '粉丝数' },
      { field: 'salesman', type: 'String', description: '归属业务员' },
      { field: 'shippingInfo', type: 'String', description: '收货信息' },
      { field: 'sampleImage', type: 'String', description: '样品图片URL' },
      { field: 'isSampleSent', type: 'Boolean', default: false, description: '是否寄样' },
      { field: 'trackingNumber', type: 'String', description: '发货单号' },
      { field: 'shippingDate', type: 'Date', description: '发货日期' },
      { field: 'logisticsCompany', type: 'String', description: '物流公司' },
      { field: 'receivedDate', type: 'Date', description: '收样日期' },
      { field: 'fulfillmentTime', type: 'String', description: '履约时间' },
      { field: 'videoLink', type: 'String', description: '达人视频链接' },
      { field: 'videoStreamCode', type: 'String', description: '视频推流码' },
      { field: 'isAdPromotion', type: 'Boolean', default: false, description: '是否投流' },
      { field: 'adPromotionTime', type: 'Date', description: '投流时间' },
      { field: 'isOrderGenerated', type: 'Boolean', default: false, description: '是否出单' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'BdDaily',
    description: 'BD每日统计表 - 业务员日常数据',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'date', type: 'Date', required: true, description: '统计日期' },
      { field: 'salesman', type: 'String', required: true, description: 'BD姓名' },
      { field: 'sampleCount', type: 'Number', default: 0, description: '本日申样数' },
      { field: 'sampleIds', type: 'String', description: '申样记录ID，逗号分隔' },
      { field: 'revenue', type: 'Number', default: 0, description: '本日成交金额(GMV)' },
      { field: 'estimatedCommission', type: 'Number', default: 0, description: '本日预估服务费' },
      { field: 'revenueIds', type: 'String', description: '收入记录ID，逗号分隔' },
      { field: 'orderCount', type: 'Number', default: 0, description: '本日订单数' },
      { field: 'commission', type: 'Number', default: 0, description: '本日结算佣金' },
      { field: 'orderGeneratedCount', type: 'Number', default: 0, description: '本日出单数' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'updaterId', type: 'ObjectId', ref: 'User', description: '更新人' },
      { field: 'remark', type: 'String', description: '备注' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Performance',
    description: '业绩报表表 - 业绩汇总数据',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'summaryDate', type: 'String', required: true, description: '汇总日期' },
      { field: 'userId', type: 'ObjectId', required: true, ref: 'User', description: '用户ID' },
      { field: 'deptId', type: 'ObjectId', ref: 'Department', description: '部门ID' },
      { field: 'gmv', type: 'Number', default: 0, description: 'GMV' },
      { field: 'orderCount', type: 'Number', default: 0, description: '订单数' },
      { field: 'totalProfit', type: 'Number', default: 0, description: '总利润' },
      { field: 'commissionRate', type: 'Number', description: '佣金率' },
      { field: 'commissionType', type: 'String', default: 'fixed', description: '佣金类型: fixed/tiered' },
      { field: 'commissionAmount', type: 'Number', default: 0, description: '佣金金额' },
      { field: 'status', type: 'String', default: 'pending', description: '状态: pending/approved' },
      { field: 'remark', type: 'String', description: '备注' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'BaseData',
    description: '基础数据表 - 系统配置数据',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'name', type: 'String', required: true, description: '名称' },
      { field: 'type', type: 'String', required: true, description: '类型: country/category/grade/priceUnit/timeoutConfig/trackingUrl/influencerCategory' },
      { field: 'code', type: 'String', description: '代码' },
      { field: 'englishName', type: 'String', description: '英文名称' },
      { field: 'value', type: 'Mixed', description: '数值/配置' },
      { field: 'description', type: 'String', description: '描述' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'InfluencerMaintenance',
    description: '达人维护表 - 达人跟踪维护记录',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'influencerId', type: 'ObjectId', required: true, ref: 'Influencer', description: '达人ID' },
      { field: 'followers', type: 'Number', required: true, default: 0, description: '粉丝数' },
      { field: 'gmv', type: 'Number', required: true, default: 0, description: 'GMV' },
      { field: 'remark', type: 'String', description: '备注' },
      { field: 'maintainerId', type: 'ObjectId', required: true, ref: 'User', description: '维护人' },
      { field: 'maintainerName', type: 'String', required: true, description: '维护人姓名' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'ActivityHistory',
    description: '活动历史表 - 活动变更记录',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'activityId', type: 'ObjectId', required: true, ref: 'Activity', description: '活动ID' },
      { field: 'action', type: 'String', required: true, description: '操作类型: create/update/delete/status_change' },
      { field: 'changes', type: 'Mixed', description: '变更内容' },
      { field: 'previousData', type: 'Mixed', description: '变更前数据' },
      { field: 'newData', type: 'Mixed', description: '变更后数据' },
      { field: 'changedBy', type: 'ObjectId', required: true, ref: 'User', description: '变更人' },
      { field: 'changedByName', type: 'String', description: '变更人姓名' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Commission',
    description: '佣金表 - 达人佣金记录',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'influencerId', type: 'ObjectId', required: true, ref: 'Influencer', description: '达人ID' },
      { field: 'bdId', type: 'ObjectId', required: true, ref: 'User', description: 'BD ID' },
      { field: 'orderId', type: 'ObjectId', required: true, ref: 'Order', description: '订单ID' },
      { field: 'sampleRequestId', type: 'ObjectId', ref: 'SampleRequest', description: '样品申请ID' },
      { field: 'orderAmount', type: 'Number', required: true, description: '订单金额' },
      { field: 'commissionAmount', type: 'Number', required: true, description: '佣金金额' },
      { field: 'commissionRate', type: 'Number', required: true, description: '佣金率' },
      { field: 'calculatedDate', type: 'Date', description: '计算日期' },
      { field: 'status', type: 'String', default: 'pending', description: '状态: pending/paid/settled' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'CommissionRule',
    description: '佣金规则表 - 阶梯抽成配置',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'deptId', type: 'ObjectId', required: true, ref: 'Department', description: '部门ID' },
      { field: 'ranges', type: 'Array', description: '阶梯区间配置' },
      { field: 'status', type: 'String', default: 'active', description: '状态: active/inactive' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'ShopContact',
    description: '店铺联系人表',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'shopId', type: 'ObjectId', required: true, ref: 'Shop', description: '店铺ID' },
      { field: 'name', type: 'String', required: true, description: '联系人姓名' },
      { field: 'phone', type: 'String', description: '联系电话' },
      { field: 'email', type: 'String', description: '邮箱' },
      { field: 'trackerId', type: 'ObjectId', ref: 'User', description: '跟踪人' },
      { field: 'trackerName', type: 'String', description: '跟踪人姓名' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'ShopRating',
    description: '店铺评级表',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'shopId', type: 'ObjectId', required: true, ref: 'Shop', description: '店铺ID' },
      { field: 'creditRating', type: 'Number', default: 5, description: '信用评级(1-10)' },
      { field: 'creditRemark', type: 'String', description: '信用备注' },
      { field: 'cooperationRating', type: 'Number', default: 5, description: '合作评级(1-10)' },
      { field: 'cooperationRemark', type: 'String', description: '合作备注' },
      { field: 'updatedBy', type: 'ObjectId', ref: 'User', description: '更新人' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'ShopTracking',
    description: '店铺跟踪表',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'shopId', type: 'ObjectId', required: true, ref: 'Shop', description: '店铺ID' },
      { field: 'userId', type: 'ObjectId', required: true, ref: 'User', description: '用户ID' },
      { field: 'userName', type: 'String', required: true, description: '用户名' },
      { field: 'action', type: 'String', required: true, description: '操作描述' },
      { field: 'trackingDate', type: 'Date', description: '跟踪日期' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  },
  {
    name: 'Bill',
    description: '账单表 - 佣金结算账单',
    fields: [
      { field: '_id', type: 'ObjectId', required: true, description: '主键ID' },
      { field: 'companyId', type: 'ObjectId', required: true, ref: 'Company', description: '所属公司' },
      { field: 'billNo', type: 'String', required: true, description: '账单号(唯一)' },
      { field: 'validStartDate', type: 'Date', required: true, description: '有效开始日期' },
      { field: 'validEndDate', type: 'Date', required: true, description: '有效结束日期' },
      { field: 'totalCommission', type: 'Number', default: 0, description: '佣金总金额' },
      { field: 'isSettled', type: 'Boolean', default: false, description: '是否结清' },
      { field: 'settlementTime', type: 'Date', description: '结算时间' },
      { field: 'settlementNotes', type: 'Array', description: '结算备注(多条记录)' },
      { field: 'orderCount', type: 'Number', default: 0, description: '包含的订单数量' },
      { field: 'bdList', type: 'Array', description: '包含的BD列表' },
      { field: 'creatorId', type: 'ObjectId', ref: 'User', description: '创建人' },
      { field: 'createdAt', type: 'Date', description: '创建时间' },
      { field: 'updatedAt', type: 'Date', description: '更新时间' }
    ]
  }
])

// 主外键关系 - 按源表字母排序
const relations = computed(() => {
  return [...relationsData.value].sort((a, b) => a.sourceTable.localeCompare(b.sourceTable))
})

// 数据表结构 - 按表名字母排序
const tableList = computed(() => {
  return [...tableData.value].sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<style scoped>
.system-models-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header h3 {
  margin: 0;
}

.header-tip {
  font-size: 12px;
  color: #909399;
}

.model-tabs {
  min-height: 500px;
}

.model-tabs :deep(.el-tabs__content) {
  padding: 0 20px;
}

.table-info {
  margin-bottom: 16px;
}

.table-info h4 {
  margin: 0;
  color: #303133;
}

.field-table {
  margin-top: 12px;
}

.field-name {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #409eff;
  font-weight: 500;
}

.default-value {
  font-family: 'Monaco', 'Menlo', monospace;
  color: #909399;
  font-size: 12px;
}

.relations-section {
  padding: 10px;
}

.relation-arrow {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.inner-tabs {
  height: 600px;
}

.inner-tabs :deep(.el-tabs__content) {
  height: 100%;
  overflow-y: auto;
}

.inner-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.inner-tabs .table-info {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  margin-bottom: 12px;
}
</style>
