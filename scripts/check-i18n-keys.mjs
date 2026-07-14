#!/usr/bin/env node
/**
 * i18n key 一致性检查脚本
 * 用法: node scripts/check-i18n-keys.mjs [baseLocale=zh] [targetLocale=en]
 * 输出: 两个语言互缺的 key 路径清单（不含值内容，仅结构比对）
 *
 * 说明: 仅做结构 diff，不判断翻译质量。供《项目优化方案》阶段一/五使用。
 */
import { pathToFileURL } from 'url'
import path from 'path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const i18nDir = path.join(repoRoot, 'frontend', 'src', 'i18n')

const baseLocale = process.argv[2] || 'zh'
const targetLocale = process.argv[3] || 'en'

async function load(locale) {
  const mod = await import(pathToFileURL(path.join(i18nDir, `${locale}.js`)).href)
  return mod.default
}

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out)
    } else {
      out.add(key)
    }
  }
  return out
}

const base = flatten(await load(baseLocale))
const target = flatten(await load(targetLocale))

const onlyInBase = [...base].filter((k) => !target.has(k)).sort()
const onlyInTarget = [...target].filter((k) => !base.has(k)).sort()

console.log(`\n=== i18n key diff: ${baseLocale} vs ${targetLocale} ===`)
console.log(`总 key 数: ${baseLocale}=${base.size}, ${targetLocale}=${target.size}`)
console.log(`\n[${baseLocale} 有, ${targetLocale} 缺] (${onlyInBase.length}):`)
onlyInBase.forEach((k) => console.log('  - ' + k))
console.log(`\n[${targetLocale} 有, ${baseLocale} 缺] (${onlyInTarget.length}):`)
onlyInTarget.forEach((k) => console.log('  + ' + k))

const missing = onlyInBase.length + onlyInTarget.length
console.log(`\n结论: 不一致 key 共 ${missing} 个。${missing === 0 ? '✅ 已对齐' : '⚠️ 需补齐'}\n`)
process.exit(missing === 0 ? 0 : 1)
