const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');

const Shop = require('../models/Shop');
const ShopContact = require('../models/ShopContact');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');

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

module.exports = router;
