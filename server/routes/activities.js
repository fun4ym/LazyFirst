const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const Activity = require('../models/Activity');
const ActivityHistory = require('../models/ActivityHistory');
const { Product } = require('../models');
const Shop = require('../models/Shop');
const BaseData = require('../models/BaseData');

const router = express.Router();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Excel列标题验证
const EXPECTED_HEADERS = [
  '活动 ID',
  '商品名称',
  '',  // C列图片（可能为空）
  '商品 ID',
  '售价',
  '店铺名称',
  '商品生效时间',
  '商品失效时间',
  '创作者佣金率',
  '联盟团长佣金率',
  '达人店铺广告佣金率',
  '联盟服务商店铺广告佣金率',
  '商品链接',
  '商品详情页'
];

// 解析价格区间（如 ฿147.83-฿327.61）
const parsePriceRange = (priceStr) => {
  if (!priceStr) return { min: 0, max: 0, currency: 'USD' };
  
  // 提取货币符号
  const currencyMap = {
    '฿': 'THB',
    '$': 'USD',
    '¥': 'CNY',
    '€': 'EUR',
    '£': 'GBP'
  };
  
  let currency = 'USD';
  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (priceStr.includes(symbol)) {
      currency = code;
      break;
    }
  }
  
  // 提取数字
  const numbers = priceStr.match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) return { min: 0, max: 0, currency };
  
  const min = parseFloat(numbers[0]) || 0;
  const max = numbers.length > 1 ? parseFloat(numbers[1]) || min : min;
  
  return { min, max, currency };
};

// 解析百分比（如 25.00%）
const parsePercentage = (percentStr) => {
  if (!percentStr) return 0;
  const match = percentStr.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) / 100 : 0;
};

