# TASK-008：占卜流程页面（核心交互）

- **任务ID**：TASK-008
- **依赖**：TASK-007（前端骨架 ✅）、后端 API（TASK-005 ✅，运行在 localhost:8000）
- **工作目录**：`iching-divination/frontend/src/app/divination/`

---

## 背景

这是整个产品体验的核心——用户从输入问题到看到判词的完整流程。需要平衡三个东西：仪式感（不能轻浮）、等待体验（API 调 LLM 需要几秒）、视觉惊喜（稀有好卦象值得期待）。

---

## 一、页面状态机

```
IDLE          →  用户输入问题，按钮"开始摇卦"
SHAKING       →  龟壳晃动动画，2~3 秒
REVEALING     →  六爻逐行动画（每爻 0.8s），约 5 秒
AWAITING      →  等待 LLM 判词，"正在推演天机..." 加载态
JUDGMENT      →  判词逐字浮现
EXPANDED      →  用户点击"详细解读"，解卦展开
```

---

## 二、组件规格

### 1. `page.tsx` — 占卜流程页面

管理整个状态机。结构：

```tsx
'use client'

export default function DivinationPage() {
  // 状态机：idle | shaking | revealing | awaiting | judgment | expanded
  // 数据：question, hexagramResult, judgment, interpretation
}
```

- 未登录 → 显示"请先登录" + 跳转按钮（用 `useAuth` hook）
- 已登录 → 完整流程

### 2. `QuestionInput.tsx`

```
       请默念你所问之事

  ┌─────────────────────────────────┐
  │                                 │
  │  （输入框，无边框，底部单线）      │
  │                                 │
  └─────────────────────────────────┘
        0/200          [开始摇卦]
```

- 输入框：透明底，底部 1px ink-light 线，focus 时线变金色
- placeholder："例如：我今年的事业发展如何？"
- 字数限制 200，实时显示计数
- 按钮：金色描边，disabled 时灰色
- 输入为空时按钮 disabled

### 3. `TurtleShake.tsx` — 摇龟壳动画

状态：`SHAKING`

```
         （龟壳 SVG 或 CSS 图形）

     摇晃中...  |   铜钱落地...

  ○  ○  ○      ○  ○  ○      ○  ○  ○
   初爻         二爻           三爻
```

- 龟壳：三个椭圆叠放，CSS 绘制（不用图片），深棕色
- 动画：Framer Motion `animate={{ rotate: [0, -15, 15, -10, 10, 0] }}` 循环 2~3 次，持续约 2 秒
- 摇晃结束后龟壳淡出，铜钱开始逐一落下
- 铜钱：圆形，直径 24px，金色 `#C4A97D`，方孔
- 每枚铜钱从上方掉落（y: -100 → 0），带小弹跳
- 非交互式，纯观看动画

### 4. `HexagramReveal.tsx` — 卦象逐行动画

状态：`REVEALING`

```
              卦象

         ═══════════  上爻（第六爻）
         ═══════════  五爻
     ✧   ═══╪  ═══  四爻  ← 变爻（高亮）
         ═══╪  ═══  三爻
         ═══════════  二爻
         ═══╪  ═══  初爻（第一爻）
```

规则：
- 从初爻到上爻逐行显示，每行间隔 0.8s
- 阳爻：连续横线，宽度 80px，高度 6px，圆角 3px，颜色 ink
- 阴爻：两段横线，中间缺口 16px，每段 32px
- 变爻：线颜色变为金色 + 左侧出现小圆点标记（6px 金点）
- 每行出现动画：`opacity: 0→1` + `translateX: -20→0`，持续 0.5s
- 六行全部展示后，如果存在变爻：
  - 变爻先闪烁 2 次（0.2s 金色 → ink → 金色），然后固定为金色
  - 之卦在右侧渐显（opacity 0→0.6，1s），字号小一号
- 卦名显示在本卦下方

### 5. `JudgmentCard.tsx` — 判词展示

状态：`AWAITING` → `JUDGMENT`

**等待态：**
```
       ┌─────────────────────┐
       │                     │
       │   ⋯ 推演天机 ⋯      │
       │                     │
       └─────────────────────┘
```
- 三点脉冲动画（依次亮起，间隔 0.6s），金色
- 卡片：diviner 底色，居中

