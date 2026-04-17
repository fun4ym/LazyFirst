const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const uri = 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system';

async function main() {
  console.log('开始...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log('已连接');
  
  const content = fs.readFileSync('/backup.json', 'utf8');
  console.log('文件大小:', content.length);
  
  const idx = content.indexOf('===COLLECTION:users');
  console.log('users索引:', idx);
  
  if (idx === -1) {
    console.log('未找到users集合');
    await client.close();
    return;
  }
  
  const section = content.substring(idx);
  console.log('users section长度:', section.length);
  
  const lines = section.split('\n');
  console.log('行数:', lines.length);
  console.log('第一行:', lines[0]);
  console.log('第二行:', lines[1] ? lines[1].substring(0, 100) : 'null');
  
  await client.close();
  console.log('完成');
}

main().catch(e => { console.error(e); process.exit(1); });
