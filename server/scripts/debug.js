const { ObjectId } = require('mongodb');
const fs = require('fs');

const content = fs.readFileSync('/backup.json', 'utf8');
const idx = content.indexOf('===COLLECTION:users');
let endIdx = content.indexOf('===COLLECTION:', idx + 1);
let start = content.indexOf('\n', idx);
while (start < content.length && content[start] === '\n') start++;
const jsonText = content.substring(start, endIdx);
console.log('开始处理, 长度:', jsonText.length);

let depth = 0, inStr = false, escaped = false, docStart = -1, count = 0;
for (let j = 0; j < jsonText.length; j++) {
  const c = jsonText[j];
  if (escaped) { escaped = false; continue; }
  if (c === '\\') { escaped = true; continue; }
  if (c === '"') { inStr = !inStr; continue; }
  if (!inStr) {
    if (c === '{') { if (depth === 0) docStart = j; depth++; }
    if (c === '}') {
      depth--;
      if (depth === 0 && docStart !== -1) {
        count++;
        if (count <= 2) console.log('找到文档', count, ':', jsonText.substring(docStart, j+1).substring(0, 80));
        docStart = -1;
      }
    }
  }
}
console.log('总文档数:', count);
