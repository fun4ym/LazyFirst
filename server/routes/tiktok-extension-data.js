const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const TiktokExtensionData = require('../models/TiktokExtensionData');
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');

const router = express.Router();

/**
 * POST /api/tiktok-extension-data
 * 保存插件采集的数据
 * 供Chrome插件调用
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      tiktokId: rawTiktokId,
      tiktokName,
      nickname,
      username,
      followerCount,
      estimatedGmv,
      monthlySalesCount,
      avgVideoViews,
      collectedAt,
      rawData
    } = req.body;

    // 归一化 tiktokId：Chrome 插件采集到的可能是 "/@xxx" 形式，统一去掉前导斜杠
    const tiktokId = (rawTiktokId || '').replace(/^\/+/, '').trim();

    // 验证必填字段
    if (!tiktokId) {
      return res.status(400).json({
        success: false,
        message: 'tiktokId为必填项'
      });
    }

    // 昵称兜底：插件上报字段为 nickname/username，可能为空串；
    // 后端模型 tiktokName 为必填，为空时回退到 tiktokId，避免 Mongoose 必填校验抛 500
    const resolvedName = (tiktokName || nickname || username || '').trim() || tiktokId;
    
    // 检查是否已存在相同tiktokId的数据（同一公司）
    const existingData = await TiktokExtensionData.findOne({
      companyId: req.companyId,
      tiktokId: tiktokId
    });
    
    if (existingData) {
      // 更新现有数据
      existingData.tiktokName = resolvedName || existingData.tiktokName;
      existingData.followerCount = followerCount !== undefined ? followerCount : existingData.followerCount;
      existingData.estimatedGmv = estimatedGmv !== undefined ? estimatedGmv : existingData.estimatedGmv;
      existingData.monthlySalesCount = monthlySalesCount !== undefined ? monthlySalesCount : existingData.monthlySalesCount;
      existingData.avgVideoViews = avgVideoViews !== undefined ? avgVideoViews : existingData.avgVideoViews;
      existingData.collectedAt = new Date();
      existingData.rawData = rawData || existingData.rawData;
      
      await existingData.save();
      
      return res.json({
        success: true,
        message: '数据已更新',
        data: existingData
      });
    }
    
    // 创建新数据
    const parsedCollectedAt = collectedAt ? new Date(collectedAt) : null;
    const newData = new TiktokExtensionData({
      companyId: req.companyId,
      tiktokId,
      tiktokName: resolvedName,
      followerCount: followerCount || 0,
      estimatedGmv: estimatedGmv || 0,
      monthlySalesCount: monthlySalesCount || 0,
      avgVideoViews: avgVideoViews || 0,
      collectedBy: req.userId,
      ...(parsedCollectedAt && !isNaN(parsedCollectedAt.getTime()) ? { collectedAt: parsedCollectedAt } : {}),
      rawData: rawData || {}
    });
    
    await newData.save();
    
    res.status(201).json({
      success: true,
      message: '数据已保存',
      data: newData
    });
  } catch (error) {
    console.error('保存TikTok扩展数据失败:', error);
    res.status(500).json({
      success: false,
      message: '保存数据失败: ' + error.message
    });
  }
});

/**
 * GET /api/tiktok-extension-data
 * 获取采集的数据列表
 * 供系统管理页面调用
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      keyword,
      synced,
      startDate,
      endDate
    } = req.query;
    
    const query = {
      companyId: req.companyId
    };
    
    // 关键词搜索
    if (keyword) {
      query.$or = [
        { tiktokId: { $regex: keyword, $options: 'i' } },
        { tiktokName: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // 同步状态过滤
    if (synced !== undefined) {
      query.synced = synced === 'true';
    }
    
    // 日期范围过滤
    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (!isNaN(sd.getTime())) dateRange.$gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (!isNaN(ed.getTime())) dateRange.$lte = ed;
      }
      // 仅当存在有效日期时才加入查询，避免空对象 {} 触发 Mongoose 日期 cast 错误
      if (Object.keys(dateRange).length > 0) {
        query.collectedAt = dateRange;
      }
    }
    
    const dataList = await TiktokExtensionData.find(query)
      .populate('collectedBy', 'username realName')
      .populate('influencerId', 'tiktokName tiktokId')
      .sort({ collectedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await TiktokExtensionData.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        dataList,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取TikTok扩展数据列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据列表失败'
    });
  }
});

/**
 * GET /api/tiktok-extension-data/influencer/:tiktokId
 * 插件用：根据 tiktokId 返回达人的最新四指标（FV/GMV/MSS/APV）
 */
