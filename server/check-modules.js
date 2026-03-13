console.log('检查已安装的模块...\n');

try {
  const xlsx = require('xlsx');
  console.log('✓ xlsx 模块已安装');
  console.log('  版本:', xlsx.version);

  // 测试基本功能
  const XLSX = require('xlsx');
  console.log('✓ XLSX 对象可用');

  const utils = XLSX.utils;
  console.log('✓ utils 可用');
  console.log('  可用方法:', Object.keys(utils).slice(0, 10).join(', '), '...');

} catch (error) {
  console.error('✗ xlsx 模块不可用:', error.message);
  process.exit(1);
}

try {
  const multer = require('multer');
  console.log('✓ multer 模块已安装');
} catch (error) {
  console.error('✗ multer 模块不可用:', error.message);
}

try {
  const fs = require('fs');
  console.log('✓ fs 模块可用');

  // 检查uploads目录
  const uploadsDir = 'uploads/';
  const exists = fs.existsSync(uploadsDir);
  console.log(`  uploads目录 ${exists ? '存在' : '不存在'}`);

  if (exists) {
    const stats = fs.statSync(uploadsDir);
    console.log(`  权限: ${stats.mode.toString(8)}`);
  }
} catch (error) {
  console.error('✗ fs 模块错误:', error.message);
}

console.log('\n所有检查完成!');
