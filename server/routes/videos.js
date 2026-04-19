const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');
const Video = require('../models/Video');
const SampleManagement = require('../models/SampleManagement');

const router = express.Router();

// ==========================================
// 视频登记管理相关路由
// ==========================================

/**
 * @route   GET /api/videos
 * @desc    获取视频登记列表
 * @access  Private
 */
router.get('/', authenticate, authorize('videos:read', 'videos:create', 'samplesBd:read'), filterByDataScope({ module: 'videos', ownerField: 'createdBy' }), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      dateStart,
      dateEnd,
      createdBy,
      influencerAccount,
      productName,
      isAdPromotion,
      isOrderGenerated,
      sampleId
    } = req.query;

    // 使用数据权限过滤条件
    const query = { ...req.dataScope.query };
    query.companyId = req.companyId;

    // 时间区间筛选
    if (dateStart && dateEnd) {
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // 登记人筛选
    if (createdBy) {
      query.createdBy = mongoose.Types.ObjectId(createdBy);
    }

    // 样品记录筛选
    if (sampleId) {
      query.sampleId = mongoose.Types.ObjectId(sampleId);
    }

    // 投流状态筛选
    if (isAdPromotion !== undefined && isAdPromotion !== '') {
      query.isAdPromotion = isAdPromotion === 'true';
    }

    // 达人账号筛选（需通过populate后的influencerId.tiktokId匹配）
    let influencerIds = null;
    if (influencerAccount) {
      const Influencer = require('../models/Influencer');
      const influencers = await Influencer.find({
        companyId: req.companyId,
        tiktokId: { $regex: influencerAccount, $options: 'i' }
      }).select('_id');
      influencerIds = influencers.map(inf => inf._id);
      if (influencerIds.length > 0) {
        query.influencerId = { $in: influencerIds };
      } else {
        // 没有匹配的达人，返回空结果
        return res.json({
          success: true,
          data: {
            videos: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
          }
        });
      }
    }

    // 商品名称筛选（需通过populate后的productId.name匹配）
    if (productName) {
      const Product = require('../models/Product');
      const products = await Product.find({
        companyId: req.companyId,
        name: { $regex: productName, $options: 'i' }
      }).select('_id');
      const productIds = products.map(p => p._id);
      if (productIds.length > 0) {
        query.productId = { $in: productIds };
      } else {
        return res.json({
          success: true,
          data: {
            videos: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
          }
        });
      }
    }

    // 是否出单（需要关联sample的isOrderGenerated）
    if (isOrderGenerated !== undefined && isOrderGenerated !== '') {
      const wantOrderGen = isOrderGenerated === 'true';
      const matchingSamples = await SampleManagement.find({
        companyId: req.companyId,
        isOrderGenerated: wantOrderGen
      }).select('_id');
      const sampleIds = matchingSamples.map(s => s._id);
      if (sampleIds.length > 0) {
        query.sampleId = { $in: sampleIds };
      } else {
        return res.json({
          success: true,
          data: {
            videos: [],
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
          }
        });
      }
    }

    const videos = await Video.find(query)
      .populate('sampleId', 'date isOrderGenerated')
      .populate('productId', 'name tiktokProductId images productImages shopId')
      .populate('influencerId', 'tiktokId tiktokName latestFollowers latestGmv monthlySalesCount avgVideoViews')
      .populate('createdBy', 'realName username')
      .populate('updatedBy', 'realName username')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get video list error:', error);
    res.status(500).json({
      success: false,
      message: '获取视频登记列表失败'
    });
  }
});

/**
 * @route   POST /api/videos
 * @desc    新建视频登记
 * @access  Private
 */
