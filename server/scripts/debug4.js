const fs = require('fs');
const { ObjectId } = require('mongodb');

const content = fs.readFileSync('/backup.json', 'utf8');
const targetColl = process.argv[2] || 'users';
const idx = content.indexOf('===COLLECTION:' + targetColl);
if (idx === -1) { console.log('未找到'); return; }

let endIdx = content.indexOf('===COLLECTION:', idx + 1);
let start = content.indexOf('\n', idx);
while (start < content.length && content[start] === '\n') start++;
const text = content.substring(start, endIdx);

function convertDoc(str) {
  let s = str;
  s = s.replace(/([{,]\s*)([_$a-zA-Z][_$a-zA-Z0-9]*)\s*:/g, '$1"$2":');
  s = s.replace(/ObjectId\('([^']+)'\)/g, '___OID___$1___ENDOID___');
  s = s.replace(/ISODate\('([^']+)'\)/g, '___DATE___$1___ENDDATE___');
  s = s.replace(/'/g, '"');
  s = s.replace(/"___OID___([^_]+)___ENDOID___"/g, '"$1"');
  s = s.replace(/"___DATE___([^_]+)___ENDDATE___"/g, '"$1"');
  s = s.replace(/\[Buffer\.from\([^)]+\)\]/g, '[]');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

let depth = 0, inStr = false, esc = false, docStart = -1, count = 0, errors = 0;
for (let j = 0; j < text.length; j++) {
  const c = text[j];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (!inStr) {
    if (c === '{') { if (depth === 0) docStart = j; depth++; }
    if (c === '}') {
      depth--;
      if (depth === 0 && docStart !== -1) {
        const raw = text.substring(docStart, j + 1);
        try {
          const converted = convertDoc(raw);
          const obj = JSON.parse(converted);
          if (obj._id) count++;
        } catch(e) {
          errors++;
        }
        docStart = -1;
      }
    }
  }
}
console.log('成功:', count, '错误:', errors);
