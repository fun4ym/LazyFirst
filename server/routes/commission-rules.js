const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const CommissionRule = require('../models/CommissionRule');

const router = express.Router();

/**
 * @route   GET /api/commission-rules
 * @desc    获取抽点规则列表
 * @access  Private
 */
router.get('/', authenticate, authorize('commissionRules:read'), async (req, res) => {
  try {
    const rules = await CommissionRule.find({ companyId: req.companyId })
      .populate('deptId', 'name')
      .sort({ createdAt: -1 });

    const groupedRules = rules.map(rule => ({
      deptId: rule.deptId._id,
      deptName: rule.deptId.name,
      rules: rule.ranges.map(range => ({
        _id: range._id,
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        commissionRate: range.commissionRate,
        commissionType: range.commissionType,
        createdAt: range.createdAt
      }))
    }));

    res.json({
      success: true,
      data: { rules: groupedRules }
    });
  } catch (error) {
    console.error('Get commission rules error:', error);
    res.status(500).json({
      success: false,
      message: '获取抽点规则失败'
    });
  }
});

/**
 * @route   POST /api/commission-rules/save
 * @desc    保存抽点规则
 * @access  Private
 */
router.post('/save', authenticate, authorize('commissionRules:update'), [
  body('rules').isArray().withMessage('rules必须是数组')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const { rules } = req.body;

    await CommissionRule.deleteMany({ companyId: req.companyId });

    await Promise.all(
      rules.map(async (group) => {
        if (!group.deptId || !group.rules || group.rules.length === 0) return;

        await CommissionRule.create({
          deptId: group.deptId,
          ranges: group.rules,
          companyId: req.companyId,
          creatorId: req.user._id
        });
      })
    );

    res.json({
      success: true,
      message: '保存成功'
    });
  } catch (error) {
    console.error('Save commission rules error:', error);
    res.status(500).json({
      success: false,
      message: '保存失败'
    });
  }
});

module.exports = router;