router.get('/influencer/:tiktokId', authenticate, async (req, res) => {
  try {
    const tiktokId = (req.params.tiktokId || '').replace(/^\/+/, '').trim();

    if (!tiktokId) {
      return res.status(400).json({
        success: false,
        message: 'tiktokId为必填项'
      });
    }

    // 兼容两种存储格式：@username 和 username（CSV导入等常不带 @）
    const searchIds = tiktokId.startsWith('@')
      ? [tiktokId, tiktokId.replace(/^@/, '')]
      : [tiktokId, '@' + tiktokId];

    let influencer = await Influencer.findOne({
      companyId: req.companyId,
      tiktokId: { $in: searchIds }
    }).select('tiktokId tiktokName latestFollowers latestGmv monthlySalesCount avgVideoViews');

    // 若 Influencer 表没有，尝试回退到最新一条采集数据（已同步未同步均可）
    if (!influencer) {
      const extData = await TiktokExtensionData.findOne({
        companyId: req.companyId,
        tiktokId: { $in: searchIds }
      }).sort({ collectedAt: -1 });

      if (extData) {
        return res.json({
          success: true,
          data: {
            tiktokId: extData.tiktokId,
            tiktokName: extData.tiktokName || extData.tiktokId,
            followers: extData.followerCount || 0,
            totalLikes: extData.totalLikes || 0
          }
        });
      }
    }

    if (!influencer) {
      return res.status(404).json({
        success: false,
        message: '达人不存在'
      });
    }

    res.json({
      success: true,
      data: {
        tiktokId: influencer.tiktokId,
        tiktokName: influencer.tiktokName,
        followers: influencer.latestFollowers || 0,
        totalLikes: influencer.totalLikes || 0
      }
    });
  } catch (error) {
    console.error('获取达人指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取达人指标失败: ' + error.message
    });
  }
});

/**
 * GET /api/tiktok-extension-data/message-template
 * 返回当前登录 BD 的三语私信模板（泰文/英文/中文）
 * 兼容旧单语模板：若旧字段 messageTemplate 有值，迁移到 messageTemplates.th
 */
router.get('/message-template', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const userId = req.userId || (req.user && req.user._id);
    if (!userId) {
      return res.status(401).json({ success: false, message: '未获取到当前用户' });
    }
    const user = await User.findById(userId).select('messageTemplates messageTemplate realName username');
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 兼容旧数据：如果旧字段有值且新字段全空，把旧值迁移到 th
    let templates = user.messageTemplates || { th: '', en: '', zh: '' };
    if (user.messageTemplate && !templates.th && !templates.en && !templates.zh) {
      templates.th = user.messageTemplate;
      // 自动迁移保存
      await User.findByIdAndUpdate(userId, { messageTemplates: templates, messageTemplate: '' });
    }

    res.json({
      success: true,
      templates,
      user: { realName: user.realName, username: user.username }
    });
  } catch (error) {
    console.error('获取私信模板失败:', error);
    res.status(500).json({ success: false, message: '获取私信模板失败: ' + error.message });
  }
});

/**
 * PUT /api/tiktok-extension-data/message-template
 * 更新当前登录 BD 的三语私信模板
 */
