/**
 * 迁移脚本：将硬编码的商品等级(ordinary/hot/main/new)写入BaseData，
 * 并将Product的productGrade字段从字符串枚举改为ObjectId引用BaseData
 * 
 * 使用方式：node migrate_grade_to_basedata.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BaseData = require('./models/BaseData');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/tap_system';

// 硬编码的4个等级定义
const GRADES = [
  { name: '普通', code: 'ordinary', englishName: 'Ordinary', thaiName: 'สินค้าทั่วไป', description: '普通商品', order: 1 },
  { name: '爆款', code: 'hot', englishName: 'Hot', thaiName: 'สินค้าขายดี', description: '爆款商品', order: 2 },
  { name: '主推款', code: 'main', englishName: 'Main', thaiName: 'สินค้าแนะนำ', description: '主推款商品', order: 3 },
  { name: '新品', code: 'new', englishName: 'New', thaiName: 'สินค้าใหม่', description: '新品商品', order: 4 }
];

async function migrate() {
  console.log('连接数据库:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('数据库连接成功');

  // 获取所有公司
  const companies = await Product.distinct('companyId');
  console.log(`找到 ${companies.length} 个公司`);

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const companyId of companies) {
    console.log(`\n处理公司: ${companyId}`);

    // 1. 为每个公司创建grade类型的BaseData
    const gradeMap = {}; // code -> ObjectId

    for (const grade of GRADES) {
      // 检查是否已存在
      let existing = await BaseData.findOne({
        companyId,
        type: 'grade',
        code: grade.code
      });

      if (existing) {
        console.log(`  等级 "${grade.name}" (${grade.code}) 已存在, _id: ${existing._id}`);
        // 更新thaiName字段
        if (!existing.thaiName && grade.thaiName) {
          existing.thaiName = grade.thaiName;
          await existing.save();
          console.log(`  更新泰文名: ${grade.thaiName}`);
        }
        gradeMap[grade.code] = existing._id;
      } else {
        const newGrade = await BaseData.create({
          name: grade.name,
          type: 'grade',
          code: grade.code,
          englishName: grade.englishName,
          thaiName: grade.thaiName,
          description: grade.description,
          status: 'active',
          companyId
        });
        console.log(`  创建等级 "${grade.name}" (${grade.code}), _id: ${newGrade._id}`);
        gradeMap[grade.code] = newGrade._id;
        totalCreated++;
      }
    }

    // 2. 更新该公司的Product，将productGrade字符串改为gradeId ObjectId
    const products = await Product.find({ companyId });
    let updatedCount = 0;

    for (const product of products) {
      const oldGrade = product.productGrade || 'ordinary';
      const gradeId = gradeMap[oldGrade];

      if (gradeId && (!product.gradeId || product.gradeId.toString() !== gradeId.toString())) {
        product.gradeId = gradeId;
        // 保留productGrade字段以兼容旧代码
        await product.save();
        updatedCount++;
      }
    }

    console.log(`  更新了 ${updatedCount} 个商品的gradeId`);
    totalUpdated += updatedCount;
  }

  console.log(`\n=== 迁移完成 ===`);
  console.log(`创建等级数据: ${totalCreated} 条`);
  console.log(`更新商品: ${totalUpdated} 条`);

  await mongoose.disconnect();
  console.log('数据库连接已关闭');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
