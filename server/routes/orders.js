const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { Order } = require('../models');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * @route   GET /api/orders
 * @desc    获取订单列表
 * @access  Private
 */
router.get('/', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      influencerId,
      startDate,
      endDate,
      orderNo,
      shopName
    } = req.query;

    const query = { companyId: req.companyId };

    if (status) {
      query.status = status;
    }

    if (influencerId) {
      query.influencerId = influencerId;
    }

    if (startDate || endDate) {
      query.createTime = {};
      if (startDate) query.createTime.$gte = new Date(startDate);
      if (endDate) query.createTime.$lte = new Date(endDate);
    }

    if (orderNo) {
      query.orderNo = { $regex: orderNo, $options: 'i' };
    }

    if (shopName) {
      query.shopName = { $regex: shopName, $options: 'i' };
    }

    const orders = await Order.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createTime: -1 });

    const total = await Order.countDocuments(query);

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
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

/**
 * @route   POST /api/orders
 * @desc    创建订单
 * @access  Private
 */
router.post('/', authenticate, authorize('orders:create'), async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      companyId: req.companyId
    };

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: '创建订单成功',
      data: { order }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败'
    });
  }
});

/**
 * @route   POST /api/orders/import
 * @desc    Excel导入订单
 * @access  Private
 */
router.post('/import', authenticate, authorize('orders:create'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const result = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];

        const orderData = {
          companyId: req.companyId,
          orderNo: row['订单ID'],
          subOrderNo: row['子订单ID'],
          influencerUsername: row['达人用户名'],
          productId: row['商品ID'],
          productName: row['商品名称'],
          sku: row['SKU'],
          productPrice: parseFloat(row['商品价格']) || 0,
          orderQuantity: parseInt(row['下单件数']) || 0,
          shopName: row['店铺名称'],
          shopCode: row['店铺代码'],
          orderStatus: row['订单状态'],
          contentType: row['内容形式'],
          contentId: row['内容ID'],
          affiliatePartnerCommissionRate: parseFloat(row['联盟合作伙伴佣金率']) || 0,
          creatorCommissionRate: parseFloat(row['创作者佣金率']) || 0,
          serviceProviderRewardCommissionRate: parseFloat(row['服务商奖励佣金率']) || 0,
          influencerRewardCommissionRate: parseFloat(row['达人奖励佣金率']) || 0,
          affiliateServiceProviderShopAdCommissionRate: parseFloat(row['联盟服务商店铺广告佣金率']) || 0,
          influencerShopAdCommissionRate: parseFloat(row['达人店铺广告佣金率']) || 0,
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
          commissionSettlementTime: parseExcelDate(row['佣金结算时间']),
          paymentNo: row['打款单号'],
          paymentMethod: row['付款方式'],
          paymentAccount: row['付款账户'],
          iva: row['IVA'],
          isr: row['ISR'],
          platform: row['平台'] || 'tiktok',
          attributionType: row['归因类型'],
          creatorId: req.user._id
        };

        await Order.findOneAndUpdate(
          { orderNo: orderData.orderNo, companyId: req.companyId },
          orderData,
          { upsert: true, new: true }
        );

        result.success++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          error: err.message
        });
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
      data: result
    });

  } catch (error) {
    console.error('Import orders error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败'
    });
  }
});

function parseExcelDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date((value - 25569) * 86400 * 1000);
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

module.exports = router;
