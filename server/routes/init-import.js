const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');

const BaseData = require('../models/BaseData');
const Shop = require('../models/Shop');
const ShopContact = require('../models/ShopContact');
const Product = require('../models/Product');
const Influencer = require('../models/Influencer');
const InfluencerMaintenance = require('../models/InfluencerMaintenance');
const TempIdMapping = require('../models/TempIdMapping');
const User = require('../models/User');

const router = express.Router();

// 常量
const DEFAULT_COMPANY_ID = '69a7aad8da66cd5145a5f06f';

// 配置multer
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// 验证超管角色中间件
async function verifyAdmin(req, res, next) {
  try {
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    // 检查是否是超管
    if (user.role === 'admin') {
      req.userCompanyId = user.companyId || DEFAULT_COMPANY_ID;
      return next();
    }
    
    // 如果有roleId，检查角色权限
    if (user.roleId) {
      const role = await Role.findById(user.roleId);
      if (role && role.name === 'admin') {
        req.userCompanyId = user.companyId || DEFAULT_COMPANY_ID;
        return next();
      }
    }
    
    return res.status(403).json({ success: false, message: '本页面仅支持超管操作' });
  } catch (error) {
    console.error('验证超管失败:', error);
    return res.status(500).json({ success: false, message: '验证失败' });
  }
}

// 公共公司ID
function getCompanyId(req) {
  return req.userCompanyId || DEFAULT_COMPANY_ID;
}

