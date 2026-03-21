const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const CooperationProduct = require('../models/CooperationProduct');

const router = express.Router();

// 清除所有合作产品数据（仅管理员）
router.delete('/clear-all', authenticate, authorize('admin'), async (req, res) => {
  try {
    await CooperationProduct.deleteMany({});

    res.json({
      success: true,
      message: '所有商品数据已清空'
    });
  } catch (error) {
    console.error('清空商品数据失败:', error);
    res.status(500).json({ success: false, message: '清空失败' });
  }
});

module.exports = router;
