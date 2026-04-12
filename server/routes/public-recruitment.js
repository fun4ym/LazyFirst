const express = require('express');
const Recruitment = require('../models/Recruitment');
const Product = require('../models/Product');

const router = express.Router();

/**
 * @route   GET /api/public/recruitment
 * @desc    通过识别码获取招募信息（公开接口，无需登录）
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { y: identificationCode } = req.query;

    if (!identificationCode) {
      return res.status(400).json({
        success: false,
        message: '缺少识别码参数'
      });
    }

    // 1. 通过识别码查找招募
    const recruitment = await Recruitment.findOne({ identificationCode })
      .populate('products', 'name sku tiktokProductId images price commissionRate squareCommissionRate promotionInfluencerRate activityConfigs');

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        message: '招募不存在或识别码无效'
      });
    }

    // 2. 判断是否启用
    if (!recruitment.enabled) {
      return res.status(403).json({
        success: false,
        message: '该招募已停用'
      });
    }

    // 3. 返回公开数据
    res.json({
      success: true,
      data: {
        _id: recruitment._id,
        name: recruitment.name,
        description: recruitment.description,
        isStrict: recruitment.isStrict,
        requirementGmv: recruitment.requirementGmv,
        requirementFollowers: recruitment.requirementFollowers,
        requirementMonthlySales: recruitment.requirementMonthlySales,
        requirementAvgViews: recruitment.requirementAvgViews,
        pageStyle: recruitment.pageStyle || { layoutStyle: 'style1', themeColor: '#775999' },
        products: recruitment.products.map(p => ({
          _id: p._id,
          name: p.name,
          tiktokProductId: p.tiktokProductId,
          sku: p.sku,
          images: p.images,
          price: p.price,
          squareCommissionRate: p.squareCommissionRate,
          activityConfigs: p.activityConfigs
        }))
      }
    });

  } catch (error) {
    console.error('Public recruitment API error:', error);
    res.status(500).json({
      success: false,
      message: '获取招募信息失败'
    });
  }
});

module.exports = router;
