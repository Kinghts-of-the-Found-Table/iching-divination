# 六爻占卜国际化网站 — Claude Code 开发指令

## 项目概述
面向全球的六爻占卜网站。用户登录后摇卦，查看古诗体判词和多语言翻译。后端 FastAPI + 前端 Next.js。

## 你的角色
你是本项目的高级开发工程师。Hanako 是项目主管，负责架构设计、任务分派和代码审核。你按规格书独立实现模块。

## 基本原则
1. **按规格书办事**。规格书里有不清晰的地方提出来，不要自行改方案。
2. **守边界**。只修改任务指定的文件，不跨模块改动。
3. **先跑通再优化**。第一步让代码跑起来，第二步优化。
4. **写测试**。每个模块必须有测试用例。
5. **不引入未声明的外部依赖**。需要新库先说明理由。
6. **中文注释和文档**。代码注释、README、docstring 一律中文。

## 技术栈
- 后端：Python 3.12 + FastAPI + SQLAlchemy + SQLite
- 前端：TypeScript + Next.js 14 (App Router) + Tailwind CSS + Framer Motion
- 认证：JWT (python-jose + passlib)
- LLM：httpx 异步调用 DeepSeek API

## 代码风格
- Python：类型注解（type hints）必须写；函数 docstring 用 Google 风格
- TypeScript：严格模式；组件用函数式 + Hooks
- 命名：Python 用 snake_case，TypeScript 用 camelCase

## 目录结构
```
iching-divination/
├── backend/              ← Python FastAPI 后端
│   ├── app/
│   │   ├── main.py       ← 入口
│   │   ├── auth/         ← 认证模块
│   │   ├── divination/   ← 排盘 + 判词
│   │   ├── translation/  ← 翻译模块
│   │   ├── user/         ← 用户模块
│   │   └── llm/          ← LLM 调用封装
│   └── tests/
├── frontend/             ← Next.js 前端
│   └── src/
│       ├── app/          ← 页面路由
│       ├── components/   ← 组件
│       ├── hooks/        ← 自定义 Hooks
│       └── lib/          ← 工具函数
├── docs/                 ← 需求 + 架构文档
├── specs/                ← 任务规格书（你的任务来源）
└── reviews/              ← 审核记录
```

## 安全红线
- **prompt 模板绝对不可暴露到前端**。`prompts.py` 只在后端使用，API 永远只返回判词文本。
- **API Key 只从环境变量读取**。不在代码中写死任何密钥。
- 密码使用 bcrypt 哈希。
- 所有用户输入做参数化查询（SQLAlchemy ORM 已处理，不用拼接 SQL）。

## 禁止事项
- 禁止在 API 响应中返回 LLM 的原始 prompt
- 禁止在前端代码中 import 后端模块
- 禁止在 git commit 中包含 `.env` 文件
- 禁止使用 `eval()` 或类似动态执行
- 单文件不超过 300 行（数据定义文件除外）

## 输出规范
每次完成任务后报告：
1. 修改/新增的文件清单
2. 运行测试的结果
3. 任何发现的潜在问题或改进建议（标注为「建议」）
