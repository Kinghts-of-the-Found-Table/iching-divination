# TASK-007：Next.js 前端骨架 + Landing 首页

- **任务ID**：TASK-007
- **依赖**：无（后端 API 已就绪，但前端可独立开发）
- **工作目录**：`iching-divination/frontend/`

---

## 背景

搭建 Next.js 前端项目骨架，建立仪式感设计体系，实现 Landing 首页。后续所有页面基于此骨架扩展。

---

## 一、项目初始化

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

### 额外依赖

```bash
npm install framer-motion lucide-react
```

- `framer-motion`：占卜动画
- `lucide-react`：图标库（轻量，不引入重量级 UI 库）

## 二、设计体系

### 配色

```typescript
// tailwind.config.ts 扩展
colors: {
  ivory:    '#FDFBF7',   // 暖白底
  ink:      '#3D3226',   // 深棕正文
  'ink-light': '#6B5D4F', // 次级文字
  gold:     '#8B7355',   // 暗金点缀
  'gold-light': '#C4A97D', // 亮金（hover/高亮）
  ikb:      '#0018A8',   // IKB 克莱因蓝（仅 CTA 按钮等关键交互）
  diviner:  '#F5F0E8',   // 卡片底色（比 ivory 深一点点）
  warning:  '#9C9488',   // 免责声明文字
}
```

### 字体

```css
/* 标题：衬线，仪式感 */
--font-heading: 'Noto Serif SC', 'Source Han Serif SC', serif;

/* 正文：无衬线，干净 */
--font-body: system-ui, -apple-system, sans-serif;
```

Noto Serif SC 从 Google Fonts 加载，但后续建议自托管。

### 间距与排版

- 正文 16px，行高 1.8
- 标题层级：h1 36px / h2 24px / h3 18px
- 最大阅读宽度 720px，居中
- 卡片圆角 4px（直角硬切的方向，但不能零圆角——0 圆角在网页上太锋利）

### 设计原则

- 仪式感：留白多、节奏慢、不堆砌信息
- 不俏皮：无 emoji 图标、无弹跳动画、无糖果色
- 东方而不土：不用大红灯笼、祥云纹、毛笔字体
- 信任感：排版对齐精确、颜色克制、信息层级清晰

---

## 三、文件结构

```
frontend/src/
├── app/
│   ├── layout.tsx          ← 根布局（Header + Footer + Disclaimer）
│   ├── page.tsx            ← Landing 首页
│   ├── globals.css         ← Tailwind + 自定义样式 + 字体
│   ├── login/page.tsx      ← 占位（TASK-009 实现）
│   ├── register/page.tsx   ← 占位
│   ├── dashboard/page.tsx  ← 占位
│   └── divination/
│       └── page.tsx        ← 占位（TASK-008 实现）
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx      ← 顶部导航
│   │   └── Footer.tsx      ← 底部（含免责声明）
│   └── landing/
│       ├── HeroSection.tsx   ← 首屏
│       ├── CultureIntro.tsx  ← 六爻文化简介
│       ├── HexagramWall.tsx  ← 卦象展示墙
│       └── CTASection.tsx    ← 开始占卜 CTA
│
├── lib/
│   ├── api.ts              ← API 封装（axios/fetch + JWT 拦截）
│   └── constants.ts        ← 常量（API base URL 等）
│
└── hooks/
    └── useAuth.ts          ← 认证状态 hook（TASK-009 用，先建接口）
```

---

## 四、组件规格

### 1. `layout.tsx` — 根布局

```
┌──────────────────────────────────────┐
│  Header（站点名 + 导航）              │
├──────────────────────────────────────┤
│                                      │
│  {children}                          │
│                                      │
├──────────────────────────────────────┤
│  Footer                              │
│  "占卜结果仅供娱乐参考，请理性看待"     │
│  © 2026 六爻占卜                      │
└──────────────────────────────────────┘
```

- Header 固定顶部，背景半透明 + backdrop blur
- Footer 始终在页面底部
- 首次访问弹出 Modal："本网站提供的占卜内容仅供传统文化体验与娱乐参考，不构成任何形式的决策建议。请理性看待占卜结果。"
  - 用 localStorage 记录"已看过"，同浏览器不再弹出
- html lang="zh-CN"

### 2. `Header.tsx`

