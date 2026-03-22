const express = require('express');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 配置multer，增加文件大小限制
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * @route   GET /api/report-orders
 * @desc    获取订单报表列表
 * @access  Private
 */
router.get('/', authenticate, authorize('orders:read'), filterByDataScope({ module: 'orders', ownerField: 'bdName', ownerValue: (req) => req.user?.username }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      paymentStartDate,
      paymentEndDate,
      orderNo,
      shopName,
      influencerUsername,
      productId,
      orderStatus,
      sortBy,
      sortOrder,
      onlyPaid
    } = req.query;

    // 合并数据权限过滤条件
    const query = { ...req.dataScope.query };

    // 订单号搜索
    if (orderNo) {
      query.orderNo = { $regex: orderNo, $options: 'i' };
    }

    // 店铺搜索
    if (shopName) {
      query.shopName = { $regex: shopName, $options: 'i' };
    }

    // 达人搜索
    if (influencerUsername) {
      query.influencerUsername = { $regex: influencerUsername, $options: 'i' };
    }

    // 商品ID搜索（精确匹配）
    if (productId) {
      query.productId = productId;
    }

    // 交易状态搜索
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }

    // 创建时间范围
    if (startDate) {
      query.createTime = { $gte: new Date(startDate) };
    }

    if (endDate) {
      query.createTime = query.createTime || {};
      query.createTime.$lte = new Date(endDate + ' 23:59:59');
    }

    // 只显示已打款
    if (onlyPaid === 'true') {
      query.commissionSettlementTime = { $exists: true, $ne: null };
      console.log('[只显示已打款] 添加条件: commissionSettlementTime exists and != null');
    }

    // 打款时间范围
    if (paymentStartDate || paymentEndDate) {
      console.log('[打款时间范围] paymentStartDate:', paymentStartDate, 'paymentEndDate:', paymentEndDate, 'onlyPaid:', onlyPaid);
      // 如果已经有只显示已打款条件，在此基础上添加时间范围
      if (onlyPaid === 'true') {
        if (paymentStartDate) {
          query.commissionSettlementTime.$gte = new Date(paymentStartDate);
          console.log('添加 $gte:', paymentStartDate);
        }
        if (paymentEndDate) {
          query.commissionSettlementTime.$lte = new Date(paymentEndDate + ' 23:59:59');
          console.log('添加 $lte:', paymentEndDate);
        }
      } else {
        // 没有只显示已打款条件，独立处理时间范围
        query.commissionSettlementTime = {};
        if (paymentStartDate) {
          query.commissionSettlementTime.$gte = new Date(paymentStartDate);
        }
        if (paymentEndDate) {
          query.commissionSettlementTime.$lte = new Date(paymentEndDate + ' 23:59:59');
        }
      }
    }

    console.log('[查询条件] query.commissionSettlementTime:', JSON.stringify(query.commissionSettlementTime));

    const ReportOrder = require('../models/ReportOrder');

    // 处理排序
    let sortOptions = { summaryDate: -1 };
    if (sortBy && sortOrder) {
      sortOptions = { [sortBy]: parseInt(sortOrder) };
    }

    const orders = await ReportOrder.find(query)
      .populate('userId', 'realName')
      .populate('influencerId', 'tiktokInfo.displayName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortOptions);

    const total = await ReportOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get report orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单报表列表失败'
    });
  }
});

/**
 * @route   POST /api/report-orders/import
 * @desc    导入订单报表
 * @access  Private
 */
