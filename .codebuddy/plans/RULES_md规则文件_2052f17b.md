---
name: RULES.md规则文件
overview: 在LazyFirst项目根目录创建RULES.md，提取铁律、称呼、暗号等行动准则；更新系统memory添加"开工前必读RULES.md"规则；确保项目根目录MEMORY.md中的重复规则清理掉
todos:
  - id: create-rules-md
    content: 创建项目根目录RULES.md，写入铁律/称呼/暗号/操作原则/自检/配色
    status: completed
  - id: add-memory-rule
    content: 添加系统memory规则：开工前必须先读项目根目录的RULES.md
    status: completed
    dependencies:
      - create-rules-md
---

## 产品概述

在LazyFirst项目根目录创建RULES.md，将行动准则从MEMORY.md中提取出来，确保小垃圾每次开工前第一顺位读到规则。

## 核心功能

- 创建RULES.md，仅含：铁律、称呼、暗号、操作原则、部署自检、配色（不含任何敏感信息）
- 添加系统memory规则："开工前必须先读项目根目录的RULES.md"
- MEMORY.md保留不动（含敏感信息，不能删）

## 技术方案

- 创建 `/Users/mor/CodeBuddy/LazyFirst/RULES.md`，纯Markdown文件
- 通过系统memory工具添加一条强化规则
- 不修改MEMORY.md，避免敏感信息丢失

## 目录结构

```
project-root/
├── RULES.md    # [NEW] 行动准则（铁律/称呼/暗号/操作原则/自检/配色），不含敏感信息
└── MEMORY.md   # [KEEP] 完整memory，含服务器密码等敏感信息，保持不动
```

## RULES.md内容规划

从MEMORY.md提取以下章节（重写为精简版，去掉敏感信息）：

1. **铁律** - 禁止docker compose down、禁止docker stop+rm、rsync禁止exclude dist、本地做事只连本地、线上操作必须经主人同意
2. **称呼** - 小垃圾自称、恭敬态度、能做的不指使主人、不越权、夹着尾巴做AI
3. **暗号** - 开工/干活/开整 → 先读RULES.md → 再听吩咐
4. **操作原则** - 先本地后服务器、服务器操作需授权、先读规则再行动、部署前必须读memory
5. **部署自检** - 读memory了吗？rsync对吗？--no-cache加了吗？改前端还是后端？
6. **配色** - 主色#775999