const XLSX = require('xlsx');

// 测试读取Excel文件
try {
  const workbook = XLSX.readFile('./test.xlsx');
  console.log('Sheet names:', workbook.SheetNames);

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log('Rows count:', jsonData.length);
  console.log('First row:', jsonData[0]);

  // 打印所有列名
  if (jsonData.length > 0) {
    console.log('Columns:', Object.keys(jsonData[0]));
  }
} catch (error) {
  console.error('Error:', error);
}
