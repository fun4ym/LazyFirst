const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

const uri = 'mongodb://tapsystem:tap_system_pass_2024@mongodb:27017/tap_system?authSource=tap_system';
const targetColl = process.argv[2] || 'users';

function convertDoc(str) {
  let s = str;
  s = s.replace(/([{,]\s*)([_$a-zA-Z][_$a-zA-Z0-9]*)\s*:/g, '$1"$2":');
  s = s.replace(/\x27/g, '"');
  s = s.replace(/\s*"\s*\+\s*"\s*/g, '');
  s = s.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');
  s = s.replace(/ISODate\("([^"]+)"\)/g, '"$1"');
  s = s.replace(/\["Buffer\.from\([^)]+\)"\]/g, '[]');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const content = fs.readFileSync('/backup.json', 'utf8');
  
  // 使用split方式找到正确的集合内容
  const sections = content.split(/===COLLECTION:/);
  let targetText = null;
  for (const s of sections) {
    const name = s.split('\n')[0].replace(/=+$/, '').trim();
    if (name === targetColl) {
      const lines = s.split('\n');
      let start = 1;
      while (start < lines.length && !lines[start].trim()) start++;
      targetText = lines.slice(start).join('\n');
      break;
    }
  }
  
  if (!targetText) { console.log('未找到:', targetColl); await client.close(); return; }
  
  const docs = [];
  let depth = 0, inStr = false, esc = false, docStart = -1;
  for (let j = 0; j < targetText.length; j++) {
    const c = targetText[j];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (!inStr) {
      if (c === '{') { if (depth === 0) docStart = j; depth++; }
      if (c === '}') {
        depth--;
        if (depth === 0 && docStart !== -1) {
          try {
            const converted = convertDoc(targetText.substring(docStart, j + 1));
            const obj = JSON.parse(converted);
            if (obj._id) {
              if (typeof obj._id === 'string' && /^[0-9a-f]{24}$/i.test(obj._id)) {
                obj._id = new ObjectId(obj._id);
              }
              for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v)) {
                  try { obj[k] = new ObjectId(v); } catch(e) {}
                }
              }
              docs.push(obj);
            }
          } catch(e) {}
          docStart = -1;
        }
      }
    }
  }
  
  console.log('找到 ' + docs.length + ' 个文档');
  if (docs.length > 0) {
    try {
      const r = await db.collection(targetColl).insertMany(docs, { ordered: false });
      console.log('已插入 ' + r.insertedCount + ' 条');
    } catch(e) { console.log('错误:', e.message); }
  }
  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