router.post('/import', authenticate, authorize('orders:create'), upload.single('file'), async (req, res) => {
  try {
    console.log('Import request received');

    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }

    console.log('File received:', req.file.path, req.file.originalname);

    const ReportOrder = require('../models/ReportOrder');
    console.log('Reading Excel file...');

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`Excel file parsed, found ${jsonData.length} rows`);

    if (jsonData.length > 0) {
      console.log('First row keys:', Object.keys(jsonData[0]));
      console.log('First row data:', JSON.stringify(jsonData[0], null, 2));
    }

    if (jsonData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Excel文件为空'
      });
    }

    const result = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];

        const orderNo = row['订单 ID'];

        if (!orderNo) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            error: `订单ID为空，可用字段: ${Object.keys(row).join(', ')}`,
            availableFields: Object.keys(row)
          });
          continue;
        }

        const subOrderNo = row['子订单 ID'] || '';

        // 先检查记录是否存在
        const existing = await ReportOrder.findOne({
          orderNo: orderNo,
          subOrderNo: subOrderNo,
          companyId: req.companyId
        });

        // 构建导入数据
        const rawCommissionSettlementTime = row['佣金结算时间'];
        const importedCommissionSettlementTime = parseExcelDate(rawCommissionSettlementTime);
        const importedPaymentNo = row['打款单号']?.trim();

        // 打印调试信息
        if (orderNo === '582569295681782979') {
          console.log(`\n========== 订单 ${orderNo} 的导入信息 ==========`);
          console.log('原始佣金结算时间:', rawCommissionSettlementTime);
          console.log('原始佣金结算时间类型:', typeof rawCommissionSettlementTime);
          console.log('解析后佣金结算时间:', importedCommissionSettlementTime);
          console.log('打款单号:', importedPaymentNo);
          console.log('=====================================\n');
        }

        const orderData = {
          companyId: req.companyId,
          orderNo: orderNo,
          subOrderNo: subOrderNo,
          influencerUsername: row['达人用户名'],
          productId: row['商品 ID'],
          productName: row['商品名称'],
          sku: row['SKU'],
          productPrice: parseFloat(row['商品价格']) || 0,
          orderQuantity: parseInt(row['下单件数']) || 0,
          shopName: row['店铺名称'],
          shopCode: row['店铺代码'],
          orderStatus: row['订单状态'],
          contentType: row['内容形式'],
          contentId: row['内容 ID'],
          affiliatePartnerCommissionRate: (parseFloat(row['联盟合作伙伴佣金率']) || 0) / 100,
          creatorCommissionRate: (parseFloat(row['创作者佣金率']) || 0) / 100,
          serviceProviderRewardCommissionRate: (parseFloat(row['服务商奖励佣金率']) || 0) / 100,
          influencerRewardCommissionRate: (parseFloat(row['达人奖励佣金率']) || 0) / 100,
          affiliateServiceProviderShopAdCommissionRate: (parseFloat(row['联盟服务商店铺广告佣金率']) || 0) / 100,
          influencerShopAdCommissionRate: (parseFloat(row['达人店铺广告佣金率']) || 0) / 100,
          estimatedCommissionAmount: parseFloat(row['预估计佣金额']) || 0,
          estimatedAffiliatePartnerCommission: parseFloat(row['预计联盟合作伙伴获得的佣金']) || 0,
          estimatedServiceProviderRewardCommission: parseFloat(row['预计服务商奖励佣金费']) || 0,
          estimatedInfluencerRewardCommission: parseFloat(row['预计达人奖励佣金费']) || 0,
          estimatedCreatorCommission: parseFloat(row['预计创作者获得的佣金']) || 0,
          estimatedInfluencerShopAdPayment: parseFloat(row['预计达人店铺广告佣金付款']) || 0,
          estimatedAffiliateServiceProviderShopAdPayment: parseFloat(row['预计联盟服务商店铺广告佣金付款']) || 0,
          actualCommissionAmount: parseFloat(row['实际计佣金额']) || 0,
          actualAffiliatePartnerCommission: parseFloat(row['联盟合作伙伴获得的实际佣金']) || 0,
          actualCreatorCommission: parseFloat(row['创作者获得的实际佣金']) || 0,
          actualServiceProviderRewardCommission: parseFloat(row['实际服务商奖励佣金费']) || 0,
          actualInfluencerRewardCommission: parseFloat(row['实际达人奖励佣金费']) || 0,
          actualAffiliateServiceProviderShopAdPayment: parseFloat(row['实际联盟服务商店铺广告佣金付款']) || 0,
          actualInfluencerShopAdPayment: parseFloat(row['实际达人店铺广告佣金付款']) || 0,
          returnedProductCount: parseInt(row['已退货的商品数量']) || 0,
          refundedProductCount: parseInt(row['已退款的商品数量']) || 0,
          createTime: parseExcelDate(row['创建时间']),
          orderDeliveryTime: parseExcelDate(row['订单送达时间']),
          commissionSettlementTime: importedCommissionSettlementTime,
          paymentNo: importedPaymentNo,
          paymentMethod: row['付款方式'],
          paymentAccount: row['付款账户'],
          iva: row['IVA'],
          isr: row['ISR'],
          platform: row['平台'] || 'tiktok',
          attributionType: row['归因类型'],
          creatorId: req.user._id,
          summaryDate: parseExcelDate(row['创建时间']) ? new Date(parseExcelDate(row['创建时间'])).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };

        // 如果记录已存在
        if (existing) {
          const hasPaymentNo = importedPaymentNo && importedPaymentNo !== '';
          const hasCommissionSettlementTime = importedCommissionSettlementTime !== null;

          // 如果导入数据的打款单号和佣金结算时间都为空，则跳过更新
          if (!hasPaymentNo && !hasCommissionSettlementTime) {
            console.log(`跳过更新记录: orderNo=${orderNo}, subOrderNo=${subOrderNo} (打款单号和佣金结算时间均为空)`);
            result.failed++;
            result.errors.push({
              row: i + 2,
              error: '记录已存在，且导入数据的打款单号和佣金结算时间均为空，已跳过更新'
            });
            continue;
          }

          // 如果记录已存在，更新打款相关字段和实际佣金字段
          const updateData = { $set: {} };
          if (hasPaymentNo) {
            updateData.$set.paymentNo = importedPaymentNo;
          }
          if (hasCommissionSettlementTime) {
            updateData.$set.commissionSettlementTime = importedCommissionSettlementTime;
          }
          // 更新实际佣金字段（如果有值）
          if (row['实际计佣金额'] !== undefined && row['实际计佣金额'] !== '') {
            updateData.$set.actualCommissionAmount = parseFloat(row['实际计佣金额']) || 0;
          }
          if (row['联盟合作伙伴获得的实际佣金'] !== undefined && row['联盟合作伙伴获得的实际佣金'] !== '') {
            updateData.$set.actualAffiliatePartnerCommission = parseFloat(row['联盟合作伙伴获得的实际佣金']) || 0;
          }
          if (row['创作者获得的实际佣金'] !== undefined && row['创作者获得的实际佣金'] !== '') {
            updateData.$set.actualCreatorCommission = parseFloat(row['创作者获得的实际佣金']) || 0;
          }
          if (row['实际服务商奖励佣金费'] !== undefined && row['实际服务商奖励佣金费'] !== '') {
            updateData.$set.actualServiceProviderRewardCommission = parseFloat(row['实际服务商奖励佣金费']) || 0;
          }
          if (row['实际达人奖励佣金费'] !== undefined && row['实际达人奖励佣金费'] !== '') {
            updateData.$set.actualInfluencerRewardCommission = parseFloat(row['实际达人奖励佣金费']) || 0;
          }
          if (row['实际联盟服务商店铺广告佣金付款'] !== undefined && row['实际联盟服务商店铺广告佣金付款'] !== '') {
            updateData.$set.actualAffiliateServiceProviderShopAdPayment = parseFloat(row['实际联盟服务商店铺广告佣金付款']) || 0;
          }
          if (row['实际达人店铺广告佣金付款'] !== undefined && row['实际达人店铺广告佣金付款'] !== '') {
            updateData.$set.actualInfluencerShopAdPayment = parseFloat(row['实际达人店铺广告佣金付款']) || 0;
          }

          // 如果有更新字段，执行更新
          if (Object.keys(updateData.$set).length > 0) {
            await ReportOrder.updateOne(
              { orderNo: orderNo, subOrderNo: subOrderNo, companyId: req.companyId },
              updateData
            );
            result.updated++;
          }
          continue;
        }

        // 新增记录或完整更新
        await ReportOrder.findOneAndUpdate(
          { orderNo: orderNo, subOrderNo: subOrderNo, companyId: req.companyId },
          orderData,
          { upsert: true, new: true }
        );

        result.added++;
      } catch (err) {
        console.error(`Error processing row ${i + 2}:`, err);
        result.failed++;
        result.errors.push({
          row: i + 2,
          error: err.message
        });
      }
    }

    fs.unlinkSync(req.file.path);

    console.log('Import completed:', result);

    res.json({
      success: true,
      message: `导入完成：新增 ${result.added} 条，更新 ${result.updated} 条，失败 ${result.failed} 条`,
      data: result
    });

  } catch (error) {
    console.error('Import orders error:', error);
    console.error('Error stack:', error.stack);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

function parseExcelDate(value) {
  if (!value) return null;

  // 处理Excel数字日期
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }

  // 处理字符串日期格式
  if (typeof value === 'string') {
    // 尝试解析 DD/MM/YYYY HH:mm:ss 格式（TikTok Excel 格式）
    const parts = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/);
    if (parts) {
      const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = parts;
      // 月份需要减1（JavaScript月份从0开始）
      const date = new Date(year, month - 1, day, hours, minutes, seconds);
      const result = isNaN(date.getTime()) ? null : date;
      console.log(`[parseExcelDate] 输入: ${value} (${typeof value}) -> 输出: ${result}`);
      return result;
    }
  }

  // 尝试其他格式
  const date = new Date(value);
  const result = isNaN(date.getTime()) ? null : date;
  console.log(`[parseExcelDate] 输入: ${value} (${typeof value}) -> 输出: ${result}`);
  return result;
}

