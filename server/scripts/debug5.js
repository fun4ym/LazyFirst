const fs = require('fs');
const content = fs.readFileSync('/backup.json', 'utf8');
const targetColl = 'products';
const idx = content.indexOf('===COLLECTION:' + targetColl);
let endIdx = content.indexOf('===COLLECTION:', idx + 1);
let start = content.indexOf('\n', idx);
while (start < content.length && content[start] === '\n') start++;
let end = endIdx;
while (end > start && content[end - 1] === '\n') end--;
const text = content.substring(start, end);
console.log('文本长度:', text.length);

let depth = 0, inStr = false, esc = false, docStart = -1, count = 0;
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
        count++;
        if (count <= 2) console.log('Doc', count, ':', text.substring(docStart, j+1).substring(0, 100));
        docStart = -1;
      }
    }
  }
}
console.log('总文档数:', count);