// 获取或创建店铺
const getOrCreateShop = async (companyId, shopName) => {
  let shop = await Shop.findOne({ companyId, shopName });
  if (shop) {
    return shop;
  }
  
  // 生成shopNumber（使用时间戳+随机数）
  const shopNumber = `SHOP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  shop = await Shop.create({
    companyId,
    shopName,
    shopNumber
  });
  
  return shop;
};

// 获取货币单位
const getCurrencyCode = async (companyId, currencySymbol) => {
  const currencyMap = {
    'THB': '泰铢',
    'USD': '美元',
    'CNY': '人民币',
    'EUR': '欧元',
    'GBP': '英镑'
  };
  
  // 先从BaseData查找
  const baseData = await BaseData.findOne({
    companyId,
    type: 'priceUnit',
    name: currencyMap[currencySymbol] || currencySymbol
  });
  
  if (baseData && baseData.code) {
    return baseData.code;
  }
  
  // 返回默认值
  return currencySymbol || 'USD';
};

// 记录变更历史的辅助函数
const recordHistory = async (activityId, action, changes, previousData, newData, userId, userName, companyId) => {
  try {
    await ActivityHistory.create({
      activityId,
      action,
      changes,
      previousData,
      newData,
      changedBy: userId,
      changedByName: userName,
      companyId
    });
  } catch (error) {
    console.error('记录变更历史失败:', error);
  }
};

// 获取变更的字段
const getChangedFields = (previous, current) => {
  const changes = {};
  const previousData = {};
  const newData = {};

  for (const key in current) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') continue;

    if (previous && previous[key] !== current[key]) {
      changes[key] = true;
      previousData[key] = previous[key];
      newData[key] = current[key];
    }
  }

  return { changes, previousData, newData };
};

/**
 * @route   GET /api/activities
 * @desc    获取活动列表
 * @access  Private
 */
router.get('/', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      type,
      status
    } = req.query;

    const query = { companyId: req.companyId };

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const activities = await Activity.find(query)
      .populate('creatorId', 'realName')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Activity.countDocuments(query);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败'
    });
  }
});

/**
 * @route   POST /api/activities
 * @desc    创建活动
 * @access  Private
 */
router.post('/', authenticate, authorize('activities:create'), [
  body('name').notEmpty().withMessage('活动名称不能为空'),
  body('startDate').notEmpty().withMessage('开始时间不能为空'),
  body('endDate').notEmpty().withMessage('结束时间不能为空')
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

    const activityData = {
      ...req.body,
      companyId: req.companyId,
      creatorId: req.user._id
    };

    console.log('[Activities] Creating activity with data:', JSON.stringify(activityData, null, 2));
    const activity = await Activity.create(activityData);
    console.log('[Activities] Activity created:', activity._id);

    // 记录创建历史
    await recordHistory(
      activity._id,
      'create',
      { name: true, type: true, startDate: true, endDate: true, status: true },
      {},
      activityData,
      req.user._id,
      req.user.realName || req.user.username,
      req.companyId
    );

    res.status(201).json({
      success: true,
      message: '创建活动成功',
      data: { activity }
    });
  } catch (error) {
    console.error('[Activities] Create activity error:', error.message);
    console.error('[Activities] Error details:', error.stack);
    res.status(500).json({
      success: false,
      message: '创建活动失败: ' + error.message
    });
  }
});

/**
 * @route   PUT /api/activities/:id
 * @desc    更新活动
 * @access  Private
 */
router.put('/:id', authenticate, authorize('activities:update'), async (req, res) => {
  try {
    const existingActivity = await Activity.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!existingActivity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 获取变更的字段
    const { changes, previousData, newData } = getChangedFields(existingActivity.toObject(), req.body);

    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );

    // 检查状态是否变更
    let action = 'update';
    if (req.body.status && req.body.status !== existingActivity.status) {
      action = 'status_change';
    }

    // 如果有变更，记录历史
    if (Object.keys(changes).length > 0) {
      await recordHistory(
        activity._id,
        action,
        changes,
        previousData,
        newData,
        req.user._id,
        req.user.realName || req.user.username,
        req.companyId
      );
    }

    res.json({
      success: true,
      message: '更新活动成功',
      data: { activity }
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: '更新活动失败'
    });
  }
});

/**
 * @route   DELETE /api/activities/:id
 * @desc    删除活动
 * @access  Private
 */
router.delete('/:id', authenticate, authorize('activities:delete'), async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 记录删除历史
    await recordHistory(
      activity._id,
      'delete',
      {},
      activity.toObject(),
      {},
      req.user._id,
      req.user.realName || req.user.username,
      req.companyId
    );

    res.json({
      success: true,
      message: '删除活动成功'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败'
    });
  }
});

/**
 * @route   GET /api/activities/:id/history
 * @desc    获取活动变更历史
 * @access  Private
 */
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    const histories = await ActivityHistory.find({ activityId: req.params.id })
      .populate('changedBy', 'realName username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { histories }
    });
  } catch (error) {
    console.error('Get activity history error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动历史失败'
    });
  }
});

/**
 * @route   GET /api/activities/:id/products
 * @desc    获取活动关联的商品列表和数量
 * @access  Private
 */
router.get('/:id/products', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const activityId = req.params.id;

    // 检查活动是否存在
    const activity = await Activity.findOne({
      _id: activityId,
      companyId: req.companyId
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 查询参与该活动的商品
    const query = {
      companyId: req.companyId,
      'activityConfigs.activityId': activityId
    };

    const products = await Product.find(query)
      .populate('shopId', 'shopName')
      .populate('activityConfigs.activityId', 'name tikTokActivityId')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

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
    console.error('Get activity products error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动商品列表失败'
    });
  }
});

/**
 * @route   GET /api/activities/product-counts
 * @desc    批量获取各活动的商品数量
 * @access  Private
 */
router.get('/product-counts', authenticate, authorize('activities:read'), async (req, res) => {
  try {
    const { ids } = req.query;
    const activityIds = ids ? ids.split(',') : [];

    if (activityIds.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // 统计每个活动关联的商品数量
    const counts = {};
    for (const activityId of activityIds) {
      const count = await Product.countDocuments({
        companyId: req.companyId,
        'activityConfigs.activityId': activityId
      });
      counts[activityId] = count;
    }

    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    console.error('Get activity product counts error:', error);
    res.status(500).json({
      success: false,
      message: '获取活动商品数量失败'
    });
  }
});

/**
 * @route   POST /api/activities/:id/import-products
 * @desc    导入TikTok商品（通过Excel文件）
 * @access  Private
 */
router.post('/:id/import-products', authenticate, authorize('activities:btn-import-products'), upload.single('file'), async (req, res) => {
  try {
    const activityId = req.params.id;
    const companyId = req.companyId;
    
    // 检查活动是否存在
    const activity = await Activity.findOne({
      _id: activityId,
      companyId
    });
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }
    
    // 检查是否上传文件
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }
    
    // 解析Excel
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Excel文件为空或格式不正确'
      });
    }
    
    // 验证列标题
    const headers = data[0];
    console.log('[导入商品] headers数组:', JSON.stringify(headers));
    const expectedHeaders = ['活动 ID', '商品名称', '', '商品 ID', '售价', '店铺名称', '商品生效时间', '商品失效时间', '创作者佣金率', '联盟团长佣金率', '达人店铺广告佣金率', '联盟服务商店铺广告佣金率', '商品链接', '商品详情页'];
    
    // 检查关键列是否存在
    const activityIdCol = headers.indexOf('活动 ID');
    const productNameCol = headers.indexOf('商品名称');
    const productIdCol = headers.indexOf('商品 ID');
    const priceCol = headers.indexOf('售价');
    const shopNameCol = headers.indexOf('店铺名称');
    const creatorRateCol = headers.indexOf('创作者佣金率');
    const allianceRateCol = headers.indexOf('联盟团长佣金率');
    const adStoreRateCol = headers.indexOf('达人店铺广告佣金率');
    const adAllianceRateCol = headers.indexOf('联盟服务商店铺广告佣金率');
    const productLinkCol = headers.indexOf('商品链接');
    console.log('[导入商品] productLinkCol=', productLinkCol, 'headers长度=', headers.length);
    
    if (activityIdCol === -1 || productNameCol === -1 || productIdCol === -1 || priceCol === -1 || shopNameCol === -1) {
      return res.status(400).json({
        success: false,
        message: '请确认是否未选中正确规格excel文件，或联系管理员处理，并提示TikTok又他妈改了规则！'
      });
    }
    
    // 验证Excel中的活动ID是否匹配
    const excelActivityId = String(data[1]?.[activityIdCol]);
    const targetActivityId = String(activity.tikTokActivityId);
    
    if (excelActivityId !== targetActivityId) {
      return res.status(400).json({
        success: false,
        message: '当前导入数据与活动ID不符，请核对后重试'
      });
    }
    
    // 处理每一行数据
    const results = {
      success: [],
      failed: [],
      updated: [],
      created: []
    };
    
    // 从活动获取默认要求（如果没填就使用默认值）
    const defaultRequirements = {
      requirementGmv: activity.requirementGmv || 0,
      requirementMonthlySales: activity.requirementMonthlySales || 0,
      requirementFollowers: activity.requirementFollowers || 0,
      requirementAvgViews: activity.requirementAvgViews || 0,
      sampleMethod: activity.sampleMethod || '线上',
      cooperationCountry: activity.cooperationCountry || '泰国'
    };
    
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !row[productIdCol]) continue;
      
      try {
        const productName = row[productNameCol];
        const tiktokProductId = String(row[productIdCol]);
        const shopName = row[shopNameCol];
        const priceStr = row[priceCol] || '';
        const productLink = row[productLinkCol] || '';
        
        // 调试：打印原始数据和解析结果
        console.log(`[导入商品] 第${rowIndex + 1}行: productName=${productName}, productLink=${productLink}, shopName=${shopName}`);
        console.log(`[导入商品] row数据:`, JSON.stringify(row));
        
        // 解析价格
        const { min: priceRangeMin, max: priceRangeMax, currency } = parsePriceRange(priceStr);
        
        // 获取店铺
        const shop = await getOrCreateShop(companyId, shopName);
        
        // 解析佣金率
        const promotionInfluencerRate = parsePercentage(row[creatorRateCol]);      // 创作者佣金率
        const promotionOriginalRate = parsePercentage(row[allianceRateCol]);       // 联盟团长佣金率
        const promotionCompanyRate = 0;                                            // 公司留成（从其他计算）
        const adInfluencerRate = parsePercentage(row[adStoreRateCol]);             // 达人店铺广告佣金率
        const adOriginalRate = parsePercentage(row[adAllianceRateCol]);           // 联盟服务商店铺广告佣金率
        const adCompanyRate = 0;
        
        // 查找现有商品
        let product = await Product.findOne({
          companyId,
          tiktokProductId
        });
        
        if (product) {
          // 检查商品名称是否一致
          if (product.name !== productName) {
            // 名称不一致，需要用户确认（这里先用Excel名称覆盖）
            product.name = productName;
          }
          
          // 更新店铺
          product.shopId = shop._id;
          
          // 更新或添加活动配置
          const existingConfigIndex = product.activityConfigs.findIndex(
            ac => ac.activityId.toString() === activityId
          );
          
          const activityConfig = {
            activityId: activity._id,
            activityLink: productLink,
            requirementGmv: defaultRequirements.requirementGmv,
            requirementMonthlySales: defaultRequirements.requirementMonthlySales,
            requirementFollowers: defaultRequirements.requirementFollowers,
            requirementAvgViews: defaultRequirements.requirementAvgViews,
            sampleMethod: defaultRequirements.sampleMethod,
            cooperationCountry: defaultRequirements.cooperationCountry,
            promotionInfluencerRate,
            promotionOriginalRate,
            promotionCompanyRate,
            adInfluencerRate,
            adOriginalRate,
            adCompanyRate
          };
          
          if (existingConfigIndex >= 0) {
            // 更新现有活动配置
            product.activityConfigs[existingConfigIndex] = activityConfig;
          } else {
            // 添加新活动配置
            product.activityConfigs.push(activityConfig);
          }
          
          // 如果没有图片，尝试使用第一张图片（如果有的话）
          // 注意：当前Excel没有图片列，这里预留
          // if (!product.productImages || product.productImages.length === 0) {
          //   // 可选：下载或使用图片URL
          // }
          
          // 更新其他字段
          product.currency = currency;
          product.priceRangeMin = priceRangeMin;
          product.priceRangeMax = priceRangeMax;
          await product.save();
          results.updated.push({ name: productName, tiktokProductId });
        } else {
          // 新建商品
          const sku = `SKU${Date.now()}${Math.floor(Math.random() * 10000)}`;
          
          product = await Product.create({
            companyId,
            shopId: shop._id,
            name: productName,
            sku,
            tiktokProductId,
            tiktokSku: tiktokProductId,
            price: priceRangeMin,
            currency,
            sellingPrice: priceRangeMin,
            priceRangeMin,
            priceRangeMax,
            productImages: [],  // Excel暂无图片
            activityConfigs: [{
              activityId: activity._id,
              activityLink: productLink,
              requirementGmv: defaultRequirements.requirementGmv,
              requirementMonthlySales: defaultRequirements.requirementMonthlySales,
              requirementFollowers: defaultRequirements.requirementFollowers,
              requirementAvgViews: defaultRequirements.requirementAvgViews,
              sampleMethod: defaultRequirements.sampleMethod,
              cooperationCountry: defaultRequirements.cooperationCountry,
              promotionInfluencerRate,
              promotionOriginalRate,
              promotionCompanyRate,
              adInfluencerRate,
              adOriginalRate,
              adCompanyRate
            }],
            status: 'active'
          });
          
          results.created.push({ name: productName, tiktokProductId });
        }
      } catch (rowError) {
        console.error(`处理第${rowIndex + 1}行失败:`, rowError);
        results.failed.push({ row: rowIndex + 1, error: rowError.message });
      }
    }
    
    res.json({
      success: true,
      message: `导入完成：新增${results.created.length}个，更新${results.updated.length}个，失败${results.failed.length}个`,
      data: results
    });
    
  } catch (error) {
    console.error('导入TikTok商品失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '导入失败'
    });
  }
});

module.exports = router;