- 左侧：站点名"六爻"，字体 serif，颜色 ink
- 右侧：未登录显示"登录"，已登录显示"我的"+"剩余 N 次"
- 背景：ivory 80% 透明度 + backdrop-blur
- 底部 1px 分割线，颜色 gold 10% 透明度
- 高度 56px

### 3. `Footer.tsx`

- 居中排版
- "占卜结果仅供娱乐参考，请理性看待"（warning 色，14px）
- "© 2026 六爻占卜 · 传统文化体验平台"（warning 色，12px）
- 底部 padding 充足，不和内容挤在一起

### 4. `HeroSection.tsx`

```
（大留白）
  
        六 爻
  
  以铜钱问天，以卦象观心
  
      [开始占卜] 按钮
  
（大留白）
```

- "六爻" 用 serif，字号 64px，颜色 ink，字间距宽松
- 副标题 18px，ink-light，font-body
- 按钮：金色描边 + 透明底，hover 填充金色
  - 点击行为：未登录 → `/login`；已登录 → `/divination`
- 整个区域高度不少于视口 70%
- 背景可以有极淡的卦象暗纹（CSS 实现，不引入图片）

### 5. `CultureIntro.tsx`

三小段文字，每段配一个小标题：

```
  何为六爻

  六爻源于《周易》，以三枚铜钱抛掷六次成卦。
  每卦六爻，由下而上，象天地人三才之道。
  三千年来，无数人在困惑时向卦象寻求启示。

  如何起卦

  心中默念所问之事，摇动龟壳，铜钱落下。
  六爻逐次显现，各有阴阳，各有变数。
  本卦映现状，之卦示趋势，变爻指关键。

  如何解读

  卦象不是答案，是一面镜子。
  判词以古诗体写出，供你品味咀嚼。
  解卦以白话解析，助你理清思路。
  最终的选择与行动，始终在你手中。
```

- 每段 h3 18px serif，正文 16px font-body
- 段间距充足（margin-bottom 48px）
- 文字居中，最大宽度 600px
- 背景与 Hero 之间有一个微妙的过渡（ivory → diviner 渐变）

### 6. `HexagramWall.tsx`

- 展示 64 卦卦名，排成 8×8 网格
- 每个卦名 little tag 样式：浅底 + 暗文字
- 鼠标悬停显示卦象描述（来自 data.py 的 description 字段）
- 不需要调后端——前端硬编码一份 64 卦 name→description 映射（从 `data.py` 导出 JSON 或手写一个 ts 常量）
- 不用动画，静态展示即可
- 目的是让用户感受到"这是一个有 64 种可能性的古老体系"的厚重感

### 7. `CTASection.tsx`

- 大留白 + "准备好了吗？" + "开始占卜"按钮
- 和 Hero 的 CTA 同一个逻辑

---

## 五、API 封装 `lib/api.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 自动带 JWT 的 fetch 封装
// - 请求时自动从 localStorage 取 token 加到 Authorization header
// - 响应 401 时清除 token 并跳转 /login
// - 导出 get/post 两个方法

export async function apiGet<T>(path: string): Promise<T> { ... }
export async function apiPost<T>(path: string, body?: unknown): Promise<T> { ... }
```

---

## 六、占位页面

三个页面只需要最小可运行内容：

- `login/page.tsx`：居中卡片，上面写"登录 — 即将上线"
- `register/page.tsx`：同上，"注册 — 即将上线"
- `dashboard/page.tsx`：检查登录状态，未登录跳转 /login，已登录显示"仪表盘 — 即将上线"
- `divination/page.tsx`：同上，占位

---

## 七、约束

- 所有文案中文
- 不引入重 UI 库（Material UI / Ant Design 等）
- 不引入图片资源（用 CSS + 文字 + SVG 图标搞定）
- 响应式：桌面 720px 居中，移动端 16px 左右 padding
- 无暗色模式
- 首次加载不闪烁（SSR 与客户端一致）

---

## 输出

所有组件和页面的源文件。最终 `npm run dev` 可启动，访问 `localhost:3000` 看到完整 Landing。

---

## 完成标准

- [ ] `npm run dev` 启动无报错
- [ ] Landing 四个区块完整：Hero / CultureIntro / HexagramWall / CTA
- [ ] Header + Footer 在所有页面可见
- [ ] 首次访问弹出免责弹窗，关闭后不再出现
- [ ] 移动端布局正常（375px 宽度测试）
- [ ] 配色、字体、间距符合仪式感方向
