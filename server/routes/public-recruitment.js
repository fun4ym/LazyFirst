const express = require('express');
const Recruitment = require('../models/Recruitment');
const Product = require('../models/Product');

const router = express.Router();

/**
 * @route   GET /api/public/recruitment
 * @desc    获取公开招募列表或单个招募信息
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { y: identificationCode, enabled } = req.query;

    // 如果有 identificationCode 参数，返回单个招募详情
    if (identificationCode) {
      const recruitment = await Recruitment.findOne({ identificationCode })
        .populate('products', 'name sku tiktokProductId images price commissionRate squareCommissionRate promotionInfluencerRate activityConfigs');

      if (!recruitment) {
        return res.status(404).json({
          success: false,
          message: '招募不存在或识别码无效'
        });
      }

      // 判断是否启用
      if (!recruitment.enabled) {
        return res.status(403).json({
          success: false,
          message: '该招募已停用'
        });
      }

      // 返回公开数据
      return res.json({
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
    }

    // 如果没有 identificationCode 参数，返回招募列表
    const query = {};
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const recruitments = await Recruitment.find(query)
      .select('_id name description identificationCode enabled createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: recruitments
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