**判词出现：**
- 判词逐字浮现（typewriter 效果）
  - 每个字 `opacity: 0→1` + 轻微上浮 4px，持续 0.1s/字
  - 非等速：标点停顿稍长，关键卦名停留更久
- 判词用 serif 字体，字号 20px，行高 2.0，颜色 ink
- 卡片上方显示卦名 + 稀有度标签
  - 稀有度 N：无特效，灰色标签
  - 稀有度 R：无特效
  - 稀有度 SR：标签带暗金描边
  - 稀有度 SSR：标签金色 + 卡片边缘出现微弱的金光 glow
- 判词下方两个按钮：
  - `[查看详细解读]` — 展开解卦
  - `[再次占卜]` — 回到 IDLE 状态（清除当前结果）
  - 按钮并排，间距 24px

### 6. `InterpretationSection.tsx` — 解卦展开

状态：`EXPANDED`

- 点击"查看详细解读" → 动画展开（`max-height: 0→auto`，300ms）
  - 同时调 `GET /api/divination/{id}/interpretation`
  - 加载中显示"解读中..."
- 解读内容分三段渲染：
  ```
  【直接回答】
  ...
  【卦象与变爻分析】
  ...
  【务实建议】
  ...
  ```
- 每段标题用 serif + ink color，正文用 font-body + ink-light
- 段间距 24px
- 爻辞原文用金色高亮（`《爻辞》` 格式）
- 展开后显示"[收起]"按钮

---

## 三、稀有度特效

| 稀有度 | 特效 |
|--------|------|
| N | 无 |
| R | 无（默认） |
| SR | 判词卡片顶部出现暗金色细线 border-top |
| SSR | 卡片边缘金光粒子飘散（CSS animation）+ border 金色 + 判词标题"✨"前缀 |

SSR 粒子动画：CSS 伪元素 + `@keyframes`，4~6 个金色小圆点从卡片底部飘起，`opacity: 0→0.6→0`，`translateY: 0→-60px`，`scale: 0→1→0`，持续 3s 后消失。纯 CSS，不引入粒子库。

---

## 四、API 调用

本页面需要调用：
- `POST /api/divination` — 起卦 + 判词
- `GET /api/divination/{id}/interpretation` — 解卦

调用时机：
- 摇卦动画中途（铜钱落下时）发 POST，不阻塞动画
- 判词在 AWAITING 状态等待 POST 返回
- 解读在用户点击时才调 GET（懒加载）

错误处理：
- 网络错误：显示"网络连接异常，请稍后重试"，保留卦象（如果已返回）
- LLM 失败：卦象正常显示，判词位置显示"天机未明，请稍后再试"，可点击解读

---

## 五、无 API 时的降级模式

后端可能不在本地运行。为方便前端开发，创建 `lib/mock.ts`：

```typescript
// 模拟 API 响应，前端开发时使用
export async function mockDivination(question: string) {
  // 随机选一个卦象 + 固定判词
  // 延迟 1~2 秒模拟网络
}
```

- 环境变量 `NEXT_PUBLIC_MOCK_API=true` 时使用 mock
- 默认 false，调真实 API

---

## 六、约束

- 所有动画使用 Framer Motion，朴素克制
- 无音效（后续再加）
- 铜钱和龟壳用 CSS 绘制，不引入图片/SVG 资源
- 移动端：龟壳动画缩放适配，判词字号缩小到 18px
- 占卜过程中禁用浏览器后退（用 `beforeunload` 事件提示）

---

## 输出

- `frontend/src/app/divination/page.tsx`（覆盖占位）
- `frontend/src/components/divination/QuestionInput.tsx`
- `frontend/src/components/divination/TurtleShake.tsx`
- `frontend/src/components/divination/HexagramReveal.tsx`
- `frontend/src/components/divination/JudgmentCard.tsx`
- `frontend/src/components/divination/InterpretationSection.tsx`
- `frontend/src/components/divination/RarityEffect.tsx`
- `frontend/src/lib/mock.ts`

---

## 完成标准

- [ ] 输入问题 → 摇卦动画 → 卦象逐行显示 → 判词浮现 全流程可走通
- [ ] 变爻高亮 + 之卦显示
- [ ] SSR/SR 稀有度特效区别可见
- [ ] 判词逐字 typewriter 效果
- [ ] 点击"详细解读"展开白话解卦
- [ ] 可再次占卜（回到 IDLE）
- [ ] 移动端布局正常
- [ ] Mock 模式下后端未启动也能跑通全流程
