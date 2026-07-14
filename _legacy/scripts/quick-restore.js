const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const uri = 'mongodb://tapsystem:5Qb0Q9WqztimCNuzfVoX@mongodb:27017/tap_system?authSource=tap_system';

async function parseJSONL(content) {
  const docs = [];
  let current = '';
  let depth = 0, inStr = false, esc = false;
  
  for (const char of content) {
    if (esc) { current += char; esc = false; continue; }
    if (char === '\\') { esc = true; current += char; continue; }
    if (char === '"') { inStr = !inStr; current += char; continue; }
    if (!inStr) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    current += char;
    if (depth === 0 && current.trim()) {
      try {
        let s = current.trim();
        s = s.replace(/ObjectId\(['"]([^'"]+)['"]\)/g, (_, id) => JSON.stringify(new ObjectId(id)));
        s = s.replace(/ISODate\(['"]([^'"]+)['"]\)/g, (_, d) => JSON.stringify(new Date(d)));
        docs.push(JSON.parse(s));
      } catch(e) {}
      current = '';
    }
  }
  return docs;
}

async function restoreCollection(name) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const coll = db.collection(name);
  
  // 解析备份文件
  const content = fs.readFileSync('/backup.json', 'utf8');
  const sections = content.split(/===COLLECTION:/);
  
  for (const section of sections) {
    const lines = section.split('\n');
    if (lines[0].replace(/=+$/g, '').trim() !== name) continue;
    
    let startIdx = 1;
    while (startIdx < lines.length && !lines[startIdx].trim()) startIdx++;
    const docs = await parseJSONL(lines.slice(startIdx).join('\n'));
    
    if (docs.length > 0) {
      await coll.insertMany(docs, { ordered: false });
      console.log(`${name}: ${docs.length} 条`);
    }
  }
  
  await client.close();
}

const collections = ['users', 'companies', 'departments', 'roles', 'activities', 'activityhistories',
  'shops', 'shopcontacts', 'products', 'influencers', 'influencermaintenances', 
  'samplemanagements', 'reportorders', 'bddailies', 'basedatas', 'tempidmappings', 'bills'];

restoreCollection(collections[process.argv[2] || 0])
  .then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
