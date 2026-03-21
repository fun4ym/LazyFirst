const router = require('express').Router();
const Shop = require('../models/Shop');
const ShopContact = require('../models/ShopContact');
const ShopTracking = require('../models/ShopTracking');
const ShopRating = require('../models/ShopRating');
const { authenticate, authorize } = require('../middleware/auth');

// 获取店铺列表
router.get('/', authenticate, authorize('shops:read'), async (req, res) => {
  try {
    const { companyId, status, keyword, page = 1, limit = 20 } = req.query;

    const query = {};

    // 只有当 companyId 有有效值时才添加到查询条件
    if (companyId && companyId.trim()) {
      query.companyId = companyId;
    }

    if (status) {
      query.status = status;
    }

    if (keyword) {
      query.$or = [
        { shopName: { $regex: keyword, $options: 'i' } },
        { shopNumber: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const shops = await Shop.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 获取每个店铺的评分
    const shopIds = shops.map(s => s._id);
    const ratings = await ShopRating.find({ shopId: { $in: shopIds } });
    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r.shopId] = r;
    });

    const shopsWithRating = shops.map(shop => ({
      ...shop.toObject(),
      creditRating: ratingMap[shop._id]?.creditRating || 5,
      cooperationRating: ratingMap[shop._id]?.cooperationRating || 5
    }));

    const total = await Shop.countDocuments(query);

    res.json({
      success: true,
      shops: shopsWithRating,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取店铺列表失败:', error);
    res.status(500).json({ success: false, message: '获取店铺列表失败' });
  }
});

// 获取店铺详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    // 获取联系人
    const contacts = await ShopContact.find({ shopId: shop._id })
      .populate('trackerId', 'username realName');

    // 获取跟踪记录
    const trackings = await ShopTracking.find({ shopId: shop._id })
      .populate('userId', 'username realName')
      .sort({ trackingDate: -1 })
      .limit(20);

    // 获取评分
    const rating = await ShopRating.findOne({ shopId: shop._id })
      .populate('updatedBy', 'username realName');

    res.json({
      success: true,
      shop,
      contacts,
      trackings,
      rating
    });
  } catch (error) {
    console.error('获取店铺详情失败:', error);
    res.status(500).json({ success: false, message: '获取店铺详情失败' });
  }
});

// 创建店铺
router.post('/', authenticate, authorize('shops:create'), async (req, res) => {
  try {
    const { companyId, shopName, shopNumber, avatar, contactAddress, remark } = req.body;

    // 检查店铺号是否已存在
    const existing = await Shop.findOne({ companyId, shopNumber });
    if (existing) {
      return res.status(400).json({ success: false, message: '该店铺号已存在' });
    }

    const shop = new Shop({
      companyId,
      shopName,
      shopNumber,
      avatar: avatar || '',
      contactAddress: contactAddress || '',
      remark: remark || ''
    });

    await shop.save();

    // 创建默认评分
    await ShopRating.create({
      companyId,
      shopId: shop._id,
      creditRating: 5,
      cooperationRating: 5
    });

    res.json({ success: true, shop });
  } catch (error) {
    console.error('创建店铺失败:', error);
    res.status(500).json({ success: false, message: '创建店铺失败' });
  }
});

// 更新店铺
router.put('/:id', authenticate, authorize('shops:update'), async (req, res) => {
  try {
    const { shopName, shopNumber, avatar, contactAddress, remark, status } = req.body;

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    // 检查店铺号是否已被其他店铺使用
    if (shopNumber && shopNumber !== shop.shopNumber) {
      const existing = await Shop.findOne({
        _id: { $ne: shop._id },
        companyId: shop.companyId,
        shopNumber
      });
      if (existing) {
        return res.status(400).json({ success: false, message: '该店铺号已被使用' });
      }
    }

    shop.shopName = shopName || shop.shopName;
    shop.shopNumber = shopNumber || shop.shopNumber;
    shop.avatar = avatar !== undefined ? avatar : shop.avatar;
    shop.contactAddress = contactAddress !== undefined ? contactAddress : shop.contactAddress;
    shop.remark = remark !== undefined ? remark : shop.remark;
    shop.status = status || shop.status;

    await shop.save();

    res.json({ success: true, shop });
  } catch (error) {
    console.error('更新店铺失败:', error);
    res.status(500).json({ success: false, message: '更新店铺失败' });
  }
});

