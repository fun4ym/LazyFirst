const fs = require('fs');
const content = fs.readFileSync('/backup.json', 'utf8');
const idx = content.indexOf('===COLLECTION:products');
let endIdx = content.indexOf('===COLLECTION:', idx + 1);
let start = content.indexOf('\n', idx);
while (start < content.length && content[start] === '\n') start++;
let end = endIdx;
while (end > start && content[end - 1] === '\n') end--;
const text = content.substring(start, end);

function convertDoc(str) {
  let s = str;
  s = s.replace(/([{,]\s*)([_$a-zA-Z][_$a-zA-Z0-9]*)\s*:/g, '$1"$2":');
  s = s.replace(/\x27/g, '"');
  s = s.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');
  s = s.replace(/ISODate\("([^"]+)"\)/g, '"$1"');
  s = s.replace(/\["Buffer\.from\([^)]+\)"\]/g, '[]');
  s = s.replace(/,\s*([}\]])/g, '$1');
  return s;
}

let depth = 0, inStr = false, esc = false, docStart = -1;
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
        const converted = convertDoc(raw);
        console.log('Raw前200:', raw.substring(0, 200));
        console.log('Converted前200:', converted.substring(0, 200));
        try {
          JSON.parse(converted);
          console.log('解析成功');
        } catch(e) {
          console.log('Error:', e.message);
          console.log('Around +:', converted.substring(converted.indexOf('+') - 20, converted.indexOf('+') + 50));
        }
        process.exit(0);
      }
    }
  }
}
