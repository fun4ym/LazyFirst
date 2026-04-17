#!/usr/bin/env node
/**
 * 从JSON备份文件恢复MongoDB数据
 * 运行方式: docker exec tap-backend node /path/to/restore-json.js
 */

const fs = require('fs');
const { MongoClient, ObjectId, Binary } = require('mongodb');

const MONGODB_URI = 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system';
const BACKUP_FILE = process.argv[2] || '/backup.json';
const DROP_COLLECTIONS = process.argv.includes('--drop');

async function parseBackupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const collections = {};
  
  // 按集合分割
  const sections = content.split(/===COLLECTION:/).filter(s => s.trim());
  
  for (const section of sections) {
    const lines = section.split('\n');
    const collName = lines[0].replace(/=+$/g, '').trim();
    
    if (!collName || lines.length < 2) continue;
    
    // 跳过空行
    let docStartIndex = 1;
    while (docStartIndex < lines.length && !lines[docStartIndex].trim()) {
      docStartIndex++;
    }
    
    const docText = lines.slice(docStartIndex).join('\n');
    
    // 使用括号匹配分割JSON对象
    const docs = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let escape = false;
    
    for (const char of docText) {
      if (escape) {
        current += char;
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        current += char;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        current += char;
        continue;
      }
      
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;
      }
      
      current += char;
      
      if (depth === 0 && current.trim()) {
        try {
          const parsed = parseDoc(current.trim());
          if (parsed) docs.push(parsed);
        } catch (e) {
          // 跳过无效文档
        }
        current = '';
      }
    }
    
    if (docs.length > 0) {
      collections[collName] = docs;
    }
  }
  
  return collections;
}

function parseDoc(str) {
  // 转换 ObjectId
  let converted = str.replace(/ObjectId\(['"]([^'"]+)['"]\)/g, (match, id) => {
    try {
      return JSON.stringify(new ObjectId(id));
    } catch {
      return match;
    }
  });
  
  // 转换 ISODate
  converted = converted.replace(/ISODate\(['"]([^'"]+)['"]\)/g, (match, date) => {
    try {
      return JSON.stringify(new Date(date));
    } catch {
      return match;
    }
  });
  
  // 转换 Buffer
  converted = converted.replace(/\[Buffer\.from\([^)]+\)\]/g, '[]');
  
  const doc = JSON.parse(converted);
  return doc;
}

async function main() {
  console.log(`读取备份文件: ${BACKUP_FILE}`);
  
  const collections = await parseBackupFile(BACKUP_FILE);
  
  console.log(`\n找到 ${Object.keys(collections).length} 个集合:`);
  for (const [name, docs] of Object.entries(collections)) {
    console.log(`  - ${name}: ${docs.length} 条`);
  }
  
  console.log('\n连接MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  let totalDocs = 0;
  
  for (const [collName, docs] of Object.entries(collections)) {
    console.log(`\n处理集合: ${collName}`);
    
    try {
      const coll = db.collection(collName);
      
      if (DROP_COLLECTIONS) {
        try {
          await coll.drop();
          console.log('  ✓ 已清空集合');
        } catch (e) {
          // 集合不存在
        }
      }
      
      if (docs.length > 0) {
        const result = await coll.insertMany(docs, { ordered: false });
        totalDocs += result.insertedCount;
        console.log(`  ✓ 已插入 ${result.insertedCount} 条`);
      }
    } catch (e) {
      console.log(`  ✗ 错误: ${e.message}`);
    }
  }
  
  console.log(`\n========== 恢复完成 ==========`);
  console.log(`合计: ${totalDocs} 条记录`);
  
  console.log('\n验证:');
  for (const name of await db.listCollectionNames()) {
    const count = await db.collection(name).countDocuments();
    if (count > 0) {
      console.log(`  ${name}: ${count} 条`);
    }
  }
  
  await client.close();
}

main().catch(console.error);
