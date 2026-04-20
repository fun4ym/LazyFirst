const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');

const Shop = require('../models/Shop');
const ShopContact = require('../models/ShopContact');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');
const SampleManagement = require('../models/SampleManagement');
const User = require('../models/User');
const Video = require('../models/Video');

const router = express.Router();

// 配置multer
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// 常量
const COMPANY_ID = '69a7aad8da66cd5145a5f06f';

/**
 * @route   POST /api/initialization/import
 * @desc    初始化数据导入
 * @access  Private (admin only)
 */
router.post('/import', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    const { type, companyId } = req.body;
    const targetCompanyId = companyId || COMPANY_ID;

    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    if (!type) {
      return res.status(400).json({ success: false, message: '缺少导入类型' });
    }

    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel文件为空' });
    }

    let importResult = { success: true, message: '', count: 0 };

    switch (type) {
      case 'shop':
        importResult = await importShops(data, targetCompanyId);
        break;
      case 'product':
        importResult = await importProducts(data, targetCompanyId);
        break;
      case 'influencer':
        importResult = await importInfluencers(data, targetCompanyId);
        break;
      case 'sample':
        importResult = await importSamples(data, targetCompanyId, req.user._id);
        break;
      default:
        return res.status(400).json({ success: false, message: '不支持的导入类型' });
    }

    // 清理上传的临时文件
    fs.unlinkSync(req.file.path);

    res.json(importResult);
  } catch (error) {
    console.error('导入错误:', error);
    // 清理上传的临时文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ success: false, message: error.message || '导入失败' });
  }
});

// 导入店铺数据
async function importShops(data, companyId) {
  console.log('=== 导入店铺数据 ===');
  console.log('Excel行数:', data.length);
  console.log('第一条数据字段:', Object.keys(data[0] || {}));
  console.log('第一条数据:', JSON.stringify(data[0]));

  const shops = [];
  const contacts = [];
  const mongoose = require('mongoose');

  for (const row of data) {
    const originalId = String(row.id);
    const shop = {
      _id: originalId,
      companyId: companyId,
      shopName: row.shop_name || row.shopName || '',
      shopNumber: row.shop_no || row.shopNumber || '',
      contactAddress: row.address || row.contactAddress || '',
      status: 'active',
      createdAt: row.create_time ? new Date((row.create_time - 25569) * 86400 * 1000) : new Date(),
      updatedAt: row.update_time ? new Date((row.update_time - 25569) * 86400 * 1000) : new Date()
    };

    if (shop.shopName && shop.shopNumber) {
      shops.push(shop);

      // 店铺联系人数据
      const contact = {
        companyId: companyId,
        shopId: originalId,
        name: row.contacts || row.name || '不知道',
        phone: row.phone || '',
        email: row.email || '',
        createdAt: row.create_time ? new Date((row.create_time - 25569) * 86400 * 1000) : new Date(),
        updatedAt: row.update_time ? new Date((row.update_time - 25569) * 86400 * 1000) : new Date()
      };
      contacts.push(contact);
    }
  }

  console.log('有效店铺数:', shops.length);

  // 批量插入店铺数据
  if (shops.length > 0) {
    await Shop.insertMany(shops, { ordered: false }).catch(err => {
      console.log('部分店铺插入失败:', err.message);
    });
  }

  // 批量插入联系人数据
  if (contacts.length > 0) {
    await ShopContact.insertMany(contacts, { ordered: false }).catch(err => {
      console.log('部分联系人插入失败:', err.message);
    });
  }

  return {
    success: true,
    message: `成功导入 ${shops.length} 条店铺数据和 ${contacts.length} 条联系人数据`,
    count: shops.length
  };
}

