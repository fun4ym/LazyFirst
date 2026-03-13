const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// 导入所有模型
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Company = require('../models/Company');
const Influencer = require('../models/Influencer');
const Product = require('../models/Product');
const SampleManagement = require('../models/SampleManagement');
const ReportOrder = require('../models/ReportOrder');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const Activity = require('../models/Activity');
const Performance = require('../models/Performance');
const BaseData = require('../models/BaseData');

const importData = async () => {
  try {
    console.log('📥 开始导入数据...');

    // 连接目标数据库
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('请设置 MONGODB_URI 环境变量');
    }

    await mongoose.connect(uri);
    console.log(`✅ 已连接到目标数据库: ${uri}`);

    // 获取导出文件路径
    const args = process.argv.slice(2);
    if (args.length === 0) {
      throw new Error('请指定导出文件路径，例如: node import-data.js ../backups/data-export-xxx.json');
    }

    const dataPath = path.resolve(args[0]);
    if (!fs.existsSync(dataPath)) {
      throw new Error(`文件不存在: ${dataPath}`);
    }

    console.log(`📄 读取导出文件: ${dataPath}`);

    // 读取导出的数据
    const importContent = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const allData = importContent.collections || importContent;

    console.log(`📊 导出时间: ${importContent.exportTime || '未知'}`);
    console.log(`📊 导出记录数: ${importContent.totalRecords || '未知'}`);
    console.log('');

    // 定义要导入的模型列表（注意顺序，有依赖关系的先导入）
    const importModels = [
      { model: Company, name: 'company' },
      { model: Department, name: 'department' },
      { model: Role, name: 'role' },
      { model: User, name: 'user' },
      { model: BaseData, name: 'baseData' },
      { model: Influencer, name: 'influencer' },
      { model: Product, name: 'product' },
      { model: Activity, name: 'activity' },
      { model: SampleManagement, name: 'sample-management' },
      { model: ReportOrder, name: 'report-order' },
      { model: Order, name: 'order' },
      { model: Commission, name: 'commission' },
      { model: Performance, name: 'performance' },
    ];

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const { model, name } of importModels) {
      const data = allData[name];
      
      if (!data || data.length === 0) {
        console.log(`⏭️  跳过 ${name}: 无数据`);
        continue;
      }

      try {
        // 清空现有数据（可选，根据需求调整）
        await model.deleteMany({});
        
        // 插入数据
        await model.insertMany(data);
        totalImported += data.length;
        console.log(`✅ 导入 ${name}: ${data.length} 条记录`);
      } catch (error) {
        totalErrors++;
        console.error(`❌ 导入 ${name} 失败:`, error.message);
        
        // 尝试逐条导入，记录具体错误
        console.log(`🔍 尝试逐条导入 ${name}...`);
        let imported = 0;
        for (const item of data) {
          try {
            await model.create(item);
            imported++;
          } catch (err) {
            console.warn(`  ⚠️  跳过记录: ${err.message}`);
          }
        }
        console.log(`  ✅ 逐条导入 ${name}: ${imported}/${data.length} 条成功`);
        totalImported += imported;
        totalErrors--;
      }
    }

    console.log('\n========================================');
    console.log('✅ 数据导入完成！');
    console.log(`📊 成功导入: ${totalImported} 条记录`);
    console.log(`📊 跳过: ${totalSkipped} 条记录`);
    console.log(`📊 错误: ${totalErrors} 个集合`);
    console.log(`📅 导入时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// 运行导入
importData();
