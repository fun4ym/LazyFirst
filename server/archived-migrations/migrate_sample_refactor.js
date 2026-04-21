/**
 * SampleManagement 数据模型迁移脚本
 * 
 * 用法: node server/migrate_sample_refactor.js
 * 
 * 迁移步骤：
 * 1. productId (String/TikTok ID) → productId (ObjectId ref Product)
 * 2. influencerAccount (String) → influencerId (ObjectId ref Influencer)
 * 3. salesman (String/ObjectId混合) → salesmanId (ObjectId ref User)
 * 4. videoLink/videoStreamCode → Video 表
 * 5. $unset 废弃字段
 * 6. 重建索引
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const SampleManagement = require('./models/SampleManagement');
const Product = require('./models/Product');
const Influencer = require('./models/Influencer');
const User = require('./models/User');
const Video = require('./models/Video');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';

async function migrate() {
  console.log('========================================');
  console.log('SampleManagement 数据模型迁移开始');
  console.log(`数据库: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    const total = await SampleManagement.countDocuments();
    console.log(`📊 总样品记录数: ${total}\n`);

    // =============================================
    // 步骤1: 迁移 productId (TikTok ID字符串 → ObjectId)
    // =============================================
    console.log('--- 步骤1/6: 迁移 productId ---');

    // 使用原生集合查询绕过Mongoose schema验证（因为productId现在是ObjectId类型）
    const rawDb = mongoose.connection.db;
    const sampleCollection = rawDb.collection('samplemanagements');
    
    const samplesWithProductId = await sampleCollection.find({
      productId: { $exists: true, $ne: null },
      $or: [
        { productId: { $type: 'string' } },   // 字符串类型（旧数据）
        { productId: '' }                     // 空字符串也需要处理
      ]
    }).toArray();

    let step1Success = 0;
    let step1Fail = 0;

    for (const sample of samplesWithProductId) {
      const pid = String(sample.productId || '');
      if (!pid) {
        console.warn(`  ⚠️ 空productId: sample=${sample._id}`);
        step1Fail++;
        continue;
      }
      if (/^[0-9a-fA-F]{24}$/.test(pid) && mongoose.Types.ObjectId.isValid(pid)) {
        // 已经是 ObjectId 格式，尝试验证是否是有效的Product._id
        const productExists = await Product.findById(pid);
        if (productExists) {
          step1Success++;
          continue; // 已正确，跳过
        }
        // 是ObjectId格式但找不到对应Product，尝试用tiktokProductId查找
      }

      // 尝试用 tiktokProductId 查找
      let product = await Product.findOne({ tiktokProductId: pid });

      // 如果没找到，尝试其他方式匹配
      if (!product && pid.length < 50) {
        product = await Product.findOne({ sku: pid }) ||
                  await Product.findOne({ name: { $regex: pid, $options: 'i' } });
      }

      if (product) {
        await sampleCollection.updateOne(
          { _id: sample._id },
          { $set: { productId: product._id } }
        );
        step1Success++;
      } else {
        console.warn(`  ⚠️ 找不到商品: sample=${sample._id}, oldProductId=${pid}`);
        step1Fail++;
      }
    }
    console.log(`  ✅ 成功: ${step1Success}, ⚠️ 失败: ${step1Fail}`);

    // =============================================
    // 步骤2: 迁移 influencerAccount → influencerId
    // =============================================
    console.log('\n--- 步骤2/6: 迁移 influencerAccount → influencerId ---');
    const samplesWithInfluencerAcc = await sampleCollection.find({
      influencerAccount: { $exists: true, $ne: null, $ne: '' }
    }).toArray();

    let step2Success = 0;
    let step2Fail = 0;

    for (const sample of samplesWithInfluencerAcc) {
      const acc = String(sample.influencerAccount);

      // 如果已经是 ObjectId，跳过
      if (/^[0-9a-fA-F]{24}$/.test(acc)) {
        const inf = await Influencer.findById(acc);
        if (inf) {
          await sampleCollection.updateOne({ _id: sample._id }, { $set: { influencerId: inf._id } });
          step2Success++;
        } else {
          console.warn(`  ⚠️ 达人不存在(已ObjectId): sample=${sample._id}, id=${acc}`);
          step2Fail++;
        }
        continue;
      }

      // 按 tiktokId 匹配
      const inf = await Influencer.findOne({ tiktokId: acc });
      if (inf) {
        await sampleCollection.updateOne(
          { _id: sample._id },
          { $set: { influencerId: inf._id } }
        );
        step2Success++;
      } else {
        console.warn(`  ⚠️ 找不到达人: sample=${sample._id}, account=${acc}`);
        step2Fail++;
      }
    }
    console.log(`  ✅ 成功: ${step2Success}, ⚠️ 失败: ${step2Fail}`);

    // =============================================
    // 步骤3: 迁移 salesman → salesmanId
    // =============================================
    console.log('\n--- 步骤3/6: 迁移 salesman → salesmanId ---');
    const samplesWithSalesman = await sampleCollection.find({
      salesman: { $exists: true, $ne: null, $ne: '' }
    }).toArray();

    let step3Success = 0;
    let step3Fail = 0;

    for (const sample of samplesWithSalesman) {
      const sm = sample.salesman;

      // 如果已经是 ObjectId
      if (sm && typeof sm === 'object' && sm._id) {
        const user = await User.findById(sm._id);
        if (user) {
          await sampleCollection.updateOne({ _id: sample._id }, { $set: { salesmanId: user._id } });
          step3Success++;
        } else {
          step3Fail++;
        }
        continue;
      }

      const smStr = String(sm || '');
      
      // 尝试按 ObjectId 查找
      if (/^[0-9a-fA-F]{24}$/.test(smStr)) {
        const user = await User.findById(smStr);
        if (user) {
          await sampleCollection.updateOne({ _id: sample._id }, { $set: { salesmanId: user._id } });
          step3Success++;
          continue;
        }
      }

      // 按 username 或 realName 查找
      const user = await User.findOne({
        $or: [{ username: smStr }, { realName: smStr }]
      });

      if (user) {
        await sampleCollection.updateOne(
          { _id: sample._id },
          { $set: { salesmanId: user._id } }
        );
        step3Success++;
      } else {
        console.warn(`  ⚠️ 找不到用户: sample=${sample._id}, salesman=${smStr}`);
        step3Fail++;
      }
    }
    console.log(`  ✅ 成功: ${step3Success}, ⚠️ 失败: ${step3Fail}`);

    // =============================================
    // 步骤4: videoLink/videoStreamCode → Video 表
    // =============================================
    console.log('\n--- 步骤4/6: 迁移视频信息到Video表 ---');

    // 使用原生集合查询（videoLink/videoStreamCode已从schema中移除）
    const allSamples = await sampleCollection.find({
      $or: [
        { videoLink: { $exists: true, $ne: null, $ne: '' } },
        { videoStreamCode: { $exists: true, $ne: null, $ne: '' } }
      ]
    }).toArray();

    let step4Created = 0;
    let step4Skipped = 0;

    for (const sample of allSamples) {
      const hasVideoLink = sample.videoLink && sample.videoLink.trim() !== '';
      const hasStreamCode = sample.videoStreamCode && sample.videoStreamCode.trim() !== '';

      if (!hasVideoLink && !hasStreamCode) continue;

      // 跳过 productId 不是有效 ObjectId 的记录（这些记录在步骤1中未能匹配到商品）
      const pid = sample.productId;
      if (!pid || typeof pid !== 'string' || !/^[0-9a-fA-F]{24}$/.test(pid)) {
        console.warn(`  ⚠️ 跳过视频迁移(无效productId): sample=${sample._id}`);
        continue;
      }
      // 跳过 influencerId 不是有效 ObjectId 的记录
      const iid = sample.influencerId;
      if (iid && typeof iid === 'string' && !/^[0-9a-fA-F]{24}$/.test(iid)) {
        console.warn(`  ⚠️ 视频迁移时influencerId非ObjectId: sample=${sample._id}, 将设为null`);
      }

      // 检查是否已有该样品的视频记录
      const existingVideo = await Video.findOne({
        companyId: sample.companyId,
        sampleId: sample._id,
        ...(hasVideoLink ? { videoLink: sample.videoLink } : {}),
        ...(hasStreamCode ? { videoStreamCode: sample.videoStreamCode } : {})
      });

      if (existingVideo) {
        step4Skipped++;
        continue;
      }

      // 创建 Video 记录
      const videoData = {
        companyId: sample.companyId,
        sampleId: sample._id,
        productId: pid,                    // 已验证为有效ObjectId
        influencerId: (iid && typeof iid === 'string' && /^[0-9a-fA-F]{24}$/.test(iid)) ? iid : null,
        videoLink: sample.videoLink || '',
        videoStreamCode: sample.videoStreamCode || '',
        isAdPromotion: sample.isAdPromotion || false,
        adPromotionTime: sample.adPromotionTime || null,
        createdBy: sample.creatorId || null,
        createdAt: sample.updatedAt || new Date(),
        updatedAt: new Date()
      };

      await Video.create(videoData);
      step4Created++;
    }

    console.log(`  ✅ 新建Video记录: ${step4Created}, 跳过重复: ${step4Skipped}`);

    // =============================================
    // 步骤5: $unset 废弃字段
    // =============================================
    console.log('\n--- 步骤5/6: 清理废弃字段 ---');

    const unsetResult = await SampleManagement.updateMany(
      {},
      {
        $unset: {
          productName: 1,
          influencerAccount: 1,
          followerCount: 1,
          monthlySalesCount: 1,
          avgVideoViews: 1,
          salesman: 1,
          sampleImage: 1,
          videoLink: 1,
          videoStreamCode: 1
        }
      }
    );
    console.log(`  ✅ 已清理 ${unsetResult.modifiedCount} 条记录的废弃字段`);

    // =============================================
    // 步骤6: 重建唯一索引
    // =============================================
    console.log('\n--- 步骤6/6: 重建索引 ---');
    
    const db = mongoose.connection.db;
    const collection = db.collection('samplemanagements');

    // 删除旧索引（忽略错误）
    try {
      await collection.dropIndex('companyId_1_date_1_influencerAccount_1_productId_1');
      console.log('  🗑️ 删除旧索引: companyId_1_date_1_influencerAccount_1_productId_1');
    } catch (e) {
      console.log('  ℹ️ 旧索引不存在或已删除');
    }

    // 确保新索引存在
    try {
      await collection.createIndex(
        { companyId: 1, date: 1, influencerId: 1, productId: 1 },
        { unique: true }
      );
      console.log('  ✅ 创建新索引: {companyId, date, influencerId, productId} (unique)');
    } catch (e) {
      console.error(`  ❌ 创建新索引失败: ${e.message}`);
    }

    // =============================================
    // 完成！
    // =============================================
    console.log('\n========================================');
    console.log('✅ 数据模型迁移完成！');
    console.log('========================================');
    console.log(`迁移统计:`);
    console.log(`  productId迁移: 成功${step1Success} / 失败${step1Fail}`);
    console.log(`  influencerId迁移: 成功${step2Success} / 失败${step2Fail}`);
    console.log(`  salesmanId迁移: 成功${step3Success} / 失败${step3Fail}`);
    console.log(`  Video记录创建: ${step4Created}条`);
    console.log(`  废弃字段清理: ${unsetResult.modifiedCount}条`);
    console.log('\n⚠️ 请检查失败项并手动处理！');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrate();
