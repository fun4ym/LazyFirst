const test = "{ _id: ObjectId('69a7aad8da66cd5145a5f09b') }";
let s = test;
console.log('原始:', s);

s = s.replace(/([{,]\s*)([_$a-zA-Z][_$a-zA-Z0-9]*)\s*:/g, '$1"$2":');
console.log('键名:', s);

// 用十六进制匹配单引号
s = s.replace(/\x27/g, '"');
console.log('单引号替换后:', s);

s = s.replace(/ObjectId\("([^"]+)"\)/g, '"$1"');
console.log('ObjectId替换后:', s);

s = s.replace(/ISODate\("([^"]+)"\)/g, '"$1"');
console.log('ISODate替换后:', s);

try {
  const obj = JSON.parse(s);
  console.log('解析成功:', obj);
} catch(e) {
  console.log('解析失败:', e.message);
}