// 导入商品数据
async function importProducts(data, companyId) {
  console.log('=== 导入商品数据 ===');
  console.log('Excel行数:', data.length);
  console.log('第一条数据字段:', Object.keys(data[0] || {}));

  const products = [];

  for (const row of data) {
    const originalId = String(row.id);

    // 处理TAP专属链：如果是被JSON数组格式包装的，提取链接
    let tapLinkValue = row.tap_link || '';
    try {
      if (tapLinkValue.startsWith('[')) {
        const arr = JSON.parse(tapLinkValue);
        tapLinkValue = arr[0]?.value || '';
      }
    } catch (e) {
      // 解析失败，保持原值
    }

    const product = {
      _id: originalId,
      companyId: companyId,
      productId: String(row.goods_no || ''),
      productName: row.goods_name || '',
      shopId: String(row.shop_id || ''),
      productCategory: row.goods_type || '',
      // 广场佣金率：Excel中存储的是百分数(如8表示8%)，导入时转为小数(如0.08)
      squareCommissionRate: (parseFloat(row.commission_market) || 0) * 0.01,
      // TAP专属链：如果是被JSON数组格式包装的，提取链接
      tapExclusiveLink: tapLinkValue,
      influencerRequirement: row.tk_expert_require || '',
      goodsIntroduce: row.goods_introduce || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (product.productId || product.productName) {
      products.push(product);
    }
  }

  console.log('有效商品数:', products.length);

  // 批量插入商品数据
  if (products.length > 0) {
    await Product.insertMany(products, { ordered: false }).catch(err => {
      console.log('部分商品插入失败:', err.message);
    });
  }

  return {
    success: true,
    message: `成功导入 ${products.length} 条商品数据`,
    count: products.length
  };
}

// 导入达人数据
async function importInfluencers(data, companyId) {
  console.log('=== 导入达人数据 ===');
  console.log('Excel行数:', data.length);
  console.log('第一条数据字段:', Object.keys(data[0] || {}));

  const influencers = [];
  const maintenances = [];

  for (const row of data) {
    const originalId = String(row.id);
    // 达人数据
    const influencer = {
      _id: originalId,
      companyId: companyId,
      tiktokId: String(row.expert_account || ''),
      tiktokName: row.expert_name || '',
      status: 'enabled',
      poolType: 'private',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (influencer.tiktokId || influencer.tiktokName) {
      influencers.push(influencer);

      // 达人维护记录
      const maintenance = {
        _id: originalId + '_maintenance',
        companyId: companyId,
        influencerId: originalId,
        followers: parseInt(row.fans_num) || 0,
        gmv: parseFloat(row.month_gmv) || 0,
        poolType: 'private',
        assignedTo: row.update_by || null,
        latestMaintainerId: row.remark || null,
        latestMaintainerName: row.remark || '',
        remark: row.remark || '',
        maintainerId: row.update_by || null,
        maintainerName: row.remark || '系统导入',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      maintenances.push(maintenance);
    }
  }

  console.log('有效达人:', influencers.length);

  // 批量插入达人数据
  if (influencers.length > 0) {
    await Influencer.insertMany(influencers, { ordered: false }).catch(err => {
      console.log('部分达人插入失败:', err.message);
    });
  }

  // 批量插入维护记录
  if (maintenances.length > 0) {
    await InfluencerMaintenance.insertMany(maintenances, { ordered: false }).catch(err => {
      console.log('部分维护记录插入失败:', err.message);
    });
  }

  return {
    success: true,
    message: `成功导入 ${influencers.length} 条达人数据和 ${maintenances.length} 条维护记录`,
    count: influencers.length
  };
}

// 解析Excel日期
function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    value.setHours(0, 0, 0, 0);
    return value;
  }
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }
  return null;
}

