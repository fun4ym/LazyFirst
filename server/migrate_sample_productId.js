/**
 * 迁移脚本：将 samplemanagements.productId 从 MongoDB ObjectId 转换为 TikTok 商品 ID
 * 
 * 运行方式：node migrate_sample_productId.js
 * 
 * 说明：
 * - samplemanagements.productId 应该存 TikTok 商品 ID（String），用于展示
 * - 此脚本将查找 productId 为 ObjectId 格式（24位十六进制）的记录
 * - 通过 Product._id 关联查询 Product.tiktokProductId 并更新
 */

const mongoose = require('mongoose');
const path = require('path');

// 加载模型
const SampleManagement = require('./models/SampleManagement');
const Product = require('./models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';

async function migrate() {
  try {
    console.log('开始迁移 samplemanagements.productId...\n');
    console.log(`连接数据库: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功\n');

    // 查找所有样品申请记录
    const samples = await SampleManagement.find({}).lean();
    console.log(`共有 ${samples.length} 条样品申请记录\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    let noMatchCount = 0;
    const errors = [];

    for (const sample of samples) {
      const currentProductId = sample.productId;
      
      // 检查是否为 ObjectId 格式（24位十六进制）
      if (/^[0-9a-fA-F]{24}$/.test(currentProductId)) {
        // 尝试查找对应的 Product
        const product = await Product.findById(currentProductId);
        
        if (product && product.tiktokProductId) {
          // 更新为 TikTok 商品 ID
          await SampleManagement.updateOne(
            { _id: sample._id },
            { $set: { productId: product.tiktokProductId } }
          );
          console.log(`✓ 修复: ${sample._id}`);
          console.log(`  ${currentProductId} -> ${product.tiktokProductId}`);
          fixedCount++;
        } else {
          console.log(`✗ 无法修复: ${sample._id} (productId=${currentProductId})`);
          if (!product) {
            console.log(`  原因: 商品不存在`);
            noMatchCount++;
          } else if (!product.tiktokProductId) {
            console.log(`  原因: 商品没有 tiktokProductId`);
            noMatchCount++;
          }
          errors.push({ _id: sample._id, productId: currentProductId, reason: !product ? '商品不存在' : '商品无tiktokProductId' });
          errorCount++;
        }
      } else {
        // 不是 ObjectId 格式，可能是 TikTok 商品 ID 或其他值
        alreadyCorrectCount++;
      }
    }

    console.log('\n========== 迁移完成 ==========\n');
    console.log(`修复成功: ${fixedCount} 条`);
    console.log(`已正确:   ${alreadyCorrectCount} 条`);
    console.log(`无法修复: ${errorCount} 条`);
    
    if (errors.length > 0) {
      console.log('\n无法修复的记录:');
      errors.forEach(e => console.log(`  - ${e._id}: ${e.productId} (${e.reason})`));
    }

    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
    process.exit(0);

  } catch (error) {
    console.error('迁移失败:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
