/**
 * 产品活动配置数据迁移脚本
 * 
 * 将现有产品数据迁移到新的 activityConfigs 结构中
 * 
 * 迁移逻辑：
 * 1. squareCommissionRate -> activityConfigs[].promotionInfluencerRate (推广时达人佣金)
 * 2. influencerRequirement -> activityConfigs[].requirementRemark (达人要求说明)
 * 3. cooperationMode.sampleMode -> activityConfigs[].sampleMethod (寄样方式)
 * 
 * 注意：需要先有活动数据，如果没有活动则不迁移
 */

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';
  await mongoose.connect(uri);
  console.log('✅ MongoDB Connected');
};

// 活动配置子文档schema（与Product.js保持一致）
const activityConfigSchema = new mongoose.Schema({
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  requirementGmv: { type: Number, default: 0 },
  requirementMonthlySales: { type: Number, default: 0 },
  requirementFollowers: { type: Number, default: 0 },
  requirementAvgViews: { type: Number, default: 0 },
  requirementRemark: { type: String, default: '', maxlength: 1000 },
  sampleMethod: { type: String, default: '' },
  cooperationCountry: { type: String, default: '' },
  promotionInfluencerRate: { type: Number, default: 0 },
  promotionOriginalRate: { type: Number, default: 0 },
  promotionCompanyRate: { type: Number, default: 0 },
  adInfluencerRate: { type: Number, default: 0 },
  adOriginalRate: { type: Number, default: 0 },
  adCompanyRate: { type: Number, default: 0 }
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  squareCommissionRate: { type: Number, default: 0 },
  influencerRequirement: { type: String, default: '' },
  cooperationMode: {
    commissionEnabled: { type: Boolean, default: true },
    sampleRequired: { type: Boolean, default: true },
    sampleMode: { type: String, enum: ['online', 'offline'], default: 'offline' },
    sampleRequirements: String,
    activityParticipation: { type: Boolean, default: true }
  },
  activityConfigs: [activityConfigSchema]
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);
const Activity = mongoose.model('Activity', new mongoose.Schema({
  name: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true }));

async function migrate() {
  try {
    await connectDB();
    
    // 获取所有公司
    const companies = await mongoose.connection.db.collection('companies').find({}).toArray();
    console.log(`\n📊 发现 ${companies.length} 个公司\n`);
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const company of companies) {
      console.log(`\n🏢 处理公司: ${company.name} (${company._id})`);
      
      // 获取该公司的活动（取第一个活动作为默认活动）
      const activities = await Activity.find({ companyId: company._id }).limit(1).lean();
      
      if (activities.length === 0) {
        console.log(`   ⚠️ 该公司没有活动，跳过`);
        totalSkipped += await Product.countDocuments({ companyId: company._id });
        continue;
      }
      
      const defaultActivity = activities[0];
      console.log(`   📋 使用活动: ${defaultActivity.name}`);
      
      // 查找需要迁移的产品（没有activityConfigs或为空）
      const productsToMigrate = await Product.find({
        companyId: company._id,
        $or: [
          { activityConfigs: { $exists: false } },
          { activityConfigs: { $size: 0 } }
        ]
      }).lean();
      
      console.log(`   📦 需要迁移的产品数: ${productsToMigrate.length}`);
      
      for (const product of productsToMigrate) {
        try {
          // 构建迁移数据
          const activityConfig = {
            activityId: defaultActivity._id,
            requirementGmv: 0,
            requirementMonthlySales: 0,
            requirementFollowers: 0,
            requirementAvgViews: 0,
            requirementRemark: product.influencerRequirement || '',
            sampleMethod: product.cooperationMode?.sampleMode === 'online' ? '线上' : 
                          product.cooperationMode?.sampleMode === 'offline' ? '线下' : '',
            cooperationCountry: '',
            promotionInfluencerRate: product.squareCommissionRate || 0,
            promotionOriginalRate: 0,
            promotionCompanyRate: 0,
            adInfluencerRate: 0,
            adOriginalRate: 0,
            adCompanyRate: 0
          };
          
          // 更新产品
          await Product.updateOne(
            { _id: product._id },
            { $set: { activityConfigs: [activityConfig] } }
          );
          
          totalMigrated++;
          if (totalMigrated % 50 === 0) {
            console.log(`   ✅ 已迁移 ${totalMigrated} 个产品`);
          }
        } catch (err) {
          console.error(`   ❌ 迁移产品 ${product._id} 失败: ${err.message}`);
          totalErrors++;
        }
      }
    }
    
    console.log(`\n========================================`);
    console.log(`📈 迁移完成！`);
    console.log(`   ✅ 成功迁移: ${totalMigrated} 个产品`);
    console.log(`   ⏭️  跳过: ${totalSkipped} 个产品`);
    console.log(`   ❌ 错误: ${totalErrors} 个产品`);
    console.log(`========================================\n`);
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ 迁移失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行迁移
migrate();
