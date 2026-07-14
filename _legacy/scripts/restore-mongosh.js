#!/usr/bin/env mongosh
/**
 * 从JSON备份文件恢复MongoDB数据
 * 用法: docker exec tap-mongodb mongosh "mongodb://user:pass@localhost:27017/db?authSource=auth" < restore-mongosh.js
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = process.env.BACKUP_FILE || '/backup/upd202604081635all.json';
const DROP_COLLECTIONS = process.env.DROP_COLLECTIONS === 'true';

print('读取备份文件: ' + BACKUP_FILE);

const content = fs.readFileSync(BACKUP_FILE, 'utf8');

// 按集合分割
const sections = content.split(/===COLLECTION:/).filter(s => s.trim());

let totalCollections = 0;
let totalDocuments = 0;

for (const section of sections) {
  const lines = section.split('\n');
  const collName = lines[0].replace(/=+$/g, '').trim();
  
  if (!collName || lines.length < 2) continue;
  
  // 跳过集合头后的空行
  let docStartIndex = 1;
  while (docStartIndex < lines.length && !lines[docStartIndex].trim()) {
    docStartIndex++;
  }
  
  // 提取所有JSON文档
  const docStrings = lines.slice(docStartIndex).join('\n');
  
  // 使用正则匹配每个JSON对象
  const jsonPattern = /\{[\s\S]*?\}(?=\s*\{|\s*$)/g;
  const matches = docStrings.match(jsonPattern) || [];
  
  if (matches.length === 0) continue;
  
  totalCollections++;
  
  print('\n处理集合: ' + collName + ' (' + matches.length + ' 条记录)');
  
  try {
    // 转换ObjectId和ISODate
    const docs = matches.map(jsonStr => {
      // 处理ObjectId
      let converted = jsonStr.replace(/ObjectId\(['"]([^'"]+)['"]\)/g, '"$1"');
      // 处理ISODate
      converted = converted.replace(/ISODate\(['"]([^'"]+)['"]\)/g, '"$1"');
      // 处理Buffer
      converted = converted.replace(/\[Buffer\.from\([^)]+\)\]/g, '[]');
      // 处理DBRef
      converted = converted.replace(/DBRef\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g, '{"$ref":"$1","$id":"$2"}');
      
      try {
        return JSON.parse(converted);
      } catch (e) {
        return null;
      }
    }).filter(d => d && d._id);
    
    if (docs.length === 0) {
      print('  ⚠ 无有效文档');
      continue;
    }
    
    const coll = db.getCollection(collName);
    
    if (DROP_COLLECTIONS) {
      try {
        coll.drop();
        print('  ✓ 已清空集合');
      } catch (e) {
        // 集合不存在
      }
    }
    
    // 批量插入
    let inserted = 0;
    try {
      const result = coll.insertMany(docs, { ordered: false });
      inserted = result.insertedCount;
    } catch (e) {
      if (e.writeErrors) {
        inserted = e.insertedCount || 0;
      }
    }
    
    totalDocuments += inserted;
    print('  ✓ 已插入 ' + inserted + ' 条记录');
    
  } catch (e) {
    print('  ✗ 错误: ' + e.message);
  }
}

print('\n========== 恢复完成 ==========');
print('合计: ' + totalCollections + ' 个集合, ' + totalDocuments + ' 条记录');

print('\n验证:');
const collections = db.getMongo().getDB().getCollectionNames();
collections.forEach(name => {
  const count = db.getCollection(name).countDocuments();
  if (count > 0) {
    print('  ' + name + ': ' + count + ' 条');
  }
});
