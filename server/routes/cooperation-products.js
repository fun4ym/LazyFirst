const router = require('express').Router();
const CooperationProduct = require('../models/CooperationProduct');
const Shop = require('../models/Shop');
const { authenticate } = require('../middleware/auth');

// 获取合作产品列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { companyId, status, activityId, keyword, page = 1, limit = 20 } = req.query;

    const query = { companyId };

    if (status) {
      query.status = status;
    }

    if (activityId) {
      query['activityCommissions.activityId'] = activityId;
    }

    const skip = (page - 1) * limit;
    const products = await CooperationProduct.find(query)
      .populate('activityCommissions.activityId', 'name')
      .populate('shopId', 'shopName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    let filteredProducts = products;
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filteredProducts = products.filter(p =>
        p.productId.toLowerCase().includes(keywordLower) ||
        (p.productName && p.productName.toLowerCase().includes(keywordLower)) ||
        (p.shopId && p.shopId.shopName && p.shopId.shopName.toLowerCase().includes(keywordLower))
      );
    }

    const total = await CooperationProduct.countDocuments(query);

    res.json({
      success: true,
      products: filteredProducts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('获取合作产品列表失败:', error);
    res.status(500).json({ success: false, message: '获取合作产品列表失败' });
  }
});

// 获取合作产品详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await CooperationProduct.findById(req.params.id)
      .populate('activityCommissions.activityId', 'name')
      .populate('shopId', 'shopName');

    if (!product) {
      return res.status(404).json({ success: false, message: '合作产品不存在' });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('获取合作产品详情失败:', error);
    res.status(500).json({ success: false, message: '获取合作产品详情失败' });
  }
});

// 创建合作产品
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      companyId, productId, productName,
      shopId, productCategory, productGrade, tapExclusiveLink,
      sampleMethod, cooperationCountry, sampleTarget, influencerRequirement,
      productImages, productIntro, referenceVideo, sellingPoints,
      activityCommissions
    } = req.body;

    // 检查商品ID是否已存在
    const existing = await CooperationProduct.findOne({ companyId, productId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该商品ID已存在' });
    }

    const product = new CooperationProduct({
      companyId,
      productId,
      productName,
      shopId,
      productCategory,
      productGrade: productGrade || 'ordinary',
      tapExclusiveLink,
      sampleMethod,
      cooperationCountry,
      sampleTarget,
      influencerRequirement,
      productImages: productImages || [],
      productIntro,
      referenceVideo,
      sellingPoints,
      activityCommissions: activityCommissions || []
    });

    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    console.error('创建合作产品失败:', error);
    res.status(500).json({ success: false, message: error.message || '创建合作产品失败' });
  }
});

// 更新合作产品
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      productId, productName,
      shopId, productCategory, productGrade, tapExclusiveLink,
      sampleMethod, cooperationCountry, sampleTarget, influencerRequirement,
      productImages, productIntro, referenceVideo, sellingPoints,
      activityCommissions, status
    } = req.body;

    const product = await CooperationProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: '合作产品不存在' });
    }

    // 检查商品ID是否已被其他产品使用
    if (productId && productId !== product.productId) {
      const existing = await CooperationProduct.findOne({
        _id: { $ne: product._id },
        companyId: product.companyId,
        productId
      });
      if (existing) {
        return res.status(400).json({ success: false, message: '该商品ID已被使用' });
      }
    }

    product.productId = productId || product.productId;
    product.productName = productName !== undefined ? productName : product.productName;
    product.shopId = shopId !== undefined ? shopId : product.shopId;
    product.productCategory = productCategory !== undefined ? productCategory : product.productCategory;
    product.productGrade = productGrade || product.productGrade;
    product.tapExclusiveLink = tapExclusiveLink !== undefined ? tapExclusiveLink : product.tapExclusiveLink;
    product.sampleMethod = sampleMethod !== undefined ? sampleMethod : product.sampleMethod;
    product.cooperationCountry = cooperationCountry !== undefined ? cooperationCountry : product.cooperationCountry;
    product.sampleTarget = sampleTarget !== undefined ? sampleTarget : product.sampleTarget;
    product.influencerRequirement = influencerRequirement !== undefined ? influencerRequirement : product.influencerRequirement;
    product.productImages = productImages !== undefined ? productImages : product.productImages;
    product.productIntro = productIntro !== undefined ? productIntro : product.productIntro;
    product.referenceVideo = referenceVideo !== undefined ? referenceVideo : product.referenceVideo;
    product.sellingPoints = sellingPoints !== undefined ? sellingPoints : product.sellingPoints;
    product.activityCommissions = activityCommissions !== undefined ? activityCommissions : product.activityCommissions;
    product.status = status || product.status;

    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    console.error('更新合作产品失败:', error);
    res.status(500).json({ success: false, message: error.message || '更新合作产品失败' });
  }
});

// 删除合作产品
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await CooperationProduct.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: '合作产品不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除合作产品失败:', error);
    res.status(500).json({ success: false, message: '删除合作产品失败' });
  }
});

module.exports = router;