router.post('/', authenticate, authorize('videos:create', 'samplesBd:create'), async (req, res) => {
  try {
    const { sampleId, productId, influencerId, videoLink, videoStreamCode, isAdPromotion, adPromotionTime, createdBy } = req.body;

    // 验证逻辑：两种创建模式
    let finalProductId, finalInfluencerId, finalSampleId = null;
    let finalCreatedBy = req.user._id;
    
    // 验证操作员（createdBy）是否存在且属于该公司
    if (createdBy && createdBy !== req.user._id) {
      const User = require('../models/User');
      const operator = await User.findOne({
        _id: createdBy,
        companyId: req.companyId
      });
      if (!operator) {
        return res.status(400).json({
          success: false,
          message: '操作员不存在'
        });
      }
      // 这里可以添加权限检查：用户是否有权指定其他操作员
      // 暂时允许
      finalCreatedBy = createdBy;
    }
    
    if (sampleId) {
      // 模式1：通过样品创建
      const sample = await SampleManagement.findOne({
        _id: sampleId,
        companyId: req.companyId
      });

      if (!sample) {
        return res.status(400).json({
          success: false,
          message: '申样记录不存在'
        });
      }
      
      finalSampleId = sample._id;
      finalProductId = sample.productId;
      finalInfluencerId = sample.influencerId;
    } else {
      // 模式2：独立创建，必须提供商品和达人
      if (!productId || !influencerId) {
        return res.status(400).json({
          success: false,
          message: '独立创建视频必须提供商品和达人'
        });
      }
      
      // 验证商品存在且属于该公司
      const Product = require('../models/Product');
      const product = await Product.findOne({
        _id: productId,
        companyId: req.companyId
      });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: '商品不存在'
        });
      }
      
      // 验证达人存在且属于该公司
      const Influencer = require('../models/Influencer');
      const influencer = await Influencer.findOne({
        _id: influencerId,
        companyId: req.companyId
      });
      if (!influencer) {
        return res.status(400).json({
          success: false,
          message: '达人不存在'
        });
      }
      
      finalProductId = productId;
      finalInfluencerId = influencerId;
    }

    // 创建视频记录
    const videoData = {
      companyId: req.companyId,
      sampleId: finalSampleId,
      productId: finalProductId,
      influencerId: finalInfluencerId,
      videoLink: videoLink || '',
      videoStreamCode: videoStreamCode || '',
      isAdPromotion: isAdPromotion || false,
      createdBy: finalCreatedBy,
      updatedBy: req.user._id
    };

    if (adPromotionTime) {
      videoData.adPromotionTime = new Date(adPromotionTime);
    }
    if (isAdPromotion && !adPromotionTime) {
      videoData.adPromotionTime = new Date();
    }

    const video = await Video.create(videoData);

    // 如果投流了，且有关联样品，同步更新样品的快捷标记
    if (isAdPromotion && finalSampleId) {
      await SampleManagement.findByIdAndUpdate(finalSampleId, {
        isAdPromotion: true,
        adPromotionTime: videoData.adPromotionTime,
        adPromotionUpdatedBy: req.user._id,
        adPromotionUpdatedAt: new Date()
      });
    }

    // 如果有视频链接，且有关联样品，更新履约信息
    if (videoLink && finalSampleId) {
      await SampleManagement.findByIdAndUpdate(finalSampleId, {
        fulfillmentUpdatedBy: req.user._id,
        fulfillmentUpdatedAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: '视频登记成功',
      data: { video }
    });

  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: '创建视频登记失败: ' + error.message
    });
  }
});

/**
 * @route   GET /api/videos/:id
 * @desc    获取单个视频详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('videos:read'), async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
      .populate('sampleId', 'date isOrderGenerated sampleStatus shippingInfo')
      .populate('productId', 'name tiktokProductId images productImages shopId')
      .populate('influencerId', 'tiktokId tiktokName latestFollowers monthlySalesCount avgVideoViews')
      .populate('createdBy', 'realName username')
      .populate('updatedBy', 'realName username');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频记录不存在'
      });
    }

    res.json({ success: true, data: { video } });

  } catch (error) {
    console.error('Get video detail error:', error);
    res.status(500).json({
      success: false,
      message: '获取视频详情失败'
    });
  }
});

/**
 * @route   PUT /api/videos/:id
 * @desc    更新视频登记信息
 * @access  Private
 */