// ========== 1. 导入类目 ==========
router.post('/category', authenticate, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    // 验证文件格式
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 检查必要字段
    if (data.length === 0 || !data[0].hasOwnProperty('字典标签')) {
      return res.status(400).json({ success: false, message: 'Excel格式不正确，缺少"字典标签"列' });
    }

    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    const insertedData = [];

    for (const row of data) {
      const label = String(row['字典标签'] || '').trim();
      if (!label) continue;

      // 检查是否同时包含中英文
      const hasChinese = /[\u4e00-\u9fa5]/.test(label);
      const hasEnglish = /[a-zA-Z]/.test(label);

      if (hasChinese && hasEnglish) {
        // 同时包含中英文，分成两条记录
        // 提取中文部分作为name，英文部分作为englishName
        const chinesePart = label.match(/[\u4e00-\u9fa5]+/g)?.join('') || '';
        const englishPart = label.match(/[a-zA-Z]+/g)?.join(' ') || '';

        if (chinesePart) {
          insertedData.push({
            companyId: companyId,
            type: 'category',
            name: chinesePart,
            englishName: englishPart,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          insertedData.push({
            companyId: companyId,
            type: 'category',
            name: englishPart,
            englishName: '',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } else if (hasChinese) {
        // 纯中文
        insertedData.push({
          companyId: companyId,
          type: 'category',
          name: label,
          englishName: '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (hasEnglish) {
        // 纯英文
        insertedData.push({
          companyId: companyId,
          type: 'category',
          name: label,
          englishName: '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    // 增量导入：存在则更新，不存在则新增
    let addedCount = 0;
    let updatedCount = 0;

    for (const item of insertedData) {
      // 使用 companyId + type + name 作为唯一标识
      const existing = await BaseData.findOne({
        companyId: item.companyId,
        type: item.type,
        name: item.name
      });

      if (existing) {
        // 更新已有记录
        await BaseData.updateOne(
          { _id: existing._id },
          { $set: { englishName: item.englishName, status: item.status, updatedAt: new Date() } }
        );
        updatedCount++;
      } else {
        // 新增记录
        await BaseData.create(item);
        addedCount++;
      }
    }

    // 清理上传文件
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `成功导入类目数据：新增 ${addedCount} 条，更新 ${updatedCount} 条`,
      count: addedCount + updatedCount,
      added: addedCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error('导入类目失败:', error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

// ========== 2. 导入店铺 ==========
// 2.1 清除店铺
router.delete('/shops/clear', authenticate, verifyAdmin, async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    
    await Shop.deleteMany({ companyId });
    await ShopContact.deleteMany({ companyId });
    await TempIdMapping.deleteMany({ tableName: 'shop', companyId });

    res.json({ success: true, message: '店铺数据已清空' });
  } catch (error) {
    console.error('清空店铺失败:', error);
    res.status(500).json({ success: false, message: '清空失败' });
  }
});

// 2.2 导入店铺
router.post('/shops', authenticate, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 验证字段 - shop_name和shop_no是必填
    const requiredFields = ['shop_name', 'shop_no'];
    const firstRow = data[0] || {};
    const missing = requiredFields.filter(f => !firstRow.hasOwnProperty(f));
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: `Excel缺少必要列: ${missing.join(', ')}` });
    }

    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    const shops = [];
    const contactData = []; // 存储联系人原始数据
    const mappings = [];

    for (const row of data) {
      const originalId = String(row.id || '');
      if (!originalId) continue;

      // Excel时间戳转换
      const createdAt = row.create_time ? new Date((row.create_time - 25569) * 86400 * 1000) : new Date();
      const updatedAt = row.update_time ? new Date((row.update_time - 25569) * 86400 * 1000) : new Date();

      const shop = {
        companyId: companyId,
        shopName: String(row.shop_name || ''),
        shopNumber: String(row.shop_no || ''),
        contactAddress: String(row.address || ''),
        status: 'active',
        createdAt: createdAt,
        updatedAt: updatedAt
      };

      if (shop.shopName && shop.shopNumber) {
        shops.push(shop);

        // 保存联系人原始数据，用于后续插入
        contactData.push({
          shopNumber: shop.shopNumber,
          name: row.contacts || '不知道',
          phone: String(row.phone || ''),
          email: String(row.email || ''),
          originalId: originalId,
          createdAt: createdAt,
          updatedAt: updatedAt
        });
      }
    }

    // 增量导入店铺：存在则更新，不存在则新增
    let addedCount = 0;
    let updatedCount = 0;

    for (const shop of shops) {
      const existing = await Shop.findOne({
        companyId: shop.companyId,
        shopNumber: shop.shopNumber
      });

      if (existing) {
        // 更新已有记录
        await Shop.updateOne(
          { _id: existing._id },
          { $set: { shopName: shop.shopName, contactAddress: shop.contactAddress, status: shop.status, updatedAt: new Date() } }
        );
        shop._id = existing._id;
        updatedCount++;
      } else {
        // 新增记录
        const newShop = await Shop.create(shop);
        shop._id = newShop._id;
        addedCount++;
      }
    }

    // 填充shopId并处理联系人（upsert模式）
    for (const item of contactData) {
      const savedShop = await Shop.findOne({
        companyId: companyId,
        shopNumber: item.shopNumber
      });

      if (savedShop) {
        // 检查联系人是否已存在
        const existingContact = await ShopContact.findOne({
          companyId: companyId,
          shopId: savedShop._id,
          phone: item.phone
        });

        if (existingContact) {
          // 更新联系人
          await ShopContact.updateOne(
            { _id: existingContact._id },
            { $set: { name: item.name, email: item.email, updatedAt: new Date() } }
          );
        } else {
          // 新增联系人
          await ShopContact.create({
            companyId: companyId,
            shopId: savedShop._id,
            name: item.name,
            phone: item.phone,
            email: item.email,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          });
        }

        // 记录ID对照关系
        const existingMapping = await TempIdMapping.findOne({
          tableName: 'shop',
          originalId: item.originalId,
          companyId: companyId
        });

        if (existingMapping) {
          await TempIdMapping.updateOne(
            { _id: existingMapping._id },
            { $set: { newId: savedShop._id } }
          );
        } else {
          mappings.push({
            tableName: 'shop',
            originalId: item.originalId,
            newId: savedShop._id,
            companyId: companyId
          });
        }
      }
    }

    // 批量插入联系人映射（如果有新的）
    if (mappings.length > 0) {
      await TempIdMapping.insertMany(mappings, { ordered: false });
    }

    // 记录ID映射
    if (mappings.length > 0) {
      await TempIdMapping.insertMany(mappings, { ordered: false });
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `成功导入店铺数据：新增 ${addedCount} 条，更新 ${updatedCount} 条`,
      count: addedCount + updatedCount,
      added: addedCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error('导入店铺失败:', error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

// ========== 3. 导入商品 ==========
// 3.1 清除商品
router.delete('/products/clear', authenticate, verifyAdmin, async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    
    await Product.deleteMany({ companyId });
    await TempIdMapping.deleteMany({ tableName: 'product', companyId });

    res.json({ success: true, message: '商品数据已清空' });
  } catch (error) {
    console.error('清空商品失败:', error);
    res.status(500).json({ success: false, message: '清空失败' });
  }
});

// 3.2 导入商品
router.post('/products', authenticate, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 验证字段
    const requiredFields = ['goods_no', 'shop_id'];
    const firstRow = data[0] || {};
    const missing = requiredFields.filter(f => !firstRow.hasOwnProperty(f));
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: `Excel缺少必要列: ${missing.join(', ')}` });
    }

    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    console.log('========== 商品导入开始 ==========');

    // 清除旧商品映射记录
    await TempIdMapping.deleteMany({ tableName: 'product', companyId });

    // 从临时表获取店铺映射（excel中的id -> shop._id）
    const shopMappings = await TempIdMapping.find({ tableName: 'shop', companyId });
    console.log('[商品导入] 店铺映射数量:', shopMappings.length);
    const shopIdMap = {};
    shopMappings.forEach(m => {
      shopIdMap[m.originalId] = m.newId;
    });
    console.log('[商品导入] 店铺映射:', JSON.stringify(shopIdMap));

    // 获取基础数据中的产品类目映射
    const categoryMappings = await BaseData.find({ type: 'category', companyId });
    console.log('[商品导入] 基础数据类目数量:', categoryMappings.length);
    const categoryMap = {};
    if (categoryMappings.length === 0) {
      console.log('[商品导入] 警告: 基础数据中没有类目!');
    }
    categoryMappings.forEach(c => {
      const name = c.name || '';
      const code = c.code || '';
      const englishName = c.englishName || '';
      if (code) categoryMap[code] = name;
      if (name) categoryMap[name.toLowerCase()] = name;
      if (name) categoryMap[name] = name;
      if (englishName) categoryMap[englishName.toLowerCase()] = name;
      if (englishName) categoryMap[englishName] = name;
    });
    console.log('[商品导入] 类目映射:', JSON.stringify(categoryMap));

    const products = [];
    const mappings = [];

    for (const row of data) {
      const originalId = String(row.id || '');
      const originalShopId = String(row.shop_id || '');
      
      if (!originalId) continue;

      // 查找对应店铺ID（用店铺ID或店铺号匹配）
      const shopId = shopIdMap[originalShopId] || null;
      console.log('[商品导入] 商品:', row.goods_name, 'shop_id:', originalShopId, '匹配结果:', shopId ? shopId.toString() : '未匹配');
      if (!shopId && originalShopId) {
        console.log('[商品导入] 警告: 店铺号', originalShopId, '未匹配到店铺,商品:', row.goods_name);
      }

      // 匹配Product模型字段（name、sku、price是必填）
      // 商品类目去基础数据中匹配（用activity_name匹配基础数据中的类目名称）
      const rawCategory = String(row.activity_name || '').trim();
      console.log('[商品导入] 原始类目(activity_name):', rawCategory, '-> 匹配结果:', categoryMap[rawCategory] || categoryMap[rawCategory.toLowerCase()] || '未匹配，保留原值');
      // 优先用原始值匹配(code或name忽略大小写)，找不到则保留原值
      const matchedCategory = categoryMap[rawCategory] || categoryMap[rawCategory.toLowerCase()] || rawCategory;

      // 处理TAP专属链：如果是被JSON数组格式包装的，提取链接
      let tapLinkValue = String(row.tap_link || '');
      try {
        if (tapLinkValue.startsWith('[')) {
          const arr = JSON.parse(tapLinkValue);
          tapLinkValue = arr[0]?.value || '';
        }
      } catch (e) {
        // 解析失败，保持原值
      }

      const product = {
        companyId: companyId,
        shopId: shopId,
        name: String(row.goods_name || row.productName || ''),
        sku: String(row.goods_no || originalId),
        tiktokProductId: String(row.goods_no || ''),
        tiktokSku: String(row.goods_no || ''),
        price: parseFloat(row.price) || 0,
        productCategory: matchedCategory,
        // 广场佣金率：Excel中存储的是百分数(如8表示8%)，导入时转为小数(如0.08)
        squareCommissionRate: (parseFloat(row.commission_market) || 0) * 0.01,
        // TAP专属链：如果是被JSON数组格式包装的，提取链接
        tapExclusiveLink: tapLinkValue,
        influencerRequirement: String(row.tk_expert_require || ''),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (product.tiktokProductId || product.name) {
        products.push({ product, originalId });
      }
    }

    // 批量插入商品
    if (products.length > 0) {
      await Product.insertMany(products.map(p => p.product));
    }

    // 记录ID映射
    for (const item of products) {
      const savedProduct = await Product.findOne({
        companyId: companyId,
        tiktokProductId: item.product.tiktokProductId
      });
      
      if (savedProduct) {
        mappings.push({
          tableName: 'product',
          originalId: item.originalId,
          newId: savedProduct._id,
          companyId: companyId
        });
      }
    }

    if (mappings.length > 0) {
      await TempIdMapping.insertMany(mappings, { ordered: false });
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `成功导入 ${products.length} 条商品数据`,
      count: products.length
    });
  } catch (error) {
    console.error('导入商品失败:', error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

// ========== 4. 导入达人 ==========
// 4.1 清除达人
router.delete('/influencers/clear', authenticate, verifyAdmin, async (req, res) => {
  try {
    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    
    await Influencer.deleteMany({ companyId });
    await InfluencerMaintenance.deleteMany({ companyId });
    await TempIdMapping.deleteMany({ tableName: 'influencer', companyId });

    res.json({ success: true, message: '达人数据已清空' });
  } catch (error) {
    console.error('清空达人失败:', error);
    res.status(500).json({ success: false, message: '清空失败' });
  }
});

// 4.2 导入达人
router.post('/influencers', authenticate, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    // 导入前先清空 TempIdMapping 避免重复 key 错误
    const companyId = new mongoose.Types.ObjectId(getCompanyId(req));
    await TempIdMapping.deleteMany({ tableName: 'influencer', companyId });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // 验证字段
    const requiredFields = ['expert_account'];
    const firstRow = data[0] || {};
    const missing = requiredFields.filter(f => !firstRow.hasOwnProperty(f));
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: `Excel缺少必要列: ${missing.join(', ')}` });
    }

    console.log('[导入达人] 开始导入, Excel行数:', data.length);
    const influencers = [];
    const maintenances = [];
    const mappings = [];

    for (const row of data) {
      const originalId = String(row.id || '');
      if (!originalId) continue;

      // Excel时间戳转换
      const createdAt = row.create_time ? new Date((row.create_time - 25569) * 86400 * 1000) : new Date();
      const updatedAt = row.update_time ? new Date((row.update_time - 25569) * 86400 * 1000) : new Date();
      // update_time 作为维护记录的创建时间
      const maintenanceTime = row.update_time ? new Date((row.update_time - 25569) * 86400 * 1000) : createdAt;

      console.log('[导入达人] 处理行:', { id: originalId, expert_account: row.expert_account, expert_name: row.expert_name });

      // 1. assignedTo: 先取 remark，如果没有取 create_by，都为空则为空
      // 用 username 匹配（用户的 name 字段可能是 undefined）
      let assignedTo = null;
      const remarkVal = row.remark;
      const createByVal = row.create_by;
      if (remarkVal !== undefined && remarkVal !== null && remarkVal !== '') {
        const user = await User.findOne({ username: String(remarkVal) }).lean();
        if (user) {
          assignedTo = user._id;
        }
      } else if (createByVal !== undefined && createByVal !== null && createByVal !== '') {
        const user = await User.findOne({ username: String(createByVal) }).lean();
        if (user) {
          assignedTo = user._id;
        }
      }

      // 2. poolType: 如果有 assignedTo 则为 private，否则为 public
      const poolType = assignedTo ? 'private' : 'public';

      // 3. nickname: 取 expert_name，为空则为 "complete it."
      const nickname = row.expert_name !== undefined && row.expert_name !== null && row.expert_name !== '' 
        ? String(row.expert_name) 
        : 'complete it.';

      // 4. latestGmv: 取 fans_num
      const latestGmv = parseFloat(row.fans_num) || 0;

      // 5. followers: 取 fans_num
      const followers = parseInt(row.fans_num) || 0;

      // 6. gmv: 取 month_gmv
      const gmv = parseFloat(row.month_gmv) || 0;

      // 7. 维护记录的维护人：使用 update_by
      const maintainerName = row.update_by !== undefined && row.update_by !== null && row.update_by !== ''
        ? String(row.update_by)
        : '系统导入';

      // tiktokName如果是undefined就用tiktokId
      const tiktokName = row.expert_name !== undefined ? String(row.expert_name) : String(row.expert_account || '未知');

      // 查找维护人对应的 User 对象
      let latestMaintainerId = null;
      if (row.update_by !== undefined && row.update_by !== null && row.update_by !== '') {
        const user = await User.findOne({ username: String(row.update_by) }).lean();
        if (user) {
          latestMaintainerId = user._id;
        }
      }

      // 不要手动设置_id，让MongoDB自动生成
      const influencer = {
        companyId: companyId,
        tiktokId: String(row.expert_account || ''),
        tiktokName: tiktokName,
        nickname: nickname,
        status: 'enabled',
        poolType: poolType,
        assignedTo: assignedTo,
        latestGmv: latestGmv,
        latestFollowers: followers,
        latestMaintenanceTime: maintenanceTime,
        latestMaintainerId: latestMaintainerId,
        latestMaintainerName: maintainerName,
        latestRemark: String(row.remark || ''),
        createdAt: createdAt,
        updatedAt: updatedAt
      };

      if (influencer.tiktokId) {
        influencers.push({ 
          influencer, 
          originalId, 
          row, 
          createdAt, 
          updatedAt,
          maintenanceTime,
          followers,
          gmv,
          maintainerName
        });
      }
    }

    console.log('[导入达人] 有效达人数量:', influencers.length);

    // 批量插入达人
    let insertedCount = 0;
    if (influencers.length > 0) {
      try {
        const result = await Influencer.insertMany(influencers.map(i => i.influencer), { ordered: false });
        insertedCount = result.length;
        console.log('[导入达人] 插入成功数量:', insertedCount);
      } catch (e) {
        console.log('[导入达人] 达人插入失败:', e.message);
      }
    }

    // 插入维护记录
    for (const item of influencers) {
      const savedInfluencer = await Influencer.findOne({ tiktokId: item.influencer.tiktokId, companyId });
      
      if (savedInfluencer) {
        // 查找维护人对应的 User，如果找不到则使用当前导入用户
        let maintainerId = req.userId;
        if (item.row.update_by !== undefined && item.row.update_by !== null && item.row.update_by !== '') {
          const user = await User.findOne({ username: String(item.row.update_by) }).lean();
          if (user) {
            maintainerId = user._id;
          }
        }

        const maintenance = {
          companyId: companyId,
          influencerId: savedInfluencer._id,
          followers: item.followers,
          gmv: item.gmv,
          poolType: item.influencer.poolType,
          maintainerId: maintainerId,
          maintainerName: item.maintainerName,
          createdAt: item.maintenanceTime,
          updatedAt: item.updatedAt
        };
        maintenances.push(maintenance);

        // 记录ID映射
        mappings.push({
          tableName: 'influencer',
          originalId: item.originalId,
          newId: savedInfluencer._id,
          companyId: companyId
        });
      } else {
        console.log('[导入达人] 未找到达人:', item.influencer.tiktokId);
      }
    }

    console.log('[导入达人] 维护记录数量:', maintenances.length);

    if (maintenances.length > 0) {
      try {
        await InfluencerMaintenance.insertMany(maintenances);
      } catch (e) {
        console.log('[导入达人] 维护记录插入失败:', e.message);
        res.json({
          success: false,
          message: `达人导入成功 ${insertedCount} 条，但维护记录插入失败: ${e.message}`
        });
        return;
      }
    }

    if (mappings.length > 0) {
      await TempIdMapping.insertMany(mappings, { ordered: false });
    }

    fs.unlinkSync(req.file.path);

    // 使用实际插入的数量
    if (insertedCount === 0 && influencers.length > 0) {
      res.json({
        success: false,
        message: `导入失败：Excel中有 ${influencers.length} 条记录，但因数据格式问题全部插入失败，请检查Excel数据格式`
      });
      return;
    }

    res.json({
      success: true,
      message: `成功导入 ${insertedCount} 条达人数据`,
      count: insertedCount
    });
  } catch (error) {
    console.error('导入达人失败:', error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

module.exports = router;
