const router = require('express').Router();
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');
const ReportOrder = require('../models/ReportOrder');
const BaseData = require('../models/BaseData');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');

// 获取达人列表
router.get('/', authenticate, authorize('influencers:read'), filterByDataScope({ module: 'influencers', ownerField: 'assignedTo', deptField: 'deptId' }), async (req, res) => {
  try {
    const { companyId, poolType, status, categoryTag, keyword, page = 1, limit = 20, gmvFrom, monthlySalesFrom, followersFrom, avgViewsFrom, ignoreDataScope } = req.query;
    const userId = req.user._id;

    // 如果ignoreDataScope为true，则忽略数据权限过滤，允许查看所有达人
    const ignoreScope = ignoreDataScope === 'true';

    // 公海达人：无论权限都能看到（不受数据权限限制）
    // 私海达人：按数据权限过滤
    let query = {};

    // 只有当 companyId 有有效值时才添加到查询条件
    if (companyId && companyId.trim()) {
      query.companyId = companyId;
    }

    // 根据poolType分别处理
    if (poolType === 'public') {
      // 公海：不需要数据权限过滤
      query.poolType = 'public';
    } else if (poolType === 'private') {
      // 私海：使用数据权限过滤，除非ignoreScope为true
      if (ignoreScope) {
        query = { poolType: 'private', companyId: req.companyId };
      } else {
        query = { ...req.dataScope.query, poolType: 'private' };
      }
    } else {
      // 未指定poolType：公海全部 + 私海按数据权限
      // 使用 $or 组合：公海(所有) OR 私海(按数据权限)
      const dataScopeQuery = ignoreScope ? { companyId: req.companyId } : req.dataScope.query;
      // 移除dataScopeQuery中的companyId，避免重复
      delete dataScopeQuery.companyId;

      query = {
        $or: [
          { poolType: 'public', companyId: req.companyId },
          { poolType: 'private', companyId: req.companyId, ...dataScopeQuery }
        ]
      };
    }

    if (status) {
      query.status = status;
    }

    if (categoryTag) {
      query.categoryTags = categoryTag;
    }

    // 关键词搜索需要和权限条件结合
    if (keyword) {
      const keywordCondition = {
        $or: [
          { tiktokName: { $regex: keyword, $options: 'i' } },
          { tiktokId: { $regex: keyword, $options: 'i' } },
          { realName: { $regex: keyword, $options: 'i' } },
          { nickname: { $regex: keyword, $options: 'i' } }
        ]
      };

      // 如果已有$or权限条件，需要用$and结合
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          keywordCondition
        ];
        delete query.$or;
      } else {
        query.$or = keywordCondition.$or;
      }
    }

    // GMV筛选
    if (gmvFrom) {
      query.latestGmv = { $gte: parseFloat(gmvFrom) };
    }

    // 月销件数筛选
    if (monthlySalesFrom) {
      query.monthlySalesCount = { $gte: parseInt(monthlySalesFrom) };
    }

    // 粉丝数筛选
    if (followersFrom) {
      query.latestFollowers = { $gte: parseInt(followersFrom) };
    }

    // 均播筛选
    if (avgViewsFrom) {
      query.avgVideoViews = { $gte: parseFloat(avgViewsFrom) };
    }

    const skip = (page - 1) * limit;
    const influencers = await Influencer.find(query)
      .populate('assignedTo', 'username realName')
      .populate('categoryTags', 'name')
      .populate('suitableCategories', 'name')
      .populate('latestMaintainerId', 'username realName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Influencer.countDocuments(query);

    res.json({
      success: true,
      influencers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取达人列表失败:', error);
    res.status(500).json({ success: false, message: '获取达人列表失败' });
  }
});

// 获取达人详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const influencer = await Influencer.findById(req.params.id)
      .populate('assignedTo', 'username realName')
      .populate('categoryTags', 'name')
      .populate('suitableCategories', 'name')
      .populate('latestMaintainerId', 'username realName');

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    // 获取维护记录
    const maintenances = await InfluencerMaintenance.find({ influencerId: influencer._id })
      .populate('maintainerId', 'username realName')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      influencer,
      maintenances
    });
  } catch (error) {
    console.error('获取达人详情失败:', error);
    res.status(500).json({ success: false, message: '获取达人详情失败' });
  }
});