router.put('/:id', authenticate, authorize('videos:update', 'samplesBd:update'), async (req, res) => {
  try {
    const { sampleId, productId, influencerId, createdBy, videoLink, videoStreamCode, isAdPromotion, adPromotionTime } = req.body;
    const updateData = {};
    updateData.updatedBy = req.user._id;

    // 处理关联字段更新
    if (sampleId !== undefined) {
      if (sampleId) {
        // 验证样品存在且属于该公司
        const sample = await SampleManagement.findOne({
          _id: sampleId,
          companyId: req.companyId
        });
        if (!sample) {
          return res.status(400).json({
            success: false,
            message: '申样记录不存在'
          });
        }
        updateData.sampleId = sample._id;
        updateData.productId = sample.productId;
        updateData.influencerId = sample.influencerId;
      } else {
        // sampleId为空，表示解除样品关联，必须提供productId和influencerId
        if (!productId || !influencerId) {
          return res.status(400).json({
            success: false,
            message: '解除样品关联时必须提供商品和达人'
          });
        }
        updateData.sampleId = null;
        updateData.productId = productId;
        updateData.influencerId = influencerId;
      }
    } else if (productId !== undefined || influencerId !== undefined) {
      // 如果更新了productId或influencerId，但未提供sampleId，则保持现有sampleId（可能为null）
      if (productId !== undefined) {
        const Product = require('../models/Product');
        const product = await Product.findOne({
          _id: productId,
          companyId: req.companyId
        });
        if (!product) {
          return res.status(400).json({
            success: false,
            message: '商品不存在'
          });
        }
        updateData.productId = productId;
      }
      if (influencerId !== undefined) {
        const Influencer = require('../models/Influencer');
        const influencer = await Influencer.findOne({
          _id: influencerId,
          companyId: req.companyId
        });
        if (!influencer) {
          return res.status(400).json({
            success: false,
            message: '达人不存在'
          });
        }
        updateData.influencerId = influencerId;
      }
    }

    // 处理操作员更新
    if (createdBy !== undefined && createdBy !== req.user._id) {
      const User = require('../models/User');
      const operator = await User.findOne({
        _id: createdBy,
        companyId: req.companyId
      });
      if (!operator) {
        return res.status(400).json({
          success: false,
          message: '操作员不存在'
        });
      }
      updateData.createdBy = createdBy;
    }

    // 更新视频信息字段
    if (videoLink !== undefined) {
      updateData.videoLink = videoLink;
    }
    if (videoStreamCode !== undefined) {
      updateData.videoStreamCode = videoStreamCode;
    }
    if (isAdPromotion !== undefined) {
      updateData.isAdPromotion = isAdPromotion;
      if (isAdPromotion) {
        updateData.adPromotionTime = adPromotionTime ? new Date(adPromotionTime) : new Date();
      }
    }
    if (adPromotionTime !== undefined) {
      updateData.adPromotionTime = new Date(adPromotionTime);
    }

    const video = await Video.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频记录不存在'
      });
    }

    // 同步更新样品的快捷标记（仅当有关联样品时）
    if (video.sampleId && (isAdPromotion !== undefined || videoStreamCode !== undefined)) {
      const allVideosOfSample = await Video.find({ sampleId: video.sampleId });
      const anyAdPromoted = allVideosOfSample.some(v => v.isAdPromotion);
      
      const sampleUpdateData = { isAdPromotion: anyAdPromoted };
      if (anyAdPromoted) {
        sampleUpdateData.adPromotionUpdatedBy = req.user._id;
        sampleUpdateData.adPromotionUpdatedAt = new Date();
      }
      
      await SampleManagement.findByIdAndUpdate(video.sampleId, sampleUpdateData);
    }

    res.json({
      success: true,
      message: '更新视频登记成功',
      data: { video }
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: '更新视频登记失败'
    });
  }
});

/**
 * @route   DELETE /api/videos/:id
 * @desc    删除视频登记
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('videos:delete', 'samplesBd:delete'), async (req, res) => {
  try {
    const video = await Video.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: '视频记录不存在'
      });
    }

    // 检查该样品是否还有其他视频，更新样品快捷标记（仅当有关联样品时）
    if (video.sampleId) {
      const remainingVideos = await Video.find({ sampleId: video.sampleId });
      const anyAdPromoted = remainingVideos.some(v => v.isAdPromotion);
      
      await SampleManagement.findByIdAndUpdate(video.sampleId, {
        isAdPromotion: anyAdPromoted
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
});

module.exports = router;