// 测试端点：查询数据库中的订单
router.get('/debug/orders', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const ReportOrder = require('../models/ReportOrder');
    const orders = await ReportOrder.find({ companyId: req.companyId })
      .select('orderNo subOrderNo productName productPrice orderQuantity shopName orderStatus')
      .limit(10);

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Debug query error:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/report-orders/match-bd
 * @desc    BD匹配：根据样品管理表匹配归属BD
 * @access  Private
 */
router.post('/match-bd', authenticate, authorize('orders:update'), async (req, res) => {
  try {
    const ReportOrder = require('../models/ReportOrder');
    const SampleManagement = require('../models/SampleManagement');

    // 获取所有订单记录
    const orders = await ReportOrder.find({ companyId: req.companyId });
    console.log(`找到 ${orders.length} 条订单记录`);

    let matchedCount = 0;
    let unmatchedCount = 0;
    const updates = [];

    // 获取所有样品记录，建立索引
    const samples = await SampleManagement.find({ companyId: req.companyId });
    console.log(`找到 ${samples.length} 条样品记录`);

    // 建立样品索引：productId + influencerAccount -> salesman
    const sampleIndex = new Map();
    samples.forEach(sample => {
      const key = `${sample.productId}_${sample.influencerAccount}`;
      if (sample.salesman) {
        sampleIndex.set(key, sample.salesman);
      }
    });

    // 匹配订单
    for (const order of orders) {
      const key = `${order.productId}_${order.influencerUsername}`;

      if (sampleIndex.has(key)) {
        const bdName = sampleIndex.get(key);
        // 只有当BD不为空时才更新
        if (bdName && order.bdName !== bdName) {
          updates.push({
            updateOne: {
              filter: { _id: order._id },
              update: { bdName: bdName }
            }
          });
          matchedCount++;
        }
      } else {
        unmatchedCount++;
      }
    }

    // 批量更新
    if (updates.length > 0) {
      await ReportOrder.bulkWrite(updates);
      console.log(`批量更新 ${updates.length} 条记录`);
    }

    const result = {
      totalOrders: orders.length,
      matchedCount,
      unmatchedCount,
      updatedCount: updates.length
    };

    console.log('BD匹配结果:', result);

    res.json({
      success: true,
      message: `BD匹配完成`,
      data: result
    });

  } catch (error) {
    console.error('Match BD error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'BD匹配失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/report-orders/bills/generate
 * @desc    生成账单
 * @access  Private
 */
router.post('/bills/generate', authenticate, authorize('orders:update'), async (req, res) => {
  try {
    const { orderIds } = req.body;
    const ReportOrder = require('../models/ReportOrder');
    const Bill = require('../models/Bill');

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要生成账单的订单'
      });
    }

    // 查询选中的订单
    const orders = await ReportOrder.find({
      _id: { $in: orderIds },
      companyId: req.companyId
    });

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未找到选中的订单'
      });
    }

    // 验证逻辑
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const validationErrors = [];

    for (const order of orders) {
      // 检查结算标记
      if (order.settlementStatus === '已结清') {
        validationErrors.push(`订单 ${order.orderNo} 已结清，无法生成账单`);
      }
      // 检查打款单号
      if (!order.paymentNo || order.paymentNo.trim() === '') {
        validationErrors.push(`订单 ${order.orderNo} 打款单号为空，无法生成账单`);
      }
      // 检查打款日期
      if (!order.commissionSettlementTime || new Date(order.commissionSettlementTime) > today) {
        validationErrors.push(`订单 ${order.orderNo} 打款日期不在今天或之前，无法生成账单`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join('；')
      });
    }

    // 计算有效日期区间（订单的打款日期范围）
    const settlementDates = orders
      .filter(o => o.commissionSettlementTime)
      .map(o => new Date(o.commissionSettlementTime));

    const validStartDate = new Date(Math.min(...settlementDates));
    const validEndDate = new Date(Math.max(...settlementDates));

    // 按BD统计佣金
    const bdStats = {};
    let totalCommission = 0;

    for (const order of orders) {
      const bdName = order.bdName || '未分配';
      const commission = (order.actualAffiliatePartnerCommission || 0) +
        (order.actualAffiliateServiceProviderShopAdPayment || 0);

      if (!bdStats[bdName]) {
        bdStats[bdName] = { bdName, commission: 0, orderCount: 0, orderIds: [] };
      }
      bdStats[bdName].commission += commission;
      bdStats[bdName].orderCount += 1;
      bdStats[bdName].orderIds.push(order._id);
      totalCommission += commission;
    }

    // 生成账单号
    const billNo = await Bill.generateBillNo(req.companyId);

    // 创建账单
    const bill = new Bill({
      companyId: req.companyId,
      billNo,
      validStartDate,
      validEndDate,
      totalCommission,
      orderCount: orders.length,
      bdList: Object.values(bdStats).map(bd => ({
        bdName: bd.bdName,
        commission: bd.commission,
        orderCount: bd.orderCount
      })),
      creatorId: req.user._id
    });

    await bill.save();

    // 更新订单的settlementBillNo
    await ReportOrder.updateMany(
      { _id: { $in: orderIds } },
      { $set: { settlementBillNo: billNo } }
    );

    res.json({
      success: true,
      message: '账单生成成功',
      data: bill
    });

  } catch (error) {
    console.error('Generate bill error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: '生成账单失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/report-orders/bills
 * @desc    获取账单列表
 * @access  Private
 */
router.get('/bills', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const Bill = require('../models/Bill');

    const bills = await Bill.find({ companyId: req.companyId })
      .populate('creatorId', 'realName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Bill.countDocuments({ companyId: req.companyId });

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      success: false,
      message: '获取账单列表失败'
    });
  }
});

