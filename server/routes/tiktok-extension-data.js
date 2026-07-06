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
      tiktokId,
      tiktokName,
      followerCount,
      estimatedGmv,
      monthlySalesCount,
      avgVideoViews,
      rawData
    } = req.body;
    
    // 验证必填字段
    if (!tiktokId) {
      return res.status(400).json({
        success: false,
        message: 'tiktokId为必填项'
      });
    }
    
    // 检查是否已存在相同tiktokId的数据（同一公司）
    const existingData = await TiktokExtensionData.findOne({
      companyId: req.companyId,
      tiktokId: tiktokId
    });
    
    if (existingData) {
      // 更新现有数据
      existingData.tiktokName = tiktokName || existingData.tiktokName;
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
    const newData = new TiktokExtensionData({
      companyId: req.companyId,
      tiktokId,
      tiktokName,
      followerCount: followerCount || 0,
      estimatedGmv: estimatedGmv || 0,
      monthlySalesCount: monthlySalesCount || 0,
      avgVideoViews: avgVideoViews || 0,
      collectedBy: req.userId,
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
      query.collectedAt = {};
      if (startDate) {
        query.collectedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.collectedAt.$lte = new Date(endDate);
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
