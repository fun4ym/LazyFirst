#!/usr/bin/env node
/**
 * 模型 / 路由引用一致性检查脚本（纯静态文本分析，无外部依赖）
 * 用法: node scripts/check-model-refs.mjs
 *
 * 检查项:
 *  1) 悬空 ref：schema 中 `ref: 'Xxx'` 指向不存在的 mongoose.model 注册名
 *  2) 模型统一导出：routes / services 是否仍直接 require('../models/Xxx') 而非走 models/index
 *  3) 函数体内重复 require('../models/Xxx')（同一文件多次，应改为顶部一次性引入）
 *
 * 供《项目优化方案》阶段五使用，目标：把"模型→schema→引用"一致性纳入变更流程，防技术债复发。
 */
import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const serverDir = path.join(repoRoot, 'server')

// 1. 收集所有真实模型注册名（models/*.js 中 mongoose.model('Xxx', ...)）
const modelsDir = path.join(serverDir, 'models')
const modelFiles = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js') && f !== 'index.js')
const registeredModels = new Set()
for (const f of modelFiles) {
  const src = fs.readFileSync(path.join(modelsDir, f), 'utf8')
  const m = src.match(/mongoose\.model\(\s*['"](\w+)['"]/)
  if (m) registeredModels.add(m[1])
}

// models/index.js 导出名集合（以 index.js 内 require('./Xxx') 为准）
const idxSrc = fs.readFileSync(path.join(modelsDir, 'index.js'), 'utf8')
const exportedModels = new Set()
for (const m of idxSrc.matchAll(/require\(\s*['"]\.\/(\w+)['"]\s*\)/g)) exportedModels.add(m[1])

// 2. 悬空 ref
const danglingRefs = []
for (const f of modelFiles) {
  const src = fs.readFileSync(path.join(modelsDir, f), 'utf8')
  for (const m of src.matchAll(/ref\s*:\s*['"](\w+)['"]/g)) {
    const ref = m[1]
    if (!registeredModels.has(ref)) danglingRefs.push({ file: f, ref })
  }
}

// 3. 路由 / 服务中的 require 风格
function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.js')) out.push(p)
  }
  return out
}
const rel = (p) => path.relative(repoRoot, p)

const codeDirs = [path.join(serverDir, 'routes'), path.join(serverDir, 'services')]
const directReq = [] // require('../models/Xxx') 直接引用（未走 index）
const dupReq = [] // 同文件同模型多次 require
for (const dir of codeDirs) {
  if (!fs.existsSync(dir)) continue
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, 'utf8')
    const reqs = [...src.matchAll(/require\(\s*['"]\.\.\/models\/(\w+)['"]\s*\)/g)].map((m) => m[1])
    if (reqs.length) directReq.push({ file: rel(file), models: [...new Set(reqs)] })
    const counts = {}
    for (const r of reqs) counts[r] = (counts[r] || 0) + 1
    for (const [m, c] of Object.entries(counts)) {
      if (c > 1) dupReq.push({ file: rel(file), model: m, count: c })
    }
  }
}

console.log('\n=== 模型 / 路由引用一致性检查 ===')
console.log(`注册模型数: ${registeredModels.size};  models/index.js 导出: ${exportedModels.size}`)

console.log(`\n[悬空 ref] (${danglingRefs.length}):`)
danglingRefs.forEach((d) => console.log(`  - ${d.file}: ref:'${d.ref}' (无对应 mongoose.model 注册)`))

console.log(`\n[直接 require 模型文件（未走 models/index）] (${directReq.length} 文件):`)
directReq.forEach((d) => console.log(`  - ${d.file} -> ${d.models.join(', ')}`))

console.log(`\n[函数体内重复 require 同一模型] (${dupReq.length}):`)
dupReq.forEach((d) => console.log(`  - ${d.file}: ${d.model} x${d.count}`))

const issues = danglingRefs.length + dupReq.length
console.log(`\n结论: 悬空 ref ${danglingRefs.length} 个, 重复 require ${dupReq.length} 个。${issues === 0 ? '✅ 无问题' : '⚠️ 需处理'}\n`)
process.exit(issues === 0 ? 0 : 1)