/**
 * @route   GET /api/report-orders/bills/:id
 * @desc    获取账单详情
 * @access  Private
 */
router.get('/bills/:id', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const Bill = require('../models/Bill');
    const ReportOrder = require('../models/ReportOrder');

    const bill = await Bill.findOne({
      _id: req.params.id,
      companyId: req.companyId
    }).populate('creatorId', 'realName');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }

    // 查询该账单包含的所有订单
    const orders = await ReportOrder.find({
      settlementBillNo: bill.billNo,
      companyId: req.companyId
    });

    // 按BD分组统计
    const bdDetails = {};
    for (const order of orders) {
      const bdName = order.bdName || '未分配';
      const commission = (order.actualAffiliatePartnerCommission || 0) +
        (order.actualAffiliateServiceProviderShopAdPayment || 0);

      if (!bdDetails[bdName]) {
        bdDetails[bdName] = {
          bdName,
          commission: 0,
          orderCount: 0,
          orders: []
        };
      }
      bdDetails[bdName].commission += commission;
      bdDetails[bdName].orderCount += 1;
      bdDetails[bdName].orders.push({
        orderNo: order.orderNo,
        productName: order.productName,
        commission: commission,
        settlementStatus: order.settlementStatus,
        paymentNo: order.paymentNo,
        commissionSettlementTime: order.commissionSettlementTime
      });
    }

    res.json({
      success: true,
      data: {
        ...bill.toObject(),
        orderDetails: Object.values(bdDetails)
      }
    });

  } catch (error) {
    console.error('Get bill detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取账单详情失败'
    });
  }
});

