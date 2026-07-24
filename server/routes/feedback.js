const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { pushMessage } = require('../line/client');
const Feedback = require('../models/Feedback');
const Influencer = require('../models/Influencer');

const router = express.Router();

/**
 * @route   POST /api/feedback
 * @desc    达人通过公开反馈页提交意见（凭 feedbackToken，无需登录）
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { token, content } = req.body;
    if (!token || !content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: '缺少令牌或内容' });
    }
    const influencer = await Influencer.findOne({ feedbackToken: token });
    if (!influencer) {
      return res.status(404).json({ success: false, message: '无效令牌' });
    }
    const feedback = await Feedback.create({
      companyId: influencer.companyId,
      influencerId: influencer._id,
      lineUserId: influencer.lineUserId || '',
      content: String(content).trim()
    });
    res.json({ success: true, message: '提交成功', data: { id: feedback._id } });
  } catch (error) {
    console.error('[Feedback] 提交失败:', error.message);
    res.status(500).json({ success: false, message: '提交失败' });
  }
});

/**
 * @route   GET /api/feedback
 * @desc    后台获取反馈列表
 * @access  Private
 */
router.get('/', authenticate, authorize('users:read'), async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const query = { companyId: req.companyId };
    if (status) query.status = status;

    const total = await Feedback.countDocuments(query);
    const list = await Feedback.find(query)
      .populate('influencerId', 'nickname ttId')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .lean();

    res.json({
      success: true,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      list
    });
  } catch (error) {
    console.error('[Feedback] 列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

/**
 * @route   PUT /api/feedback/:id/reply
 * @desc    回复反馈，并推送结果到达人 LINE
 * @access  Private
 */
router.put('/:id/reply', authenticate, authorize('users:update'), async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !String(reply).trim()) {
      return res.status(400).json({ success: false, message: '回复内容为空' });
    }
    const feedback = await Feedback.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!feedback) {
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }
    feedback.reply = String(reply).trim();
    feedback.status = 'replied';
    feedback.replyAt = new Date();
    await feedback.save();

    // 推送回复到达人 LINE
    if (feedback.lineUserId) {
      try {
        await pushMessage(feedback.lineUserId, [
          {
            type: 'text',
            text: `💬 来自 LazyFirst 的回复：\n\n${feedback.reply}`
          }
        ]);
      } catch (pushErr) {
        console.error('[Feedback] 推送回复失败:', pushErr.message);
      }
    }

    res.json({ success: true, message: '已回复', data: { feedback } });
  } catch (error) {
    console.error('[Feedback] 回复失败:', error.message);
    res.status(500).json({ success: false, message: '回复失败' });
  }
});

module.exports = router;
