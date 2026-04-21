/**
 * 迁移脚本：根据 productCategory 字段填充 categoryId
 * 
 * 逻辑：
 * 1. 获取所有有 productCategory 字段的商品
 * 2. 在 BaseData 中查找匹配的类目（通过 name 或 englishName）
 * 3. 更新商品的 categoryId 字段
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const BaseData = require('./models/BaseData');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tap_system';

async function migrate() {
  console.log('开始迁移商品类目...\n');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ 已连接数据库');
    
    // 获取第一个公司的 ID（假设单租户）
    const Setting = mongoose.model('Setting', new mongoose.Schema({}, { strict: false }));
    const setting = await Setting.findOne({}).lean();
    const companyId = setting?.companyId || null;
    
    // 1. 获取所有 BaseData 类目
    const categories = await BaseData.find({ type: 'category', status: 'active' }).lean();
    console.log(`✓ 找到 ${categories.length} 个类目`);
    
    // 建立名称到 _id 的映射（支持中文名、英文名）
    const categoryMap = {};
    categories.forEach(cat => {
      if (cat.name) categoryMap[cat.name] = cat._id;
      if (cat.englishName) categoryMap[cat.englishName] = cat._id;
    });
    
    // 2. 查找所有有 productCategory 但没有 categoryId 的商品
    const products = await Product.find({
      productCategory: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { categoryId: { $exists: false } },
        { categoryId: null }
      ]
    }).select('_id name productCategory categoryId').lean();
    
    console.log(`✓ 找到 ${products.length} 个需要更新的商品\n`);
    
    if (products.length === 0) {
      console.log('没有需要更新的商品');
      return;
    }
    
    // 3. 匹配并更新
    let matched = 0;
    let unmatched = 0;
    
    for (const product of products) {
      const catName = product.productCategory;
      const catId = categoryMap[catName];
      
      if (catId) {
        await Product.updateOne({ _id: product._id }, { categoryId: catId });
        matched++;
        if (matched <= 5) {
          console.log(`  ✓ [${matched}] ${product.name?.substring(0, 30)} -> ${catName}`);
        }
      } else {
        unmatched++;
        if (unmatched <= 10) {
          console.log(`  ✗ 未匹配: "${catName}"`);
        }
      }
    }
    
    console.log(`\n迁移完成！`);
    console.log(`  - 成功匹配: ${matched} 个`);
    console.log(`  - 未匹配: ${unmatched} 个`);
    
    if (unmatched > 0) {
      console.log(`\n提示：未匹配的类目名称可能需要在 BaseData 中补充`);
    }
    
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ 已断开数据库连接');
  }
}

migrate();
