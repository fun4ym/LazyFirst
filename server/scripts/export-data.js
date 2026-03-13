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

const exportData = async () => {
  try {
    console.log('📦 开始导出数据...');

    // 连接当前数据库
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tap_system';
    await mongoose.connect(uri);
    console.log(`✅ 已连接到数据库: ${uri}`);

    // 定义要导出的模型列表（注意顺序，有依赖关系的先导出）
    const exportModels = [
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

    const allData = {};
    let totalRecords = 0;

    for (const { model, name } of exportModels) {
      try {
        const data = await model.find({}).lean();
        allData[name] = data;
        totalRecords += data.length;
        console.log(`✅ 导出 ${name}: ${data.length} 条记录`);
      } catch (error) {
        console.warn(`⚠️  导出 ${name} 失败:`, error.message);
        allData[name] = [];
      }
    }

    // 创建备份目录
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 保存到 JSON 文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputPath = path.join(backupDir, `data-export-${timestamp}.json`);
    
    const exportContent = {
      exportTime: new Date().toISOString(),
      totalRecords,
      collections: allData
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportContent, null, 2));

    console.log('\n========================================');
    console.log(`✅ 数据已导出到: ${outputPath}`);
    console.log(`📊 总计: ${totalRecords} 条记录`);
    console.log(`📅 导出时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 导出失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// 运行导出
exportData();