router.put('/message-template', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');
    const userId = req.userId || (req.user && req.user._id);
    if (!userId) {
      return res.status(401).json({ success: false, message: '未获取到当前用户' });
    }
    const { templates } = req.body;
    if (!templates || typeof templates !== 'object') {
      return res.status(400).json({ success: false, message: 'templates 必须为对象 {th, en, zh}' });
    }
    const sanitized = {
      th: typeof templates.th === 'string' ? templates.th : '',
      en: typeof templates.en === 'string' ? templates.en : '',
      zh: typeof templates.zh === 'string' ? templates.zh : ''
    };
    const user = await User.findByIdAndUpdate(
      userId,
      { messageTemplates: sanitized, messageTemplate: '' },
      { new: true }
    ).select('messageTemplates');
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, templates: user.messageTemplates, message: '私信模板已保存' });
  } catch (error) {
    console.error('保存私信模板失败:', error);
    res.status(500).json({ success: false, message: '保存私信模板失败: ' + error.message });
  }
});

/**
 * PUT /api/tiktok-extension-data/:id/sync
 * 同步单条数据到influencer表
 */
router.put('/:id/sync', authenticate, async (req, res) => {
  try {
    const dataId = req.params.id;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      return res.status(400).json({
        success: false,
        message: '无效的数据ID'
      });
    }
    
    // 查找数据
    const data = await TiktokExtensionData.findOne({
      _id: dataId,
      companyId: req.companyId
    });
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '数据不存在'
      });
    }
    
    // 检查是否已同步
    if (data.synced) {
      return res.status(400).json({
        success: false,
        message: '数据已同步'
      });
    }
    
    // 检查influencer是否已存在（根据tiktokId）
    let influencer = await Influencer.findOne({
      companyId: req.companyId,
      tiktokId: data.tiktokId
    });
    
    if (influencer) {
      // 达人已存在，更新数据
      influencer.latestFollowers = data.followerCount;
      influencer.latestGmv = data.estimatedGmv;
      // ★ 同步月销和平均播放：有有效值才覆盖，避免把旧维护数据刷成0
      if (data.monthlySalesCount > 0) {
        influencer.monthlySalesCount = data.monthlySalesCount;
      }
      if (data.avgVideoViews > 0) {
        influencer.avgVideoViews = data.avgVideoViews;
      }
      influencer.tiktokName = data.tiktokName || influencer.tiktokName;
      await influencer.save();
    } else {
      // 达人不存在，创建新达人
      influencer = new Influencer({
        companyId: req.companyId,
        tiktokName: data.tiktokName || data.tiktokId || '未知达人',
        tiktokId: data.tiktokId,
        latestFollowers: data.followerCount,
        latestGmv: data.estimatedGmv,
        monthlySalesCount: data.monthlySalesCount || 0,
        avgVideoViews: data.avgVideoViews || 0,
        poolType: 'private',
        assignedTo: req.userId
      });
      
      await influencer.save();
    }
    
    // 添加维护记录
    const maintenance = new InfluencerMaintenance({
      companyId: req.companyId,
      influencerId: influencer._id,
      followers: data.followerCount,
      gmv: data.estimatedGmv,
      monthlySalesCount: data.monthlySalesCount,
      avgVideoViews: data.avgVideoViews,
      poolType: 'private',
      remark: 'Chrome插件采集数据同步',
      maintainerId: req.userId,
      maintainerName: req.user ? req.user.realName || req.user.username : '未知'
    });
    
    await maintenance.save();
    
    // 更新数据同步状态（用 updateOne 避免整文档重新校验 required 字段导致 500）
    await TiktokExtensionData.updateOne(
      { _id: data._id },
      { $set: { synced: true, syncedAt: new Date(), influencerId: influencer._id } }
    );
    
    res.json({
      success: true,
      message: '数据已同步',
      data: {
        influencerId: influencer._id,
        tiktokId: data.tiktokId,
        tiktokName: data.tiktokName
      }
    });
  } catch (error) {
    console.error('同步数据失败:', error);
    res.status(500).json({
      success: false,
      message: '同步数据失败: ' + error.message
    });
  }
});

