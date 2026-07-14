const fs = require('fs');
const content = fs.readFileSync('/backup.json', 'utf8');
const idx = content.indexOf('===COLLECTION:activities');
const sections = content.split(/===COLLECTION:/);
let found = null;
for (const s of sections) {
  const name = s.split('\n')[0].replace(/=+$/, '').trim();
  if (name === 'activities') {
    found = s;
    break;
  }
}
if (found) {
  const lines = found.split('\n');
  let start = 1; // skip header
  while (start < lines.length && !lines[start].trim()) start++;
  const text = lines.slice(start).join('\n');
  console.log('activities length:', text.length);
  console.log('end:', text.substring(text.length - 100));
}