// 导入样品申请数据
async function importSamples(data, companyId, creatorId) {
  console.log('=== 导入样品申请数据 ===');
  console.log('Excel行数:', data.length);
  console.log('第一条数据字段:', Object.keys(data[0] || {}));
  console.log('第一条数据:', JSON.stringify(data[0]));

  let addedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  let videoCreatedCount = 0;
  let videoUpdatedCount = 0;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      
      // 解析日期
      const rawDate = row['日期'];
      const date = parseExcelDate(rawDate);
      
      // 解析发货日期
      const rawShippingDate = row['发货日期'];
      const shippingDate = parseExcelDate(rawShippingDate);
      
      // 解析收样日期
      const rawReceivedDate = row['收样日期'];
      const receivedDate = parseExcelDate(rawReceivedDate);
      
      // 解析投流时间
      const rawAdPromotionTime = row['投流时间'];
      const adPromotionTime = parseExcelDate(rawAdPromotionTime);

      // 检查必填字段
      if (!date) {
        failedCount++;
        errors.push({ row: i + 2, error: '日期字段为空或格式错误' });
        continue;
      }
      if (!row['商品名称']) {
        failedCount++;
        errors.push({ row: i + 2, error: '商品名称不能为空' });
        continue;
      }
      if (!row['商品ID']) {
        failedCount++;
        errors.push({ row: i + 2, error: '商品ID不能为空' });
        continue;
      }
      if (!row['达人账号']) {
        failedCount++;
        errors.push({ row: i + 2, error: '达人账号不能为空' });
        continue;
      }

      // 1. 查找商品
      let productObj = null;
      const productIdInput = String(row['商品ID'] || '').trim();
      
      if (productIdInput) {
        try {
          const product = await Product.findById(productIdInput);
          if (product) {
            productObj = product;
          }
        } catch (err) {}
        
        if (!productObj) {
          productObj = await Product.findOne({ tiktokProductId: productIdInput });
        }
        
        if (!productObj) {
          productObj = await Product.findOne({ sku: productIdInput });
        }
        
        if (!productObj) {
          productObj = await Product.findOne({ tiktokSku: productIdInput });
        }
      }

      if (!productObj) {
        failedCount++;
        errors.push({ row: i + 2, error: `商品不存在: ${productIdInput}` });
        continue;
      }

      // 2. 查找或创建达人（根据达人账号获取Influencer ObjectId）
      const influencerAccount = String(row['达人账号'] || '').trim();
      let influencerObj = null;
      if (influencerAccount) {
        influencerObj = await Influencer.findOne({ 
          companyId: companyId,
          tiktokId: influencerAccount 
        });
        // 达人不存在时自动新增
        if (!influencerObj) {
          // 先查找业务员（需要在创建达人时绑定BD）
          const salesmanNameForInfluencer = row['归属业务员'] || '';
          let assignedTo = null;
          if (salesmanNameForInfluencer && typeof salesmanNameForInfluencer === 'string') {
            const bdUser = await User.findOne({ username: salesmanNameForInfluencer });
            if (bdUser) {
              assignedTo = bdUser._id;
            }
          }

          influencerObj = await Influencer.create({
            companyId: companyId,
            tiktokId: influencerAccount,
            tiktokName: row['达人名称'] || influencerAccount,
            latestFollowers: parseInt(row['粉丝数']) || 0,
            status: 'enabled',
            poolType: assignedTo ? 'private' : 'public',
            assignedTo: assignedTo
          });
          console.log(`新增达人: ${influencerAccount}, BD: ${salesmanNameForInfluencer || '无'}, _id: ${influencerObj._id}`);
        }
      }

      // 3. 查找业务员（根据用户名获取User ObjectId）
      const salesmanName = row['归属业务员'] || '';
      let salesmanId = null;
      
      if (salesmanName && typeof salesmanName === 'string') {
        const user = await User.findOne({ username: salesmanName });
        if (user) {
          salesmanId = user._id;
        }
      }

      // 4. productId 存 TikTok 商品 ID（纯数字），用于前端展示
      const productIdForSample = productObj.tiktokProductId || productIdInput;

      // 5. 构建唯一键：日期 + influencerId + productId
      const uniqueKey = {
        date: date,
        influencerId: influencerObj._id,
        productId: productIdForSample
      };

      // 6. 检查记录是否已存在
      const existing = await SampleManagement.findOne({
        companyId: companyId,
        ...uniqueKey
      });

      // 7. 准备样品数据（新增时用全部字段，更新时排除不应覆盖的字段）
      const sampleDataForCreate = {
        companyId: companyId,
        creatorId: creatorId,
        date: date,
        productName: row['商品名称'] || '',
        productId: productIdForSample,
        influencerId: influencerObj._id,
        influencerAccount: influencerAccount, // 保留兼容字段
        followerCount: parseInt(row['粉丝数']) || 0,
        salesmanId: salesmanId,
        salesman: salesmanName, // 保留兼容字段
        shippingInfo: row['收货信息'] || '',
        sampleImage: row['样品图片'] || '',
        isSampleSent: row['是否寄样'] === '是' || row['是否寄样'] === true,
        trackingNumber: row['发货单号'] || '',
        shippingDate: shippingDate,
        logisticsCompany: row['物流公司'] || '',
        receivedDate: receivedDate,
        fulfillmentTime: row['履约时间'] || '',
        isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
        adPromotionTime: adPromotionTime,
        isOrderGenerated: row['是否出单'] === '是' || row['是否出单'] === true
      };

      // 更新时不覆盖的字段
      const protectedFields = [
        'isSampleSent', 'sampleStatus', 'refusalReason',
        'sampleStatusUpdatedBy', 'sampleStatusUpdatedAt',
        'trackingNumber', 'shippingDate', 'logisticsCompany', 'receivedDate',
        'fulfillmentTime', 'isAdPromotion', 'adPromotionTime', 'isOrderGenerated',
        'fulfillmentUpdatedBy', 'fulfillmentUpdatedAt',
        'adPromotionUpdatedBy', 'adPromotionUpdatedAt'
      ];
      const sampleDataForUpdate = { ...sampleDataForCreate };
      for (const field of protectedFields) {
        delete sampleDataForUpdate[field];
      }

      let sampleRecord;
      if (existing) {
        await SampleManagement.updateOne({ _id: existing._id }, sampleDataForUpdate);
        sampleRecord = existing;
        updatedCount++;
      } else {
        sampleRecord = await SampleManagement.create(sampleDataForCreate);
        addedCount++;
      }

      // 8. 处理视频数据（如果存在视频链接）
      const videoLink = row['达人视频链接'] || '';
      const videoStreamCode = row['视频推流码'] || '';
      
      if (videoLink) {
        // 检查是否已存在视频记录
        const existingVideo = await Video.findOne({
          companyId: companyId,
          sampleId: sampleRecord._id,
          videoLink: videoLink
        });

        const videoData = {
          companyId: companyId,
          sampleId: sampleRecord._id,
          productId: productObj._id,
          tiktokProductId: productIdForSample,
          influencerId: influencerObj._id,
          videoLink: videoLink,
          videoStreamCode: videoStreamCode || '',
          isAdPromotion: row['是否投流'] === '是' || row['是否投流'] === true,
          adPromotionTime: adPromotionTime,
          createdBy: salesmanId || creatorId
        };

        if (existingVideo) {
          await Video.updateOne({ _id: existingVideo._id }, videoData);
          videoUpdatedCount++;
        } else {
          await Video.create(videoData);
          videoCreatedCount++;
        }
      }

    } catch (err) {
      console.error(`处理第 ${i + 2} 行时出错:`, err);
      failedCount++;
      errors.push({ row: i + 2, error: err.message });
    }
  }

  console.log(`导入完成: 样品新增 ${addedCount}, 更新 ${updatedCount}, 失败 ${failedCount}`);
  console.log(`视频处理: 创建 ${videoCreatedCount}, 更新 ${videoUpdatedCount}`);

  return {
    success: true,
    message: `导入完成：样品新增 ${addedCount} 条，更新 ${updatedCount} 条，失败 ${failedCount} 条；视频创建 ${videoCreatedCount} 条，更新 ${videoUpdatedCount} 条`,
    count: addedCount + updatedCount,
    added: addedCount,
    updated: updatedCount,
    failed: failedCount,
    videoCreated: videoCreatedCount,
    videoUpdated: videoUpdatedCount,
    errors: errors
  };
}

module.exports = router;
