const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * @route   GET /api/report-orders
 * @desc    获取订单报表列表
 * @access  Private
 */
router.get('/', authenticate, authorize('orders:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      influencerId,
      userId,
      shopName,
      country
    } = req.query;

    const query = { companyId: req.companyId };

    if (startDate) {
      query.summaryDate = { $gte: startDate };
    }

    if (endDate) {
      query.summaryDate = query.summaryDate || {};
      query.summaryDate.$lte = endDate;
    }

    if (influencerId) {
      query.influencerId = influencerId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (shopName) {
      query.shopName = shopName;
    }

    if (country) {
      query.country = country;
    }

    const ReportOrder = require('../models/ReportOrder');
    const orders = await ReportOrder.find(query)
      .populate('userId', 'realName')
      .populate('influencerId', 'tiktokInfo.displayName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ summaryDate: -1 });

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    const ReportOrder = require('../models/ReportOrder');
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          const orders = await Promise.all(
            results.map(async (row) => {
              return await ReportOrder.create({
                summaryDate: row.summaryDate,
                shopName: row.shopName,
                productName: row.productName,
                merchandiser: row.merchandiser,
                userId: row.userId,
                influencerId: row.influencerId,
                orderCount: parseInt(row.orderCount) || 0,
                gmv: parseFloat(row.gmv) || 0,
                groupInfo: row.groupInfo,
                country: row.country,
                companyId: req.companyId,
                creatorId: req.user._id
              });
            })
          );

          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            message: '导入成功',
            data: { orders, count: orders.length }
          });
        } catch (error) {
          console.error('Process import error:', error);
          fs.unlinkSync(req.file.path);
          res.status(500).json({
            success: false,
            message: '处理导入数据失败'
          });
        }
      });
  } catch (error) {
    console.error('Import error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: '导入失败'
    });
  }
});

module.exports = router;
