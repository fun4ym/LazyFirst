#!/usr/bin/env node
/**
 * 从JSON备份文件恢复MongoDB数据
 * 格式: ===COLLECTION:collectionName=== 后跟JSON文档
 */

const fs = require('fs');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@localhost:27017/tap_system?authSource=tap_system';
const BACKUP_FILE = process.argv[2];

if (!BACKUP_FILE) {
  console.error('用法: node restore-from-json.js <备份文件路径> [--drop]');
  console.error('  --drop: 清空集合后恢复');
  process.exit(1);
}

const dropCollections = process.argv.includes('--drop');

async function parseBackupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const collections = {};
  const pattern = /===COLLECTION:(\w+)===\n([\s\S]*?)(?====COLLECTION:|$)/g;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const collName = match[1];
    const docsStr = match[2].trim();
    
    if (docsStr) {
      // 分割多个JSON文档
      const docs = docsStr.split(/\n}\s*\n\{/).map((doc, i, arr) => {
        if (i === 0) return doc + '}';
        if (i === arr.length - 1) return '{' + doc;
        return '{' + doc + '}';
      }).filter(d => d.trim() !== '{}' && d.trim());
      
      // 尝试解析每个文档
      const parsedDocs = [];
      for (const doc of docs) {
        try {
          const cleaned = doc.replace(/ObjectId\(['"]([^'"]+)['"]\)/g, '"$1"')
                           .replace(/ISODate\((['"])([^'"]+)\1\)/g, '"$2"')
                           .replace(/\[Buffer\.from\([^)]+\)\]/g, '[]');
          const parsed = JSON.parse(cleaned);
          if (parsed && parsed._id) {
            parsedDocs.push(parsed);
          }
        } catch (e) {
          // 跳过无法解析的文档
        }
      }
      
      if (parsedDocs.length > 0) {
        collections[collName] = parsedDocs;
      }
    }
  }
  
  return collections;
}

async function main() {
  console.log('连接MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  console.log(`读取备份文件: ${BACKUP_FILE}`);
  const collections = await parseBackupFile(BACKUP_FILE);
  
  const collNames = Object.keys(collections);
  console.log(`\n找到 ${collNames.length} 个集合:`);
  for (const name of collNames) {
    console.log(`  - ${name}: ${collections[name].length} 条记录`);
  }
  
  if (dropCollections) {
    console.log('\n清空集合...');
    for (const name of collNames) {
      try {
        await db.collection(name).drop();
        console.log(`  ✓ 已清空 ${name}`);
      } catch (e) {
        console.log(`  ○ ${name} 不存在或无法删除`);
      }
    }
  }
  
  console.log('\n恢复数据...');
  for (const [name, docs] of Object.entries(collections)) {
    try {
      if (docs.length > 0) {
        await db.collection(name).insertMany(docs, { ordered: false });
        console.log(`  ✓ ${name}: 已插入 ${docs.length} 条记录`);
      }
    } catch (e) {
      if (e.writeErrors) {
        console.log(`  ⚠ ${name}: 部分插入失败 (${e.insertedCount}/${docs.length})`);
      } else {
        console.log(`  ✗ ${name}: 错误 - ${e.message}`);
      }
    }
  }
  
  console.log('\n恢复完成！验证结果:');
  for (const name of collNames) {
    const count = await db.collection(name).countDocuments();
    console.log(`  - ${name}: ${count} 条`);
  }
  
  await client.close();
}

main().catch(console.error);
