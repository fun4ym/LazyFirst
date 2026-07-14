/* ESLint 配置（后端 CommonJS）
 * 用法: cd server && npm install -D eslint@^8.57.0 && npm run lint
 * 仅启用 eslint:recommended 基线，避免对存量代码产生海量 error；
 * 规则可按团队约定逐步收紧。
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules', 'dist', '_legacy'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off'
  }
}
