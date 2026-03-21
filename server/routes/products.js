const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize, filterByDataScope } = require('../middleware/auth');
const { Product, Shop, ShopContact } = require('../models');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    获取商品列表（支持合作产品相关筛选）
 * @access  Private
 */
router.get('/', authenticate, authorize('products:read'), filterByDataScope({ module: 'products' }), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, activityId, keyword } = req.query;

    // 应用数据权限过滤
    const query = { ...req.dataScope.query };
    console.log('[商品管理] 数据权限过滤 - req.dataScope:', JSON.stringify(req.dataScope));
    console.log('[商品管理] 数据权限过滤 - query:', JSON.stringify(query));

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tiktokProductId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    // 按活动筛选
    if (activityId) {
      query['activityCommissions.activityId'] = activityId;
    }

    // 关键词搜索（兼容合作产品）
    if (keyword) {
      query.$or = query.$or || [];
      query.$or.push(
        { name: { $regex: keyword, $options: 'i' } },
        { tiktokProductId: { $regex: keyword, $options: 'i' } }
      );
    }

    const products = await Product.find(query)
      .populate('supplierId', 'name')
      .populate('shopId', 'name shopName shopNumber')
      .populate('categoryId', 'name')
      .populate('activityCommissions.activityId', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    // 获取所有商品关联的店铺ID
    const shopIds = products.filter(p => p.shopId).map(p => p.shopId._id || p.shopId);
    // 批量查询店铺联系人
    let shopContacts = [];
    if (shopIds.length > 0) {
      shopContacts = await ShopContact.find({ shopId: { $in: shopIds } }).lean();
    }
    const shopContactMap = {};
    shopContacts.forEach(c => {
      shopContactMap[c.shopId.toString()] = c;
    });
    // 将联系人信息附加到商品店铺对象上
    products.forEach(p => {
      if (p.shopId && p.shopId._id) {
        const contact = shopContactMap[p.shopId._id.toString()];
        if (contact) {
          p.shopId.contactId = {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            address: contact.address
          };
        }
      }
    });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
});

/**
 * @route   POST /api/products
 * @desc    创建商品（支持合作产品字段）
 * @access  Private
 */
router.post('/', authenticate, authorize('products:create'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      companyId: req.companyId
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: '创建商品成功',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建商品失败'
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    获取商品详情
 * @access  Private
 */
router.get('/:id', authenticate, authorize('products:read'), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      companyId: req.companyId
    })
    .populate('supplierId', 'name contact')
    .populate('shopId', 'name country')
    .populate('categoryId', 'name')
    .populate('gradeId', 'name')
    .populate('activityCommissions.activityId', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: '获取商品详情失败'
    });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    更新商品（支持合作产品字段）
 * @access  Private
 */
router.put('/:id', authenticate, authorize('products:update'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      message: '更新成功',
      data: { product }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新商品失败'
    });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    删除商品
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('products:delete'), async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败'
    });
  }
});

/**
 * @route   PUT /api/products/:id/activity-commission
 * @desc    更新产品的活动佣金配置
 * @access  Private
 */
router.put('/:id/activity-commission', authenticate, authorize('products:update'), async (req, res) => {
  try {
    const { activityCommissions } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    product.activityCommissions = activityCommissions || [];
    await product.save();

    res.json({
      success: true,
      message: '活动佣金配置更新成功',
      data: { product }
    });

  } catch (error) {
    console.error('Update activity commission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新活动佣金配置失败'
    });
  }
});

module.exports = router;
