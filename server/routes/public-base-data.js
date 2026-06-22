const express = require('express');
const BaseData = require('../models/BaseData');

const router = express.Router();

/**
 * @route   GET /api/public/base-data/list
 * @desc    公开获取基础数据列表（给 PublicCollection 页面用）
 * @access  Public
 */
router.get('/list', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    const data = await BaseData.find(query)
      .select('_id name code value description type')
      .limit(parseInt(limit))
      .lean();

    // 为货币单位添加符号
    if (type === 'priceUnit') {
      const symbolMap = {
        'THB': '฿',
        'CNY': '¥',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'VND': '₫',
        'MYR': 'RM',
        'SGD': 'S$'
      };
      data.forEach(item => {
        item.symbol = symbolMap[item.code] || item.code;
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get public base data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
