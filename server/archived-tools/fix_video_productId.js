/**
 * 迁移脚本：将 videos 表中的 productId 从 ObjectId 转换为 TikTok 商品 ID
 * 
 * 问题原因：Video模型productId原来定义ObjectId，实际应该存TikTok商品ID(String)
 * 修复方法：根据 productId (_id) 查找 Product 表，获取 tiktokProductId
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@150.109.183.29:27017/tap_system?authSource=tap_system';

async function migrate() {
  console.log('===== 开始迁移 videos.productId =====\n');
  
  const conn = await mongoose.connect(MONGO_URI);
  const db = conn.connection.db;
  
  try {
    // 1. 加载Product表数据
    const products = await db.collection('products').find({}, { _id: 1, tiktokProductId: 1, name: 1 }).toArray();
    const productMap = {};
    products.forEach(p => {
      productMap[p._id.toString()] = p.tiktokProductId || null;
    });
    console.log(`Product表加载: ${products.length}条`);
    
    // 2. 查找所有videos
    const videos = await db.collection('videos').find({}).toArray();
    console.log(`Videos总数: ${videos.length}`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const video of videos) {
      const oldProductId = video.productId;
      
      // 如果已经是非24位hex的String，说明已经是TikTok ID
      if (typeof oldProductId === 'string' && !/^[0-9a-f]{24}$/i.test(oldProductId)) {
        skipped++;
        continue;
      }
      
      // ObjectId格式，需要转换
      const oldIdStr = oldProductId.toString();
      const tiktokId = productMap[oldIdStr];
      
      if (tiktokId) {
        await db.collection('videos').updateOne(
          { _id: video._id },
          { $set: { productId: tiktokId } }
        );
        migrated++;
      } else {
        console.log(`  ⚠️ video._id=${video._id}, productId=${oldIdStr} 找不到对应TikTok ID`);
        errors++;
      }
    }
    
    console.log(`\n===== 迁移完成 =====`);
    console.log(`迁移: ${migrated}条`);
    console.log(`跳过(已是TikTok ID): ${skipped}条`);
    console.log(`错误(找不到映射): ${errors}条`);
    
    // 3. 验证
    const remaining = await db.collection('videos').countDocuments({
      productId: { $type: 'objectId' }
    });
    console.log(`剩余ObjectId格式的productId: ${remaining}条`);
    
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