// 删除店铺
router.delete('/:id', authenticate, authorize('shops:delete'), async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    // 删除相关数据
    await ShopContact.deleteMany({ shopId: shop._id });
    await ShopTracking.deleteMany({ shopId: shop._id });
    await ShopRating.deleteMany({ shopId: shop._id });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除店铺失败:', error);
    res.status(500).json({ success: false, message: '删除店铺失败' });
  }
});

// 添加联系人
router.post('/:id/contacts', authenticate, async (req, res) => {
  try {
    const { name, phone, email, trackerId } = req.body;
    const shopId = req.params.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    const contact = new ShopContact({
      companyId: shop.companyId,
      shopId,
      name,
      phone,
      email,
      trackerId
    });

    await contact.save();

    res.json({ success: true, contact });
  } catch (error) {
    console.error('添加联系人失败:', error);
    res.status(500).json({ success: false, message: '添加联系人失败' });
  }
});

// 更新联系人
router.put('/:id/contacts/:contactId', authenticate, async (req, res) => {
  try {
    const { name, phone, email, trackerId } = req.body;

    const contact = await ShopContact.findById(req.params.contactId);
    if (!contact) {
      return res.status(404).json({ success: false, message: '联系人不存在' });
    }

    contact.name = name || contact.name;
    contact.phone = phone !== undefined ? phone : contact.phone;
    contact.email = email !== undefined ? email : contact.email;
    contact.trackerId = trackerId !== undefined ? trackerId : contact.trackerId;

    await contact.save();

    res.json({ success: true, contact });
  } catch (error) {
    console.error('更新联系人失败:', error);
    res.status(500).json({ success: false, message: '更新联系人失败' });
  }
});

// 删除联系人
router.delete('/:id/contacts/:contactId', authenticate, async (req, res) => {
  try {
    const contact = await ShopContact.findByIdAndDelete(req.params.contactId);

    if (!contact) {
      return res.status(404).json({ success: false, message: '联系人不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除联系人失败:', error);
    res.status(500).json({ success: false, message: '删除联系人失败' });
  }
});

// 添加跟踪记录
router.post('/:id/trackings', authenticate, async (req, res) => {
  try {
    const { action, trackingDate } = req.body;
    const shopId = req.params.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    const tracking = new ShopTracking({
      companyId: shop.companyId,
      shopId,
      userId: req.user.id,
      userName: req.user.realName || req.user.username,
      action,
      trackingDate: trackingDate || new Date()
    });

    await tracking.save();

    res.json({ success: true, tracking });
  } catch (error) {
    console.error('添加跟踪记录失败:', error);
    res.status(500).json({ success: false, message: '添加跟踪记录失败' });
  }
});

// 更新评分
router.put('/:id/rating', authenticate, async (req, res) => {
  try {
    const { creditRating, creditRemark, cooperationRating, cooperationRemark } = req.body;
    const shopId = req.params.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    const rating = await ShopRating.findOneAndUpdate(
      { shopId },
      {
        creditRating,
        creditRemark,
        cooperationRating,
        cooperationRemark,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, rating });
  } catch (error) {
    console.error('更新评分失败:', error);
    res.status(500).json({ success: false, message: '更新评分失败' });
  }
});

// 生成/刷新识别码
// 识别码 = SHA256(店铺名称 + 系统时间).substring(0, 16)
router.put('/:id/identification-code', authenticate, async (req, res) => {
  try {
    const crypto = require('crypto');
    const shopId = req.params.id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ success: false, message: '店铺不存在' });
    }

    // 生成识别码
    const timestamp = new Date().toISOString();
    const hashInput = shop.shopName + timestamp;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const identificationCode = hash.substring(0, 16);

    // 更新店铺
    shop.identificationCode = identificationCode;
    shop.identificationCodeGeneratedAt = new Date();
    await shop.save();

    res.json({
      success: true,
      message: '识别码生成成功',
      identificationCode: shop.identificationCode,
      identificationCodeGeneratedAt: shop.identificationCodeGeneratedAt
    });
  } catch (error) {
    console.error('生成识别码失败:', error);
    res.status(500).json({ success: false, message: '生成识别码失败' });
  }
});

module.exports = router;