/**
 * @route   POST /api/report-orders/bills/:id/settle
 * @desc    结算账单
 * @access  Private
 */
router.post('/bills/:id/settle', authenticate, authorize('orders:update'), async (req, res) => {
  try {
    const { settlementNotes } = req.body;
    const Bill = require('../models/Bill');
    const ReportOrder = require('../models/ReportOrder');

    const bill = await Bill.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: '账单不存在'
      });
    }

    if (bill.isSettled) {
      return res.status(400).json({
        success: false,
        message: '该账单已结清，无法重复结算'
      });
    }

    if (!settlementNotes || !Array.isArray(settlementNotes) || settlementNotes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请填写结算备注'
      });
    }

    // 验证所有订单的结算状态
    const orders = await ReportOrder.find({
      settlementBillNo: bill.billNo,
      companyId: req.companyId
    });

    const validationErrors = [];
    for (const order of orders) {
      if (order.settlementStatus === '已结清') {
        validationErrors.push(`订单 ${order.orderNo} 已结清`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '部分订单状态异常：' + validationErrors.join('；')
      });
    }

    // 更新账单
    bill.isSettled = true;
    bill.settlementTime = new Date();
    bill.settlementNotes = settlementNotes.map(note => ({
      bdName: note.bdName,
      bankAccount: note.bankAccount || '',
      bankFlowNo: note.bankFlowNo || '',
      note: note.note || ''
    }));

    await bill.save();

    // 更新订单的结算状态
    await ReportOrder.updateMany(
      { settlementBillNo: bill.billNo, companyId: req.companyId },
      { $set: { settlementStatus: '已结清' } }
    );

    res.json({
      success: true,
      message: '结算成功',
      data: bill
    });

  } catch (error) {
    console.error('Settle bill error:', error);
    res.status(500).json({
      success: false,
      message: '结算失败',
      error: error.message
    });
  }
});

module.exports = router;
