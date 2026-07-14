/* ESLint 配置（前端 Vue3 + ESM）
 * 用法: cd frontend && npm install -D eslint@^8.57.0 eslint-plugin-vue@^9.20.0 && npm run lint
 * 注意: frontend/package.json 含 "type": "module"，故本文件用 .cjs 扩展名以 CommonJS 加载。
 * 仅启用 vue3-recommended 基线，避免对存量 .vue 产生海量 error。
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended'],
  ignorePatterns: ['node_modules', 'dist', '_legacy'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off'
  }
}