// 创建达人
router.post('/', authenticate, authorize('influencers:create'), async (req, res) => {
  try {
    console.log('创建达人 - 收到数据:', JSON.stringify(req.body, null, 2));

    const { companyId, tiktokName, tiktokId, formerNames, formerIds, originalTiktokId, status, categoryTags,
      realName, nickname, gender, addresses, phoneNumbers, socialAccounts,
      monthlySalesCount, suitableCategories, avgVideoViews } = req.body;

    const userId = req.user.id;

    console.log('创建达人 - 解构后数据:', {
      companyId,
      tiktokName,
      tiktokId,
      categoryTags,
      addresses,
      phoneNumbers,
      socialAccounts,
      monthlySalesCount,
      suitableCategories,
      avgVideoViews
    });

    // 检查TikTok ID是否已存在
    const existing = await Influencer.findOne({ companyId, tiktokId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该TikTok ID已存在' });
    }

    const influencer = new Influencer({
      companyId,
      tiktokName,
      tiktokId,
      formerNames: formerNames || tiktokName,
      formerIds: formerIds || tiktokId,
      originalTiktokId: originalTiktokId || '',
      status: status || 'enabled',
      categoryTags: categoryTags || [],
      realName: realName || '',
      nickname: nickname || '',
      gender: gender || 'other',
      addresses: addresses || [],
      phoneNumbers: phoneNumbers || [],
      socialAccounts: socialAccounts || [],
      poolType: 'public',
      monthlySalesCount: monthlySalesCount || 0,
      suitableCategories: suitableCategories || [],
      avgVideoViews: avgVideoViews || 0
    });

    await influencer.save();

    res.json({ success: true, influencer });
  } catch (error) {
    console.error('创建达人失败 - 详细错误:', error);
    console.error('创建达人失败 - 错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '创建达人失败', error: error.message });
  }
});

// 更新达人
router.put('/:id', authenticate, authorize('influencers:update'), async (req, res) => {
  try {
    const { tiktokName, tiktokId, formerNames, formerIds, originalTiktokId, status, categoryTags,
      realName, nickname, gender, addresses, phoneNumbers, socialAccounts,
      monthlySalesCount, suitableCategories, avgVideoViews } = req.body;

    const influencer = await Influencer.findById(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    // 黑名单达人不可修改任何信息
    if (influencer.isBlacklisted) {
      return res.status(400).json({ success: false, message: '该达人已被列入黑名单，无法修改信息' });
    }

    // 检查TikTok ID是否已被其他达人使用
    if (tiktokId && tiktokId !== influencer.tiktokId) {
      const existing = await Influencer.findOne({
        _id: { $ne: influencer._id },
        companyId: influencer.companyId,
        tiktokId
      });
      if (existing) {
        return res.status(400).json({ success: false, message: '该TikTok ID已被使用' });
      }
    }

    influencer.tiktokName = tiktokName || influencer.tiktokName;
    influencer.tiktokId = tiktokId || influencer.tiktokId;
    influencer.formerNames = formerNames !== undefined ? formerNames : influencer.formerNames;
    influencer.formerIds = formerIds !== undefined ? formerIds : influencer.formerIds;
    influencer.originalTiktokId = originalTiktokId !== undefined ? originalTiktokId : influencer.originalTiktokId;
    influencer.status = status || influencer.status;
    influencer.categoryTags = categoryTags || influencer.categoryTags;
    influencer.realName = realName !== undefined ? realName : influencer.realName;
    influencer.nickname = nickname !== undefined ? nickname : influencer.nickname;
    influencer.gender = gender || influencer.gender;
    influencer.addresses = addresses || influencer.addresses;
    influencer.phoneNumbers = phoneNumbers || influencer.phoneNumbers;
    influencer.socialAccounts = socialAccounts || influencer.socialAccounts;
    influencer.monthlySalesCount = monthlySalesCount !== undefined ? monthlySalesCount : influencer.monthlySalesCount;
    influencer.suitableCategories = suitableCategories || influencer.suitableCategories;
    influencer.avgVideoViews = avgVideoViews !== undefined ? avgVideoViews : influencer.avgVideoViews;

    await influencer.save();

    res.json({ success: true, influencer });
  } catch (error) {
    console.error('更新达人失败:', error);
    res.status(500).json({ success: false, message: '更新达人失败' });
  }
});

// 删除达人
router.delete('/:id', authenticate, authorize('influencers:delete'), async (req, res) => {
  try {
    const influencer = await Influencer.findByIdAndDelete(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    // 删除相关维护记录
    await InfluencerMaintenance.deleteMany({ influencerId: influencer._id });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除达人失败:', error);
    res.status(500).json({ success: false, message: '删除达人失败' });
  }
});

// 添加维护记录
router.post('/:id/maintenance', authenticate, async (req, res) => {
  try {
    const { followers, gmv, monthlySalesCount, avgVideoViews, remark } = req.body;
    const influencerId = req.params.id;
    const userId = req.user.id;

    const influencer = await Influencer.findById(influencerId);
    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    // 创建维护记录
    const maintenance = new InfluencerMaintenance({
      companyId: influencer.companyId,
      influencerId,
      followers: followers || 0,
      gmv: gmv || 0,
      monthlySalesCount: monthlySalesCount || 0,
      avgVideoViews: avgVideoViews || 0,
      remark: remark || '',
      maintainerId: userId,
      maintainerName: req.user.realName || req.user.username
    });

    await maintenance.save();

    // 更新达人最新维护信息
    influencer.latestFollowers = followers || 0;
    influencer.latestGmv = gmv || 0;
    influencer.monthlySalesCount = monthlySalesCount || 0;
    influencer.avgVideoViews = avgVideoViews || 0;
    influencer.latestMaintenanceTime = maintenance.createdAt;
    influencer.latestMaintainerId = userId;
    influencer.latestMaintainerName = req.user.realName || req.user.username;
    influencer.latestRemark = remark || '';

    await influencer.save();

    res.json({ success: true, maintenance, influencer });
  } catch (error) {
    console.error('添加维护记录失败:', error);
    res.status(500).json({ success: false, message: '添加维护记录失败' });
  }
});

// 领取达人到私海
router.post('/:id/claim', authenticate, async (req, res) => {
  try {
    const influencer = await Influencer.findById(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    if (influencer.poolType !== 'public') {
      return res.status(400).json({ success: false, message: '该达人不在公海' });
    }

    influencer.poolType = 'private';
    influencer.assignedTo = req.user.id;
    influencer.assignedAt = new Date();

    await influencer.save();

    res.json({ success: true, influencer });
  } catch (error) {
    console.error('领取达人失败:', error);
    res.status(500).json({ success: false, message: '领取达人失败' });
  }
});

// 释放达人到公海
router.post('/:id/release', authenticate, async (req, res) => {
  try {
    const influencer = await Influencer.findById(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    if (influencer.poolType !== 'private') {
      return res.status(400).json({ success: false, message: '该达人不在私海' });
    }

    influencer.poolType = 'public';
    influencer.assignedTo = null;
    influencer.assignedAt = null;

    await influencer.save();

    res.json({ success: true, influencer });
  } catch (error) {
    console.error('释放达人失败:', error);
    res.status(500).json({ success: false, message: '释放达人失败' });
  }
});

// 批量操作
router.post('/batch', authenticate, async (req, res) => {
  try {
    const { action, influencerIds } = req.body;

    if (!action || !influencerIds || !Array.isArray(influencerIds)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    let result;

    switch (action) {
      case 'claim':
        result = await Influencer.updateMany(
          { _id: { $in: influencerIds }, poolType: 'public' },
          { poolType: 'private', assignedTo: req.user.id, assignedAt: new Date() }
        );
        break;

      case 'release':
        result = await Influencer.updateMany(
          { _id: { $in: influencerIds }, poolType: 'private', assignedTo: req.user.id },
          { poolType: 'public', assignedTo: null, assignedAt: null }
        );
        break;

      case 'enable':
        result = await Influencer.updateMany(
          { _id: { $in: influencerIds } },
          { status: 'enabled' }
        );
        break;

      case 'disable':
        result = await Influencer.updateMany(
          { _id: { $in: influencerIds } },
          { status: 'disabled' }
        );
        break;

      default:
        return res.status(400).json({ success: false, message: '不支持的操作' });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({ success: false, message: '批量操作失败' });
  }
});

// 标记黑名单
router.post('/:id/blacklist', authenticate, authorize('influencers:btn-add-blacklist'), async (req, res) => {
  try {
    const { reason } = req.body;
    const influencer = await Influencer.findById(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    if (influencer.isBlacklisted) {
      return res.status(400).json({ success: false, message: '该达人已在黑名单中' });
    }

    // 获取上一次维护记录的粉丝数和GMV
    const lastMaintenance = await InfluencerMaintenance.findOne({ influencerId: influencer._id })
      .sort({ createdAt: -1 })
      .lean();

    const followers = lastMaintenance ? lastMaintenance.followers : 0;
    const gmv = lastMaintenance ? lastMaintenance.gmv : 0;

    // 标记达人为黑名单
    influencer.isBlacklisted = true;
    influencer.blacklistedAt = new Date();
    influencer.blacklistedBy = req.user.id;
    influencer.blacklistedByName = req.user.realName || req.user.username;
    influencer.blacklistReason = reason || '';
    await influencer.save();

    // 添加维护记录（拉黑时同时写维护记录）
    const maintenance = {
      companyId: influencer.companyId,
      influencerId: influencer._id,
      followers: followers,
      gmv: gmv,
      poolType: influencer.poolType,
      remark: reason || '拉黑',
      maintainerId: req.user.id,
      maintainerName: req.user.realName || req.user.username,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await InfluencerMaintenance.create(maintenance);

    // 将该达人相关的ReportOrder也标记为黑名单
    await ReportOrder.updateMany(
      { influencerUsername: influencer.tiktokId, companyId: influencer.companyId },
      { isBlacklistedInfluencer: true }
    );

    res.json({ success: true, message: '已将达人列入黑名单', influencer });
  } catch (error) {
    console.error('标记黑名单失败:', error);
    res.status(500).json({ success: false, message: '标记黑名单失败' });
  }
});

// 释放黑名单
router.post('/:id/release-blacklist', authenticate, authorize('influencers:btn-remove-blacklist'), async (req, res) => {
  try {
    const influencer = await Influencer.findById(req.params.id);

    if (!influencer) {
      return res.status(404).json({ success: false, message: '达人不存在' });
    }

    if (!influencer.isBlacklisted) {
      return res.status(400).json({ success: false, message: '该达人不在黑名单中' });
    }

    // 移除黑名单标记
    influencer.isBlacklisted = false;
    influencer.blacklistedAt = null;
    influencer.blacklistedBy = null;
    influencer.blacklistedByName = '';
    influencer.blacklistReason = '';
    await influencer.save();

    // 移除该达人相关的ReportOrder黑名单标记
    await ReportOrder.updateMany(
      { influencerUsername: influencer.tiktokId, companyId: influencer.companyId },
      { isBlacklistedInfluencer: false }
    );

    res.json({ success: true, message: '已释放黑名单', influencer });
  } catch (error) {
    console.error('释放黑名单失败:', error);
    res.status(500).json({ success: false, message: '释放黑名单失败' });
  }
});

// 获取黑名单列表
router.get('/blacklist/list', authenticate, async (req, res) => {
  try {
    const { companyId, keyword, page = 1, limit = 20 } = req.query;

    const query = { companyId, isBlacklisted: true };

    if (keyword) {
      query.$or = [
        { tiktokName: { $regex: keyword, $options: 'i' } },
        { tiktokId: { $regex: keyword, $options: 'i' } },
        { realName: { $regex: keyword, $options: 'i' } },
        { nickname: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const influencers = await Influencer.find(query)
      .populate('assignedTo', 'username realName')
      .populate('categoryTags', 'name')
      .populate('suitableCategories', 'name')
      .populate('latestMaintainerId', 'username realName')
      .sort({ blacklistedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Influencer.countDocuments(query);

    res.json({
      success: true,
      influencers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取黑名单列表失败:', error);
    res.status(500).json({ success: false, message: '获取黑名单列表失败' });
  }
});

// 检查TikTok ID是否为黑名单
router.get('/blacklist/check/:tiktokId', authenticate, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { tiktokId } = req.params;

    const influencer = await Influencer.findOne({ companyId, tiktokId });

    if (!influencer) {
      return res.json({ success: true, isBlacklisted: false });
    }

    res.json({
      success: true,
      isBlacklisted: influencer.isBlacklisted,
      influencer: influencer.isBlacklisted ? {
        tiktokId: influencer.tiktokId,
        tiktokName: influencer.tiktokName,
        blacklistedAt: influencer.blacklistedAt,
        blacklistedByName: influencer.blacklistedByName,
        blacklistReason: influencer.blacklistReason
      } : null
    });
  } catch (error) {
    console.error('检查黑名单失败:', error);
    res.status(500).json({ success: false, message: '检查黑名单失败' });
  }
});

module.exports = router;