/**
 * POST /api/tiktok-extension-data/batch-sync
 * 批量同步数据到influencer表
 */
router.post('/batch-sync', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要同步的数据'
      });
    }
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      details: []
    };
    
    // 逐条同步
    for (const id of ids) {
      try {
        // 查找数据
        const data = await TiktokExtensionData.findOne({
          _id: id,
          companyId: req.companyId
        });
        
        if (!data) {
          results.failed++;
          results.details.push({
            id,
            status: 'failed',
            message: '数据不存在'
          });
          continue;
        }
        
        // 检查是否已同步
        if (data.synced) {
          results.skipped++;
          results.details.push({
            id,
            status: 'skipped',
            message: '数据已同步',
            tiktokId: data.tiktokId
          });
          continue;
        }
        
        // 检查influencer是否已存在
        let influencer = await Influencer.findOne({
          companyId: req.companyId,
          tiktokId: data.tiktokId
        });
        
        if (influencer) {
          // 更新现有达人
          influencer.latestFollowers = data.followerCount;
          influencer.latestGmv = data.estimatedGmv;
          // ★ 同步月销和平均播放：有有效值才覆盖，避免把旧维护数据刷成0
          if (data.monthlySalesCount > 0) {
            influencer.monthlySalesCount = data.monthlySalesCount;
          }
          if (data.avgVideoViews > 0) {
            influencer.avgVideoViews = data.avgVideoViews;
          }
          influencer.tiktokName = data.tiktokName || influencer.tiktokName;
          await influencer.save();
        } else {
        // 创建新达人
        influencer = new Influencer({
          companyId: req.companyId,
          tiktokName: data.tiktokName || data.tiktokId || '未知达人',
          tiktokId: data.tiktokId,
            latestFollowers: data.followerCount,
            latestGmv: data.estimatedGmv,
            monthlySalesCount: data.monthlySalesCount || 0,
            avgVideoViews: data.avgVideoViews || 0,
            poolType: 'private',
            assignedTo: req.userId
          });
          
          await influencer.save();
        }
        
        // 添加维护记录
        const maintenance = new InfluencerMaintenance({
          companyId: req.companyId,
          influencerId: influencer._id,
          followers: data.followerCount,
          gmv: data.estimatedGmv,
          monthlySalesCount: data.monthlySalesCount,
          avgVideoViews: data.avgVideoViews,
          poolType: 'private',
          remark: 'Chrome插件采集数据同步',
          maintainerId: req.userId,
          maintainerName: req.user ? req.user.realName || req.user.username : '未知'
        });
        
        await maintenance.save();
        
        // 更新数据同步状态（用 updateOne 避免整文档重新校验 required 字段导致 500）
        await TiktokExtensionData.updateOne(
          { _id: data._id },
          { $set: { synced: true, syncedAt: new Date(), influencerId: influencer._id } }
        );
        
        results.success++;
        results.details.push({
          id,
          status: 'success',
          message: '同步成功',
          tiktokId: data.tiktokId,
          influencerId: influencer._id
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          id,
          status: 'failed',
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `同步完成：成功 ${results.success}，失败 ${results.failed}，跳过 ${results.skipped}`,
      data: results
    });
  } catch (error) {
    console.error('批量同步失败:', error);
    res.status(500).json({
      success: false,
      message: '批量同步失败'
    });
  }
});

/**
 * DELETE /api/tiktok-extension-data/:id
 * 删除采集的数据
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const dataId = req.params.id;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      return res.status(400).json({
        success: false,
        message: '无效的数据ID'
      });
    }
    
    // 查找并删除数据
    const data = await TiktokExtensionData.findOneAndDelete({
      _id: dataId,
      companyId: req.companyId
    });
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '数据不存在'
      });
    }
    
    res.json({
      success: true,
      message: '数据已删除'
    });
  } catch (error) {
    console.error('删除数据失败:', error);
    res.status(500).json({
      success: false,
      message: '删除数据失败'
    });
  }
});

module.exports = router;
