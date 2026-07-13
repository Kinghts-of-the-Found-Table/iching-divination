# TASK-009：认证页面 + Dashboard

- **任务ID**：TASK-009
- **依赖**：TASK-007（前端骨架 ✅）、TASK-008（占卜流程 ✅）、后端认证 API ✅
- **工作目录**：`iching-divination/frontend/src/app/login/` `register/` `dashboard/`

---

## 背景

实现登录、注册页面和用户仪表盘。连接真实后端 API，替换当前的占位页面。完成后整个 MVP 前后端链路闭环。

---

## 一、登录页 `login/page.tsx`

```
         ┌──────────────────────┐
         │                      │
         │       六 爻           │
         │      登 录            │
         │                      │
         │  ┌──────────────────┐│
         │  │ 邮箱              ││
         │  └──────────────────┘│
         │  ┌──────────────────┐│
         │  │ 密码              ││
         │  └──────────────────┘│
         │                      │
         │    [登 录]            │
         │                      │
         │  还没有账号？去注册 →  │
         │                      │
         └──────────────────────┘
```

- 卡片居中，宽度 400px
- 标题"六爻"serif 36px，"登录"font-body 18px ink-light
- 输入框与 QuestionInput 同风格：透明底 + 底部单线
- 密码框带显示/隐藏切换按钮（眼睛图标，lucide-react）
- 表单校验：邮箱格式 + 密码非空
- 登录成功 → 存 token 到 localStorage → 跳转 `/dashboard`
- 登录失败 → 显示错误信息（"邮箱或密码错误"），保留输入内容
- 加载态：按钮显示"登录中..."+ disabled
- 链接"去注册"→ `/register`

### `useAuth` hook 增强

```typescript
// hooks/useAuth.ts 需要完善：
export function useAuth() {
  // 返回：
  // - user: { email, subscription } | null
  // - token: string | null
  // - isLoading: boolean
  // - isLoggedIn: boolean
  // - login(email, password): Promise<void>
  // - register(email, password): Promise<void>
  // - logout(): void
  // - checkAuth(): void  // 页面加载时从 localStorage 恢复
}
```

- token 存 localStorage，key 为 `iching_token`
- `checkAuth()` 通过 `GET /api/user/profile` 验证 token 有效性
- 401 → 清除 token，用户变未登录

## 二、注册页 `register/page.tsx`

与登录页结构相同，多了确认密码字段。

```
  邮箱    ┌──────────────────┐
          └──────────────────┘
  密码    ┌──────────────────┐
          └──────────────────┘
  确认密码 ┌──────────────────┐
          └──────────────────┘
          [注 册]
   已有账号？去登录 →
```

- 校验：邮箱格式 + 密码 ≥ 6 位 + 两次密码一致
- 注册成功 → 自动登录 → 跳转 `/dashboard`
- 注册失败（如邮箱已注册）→ 显示错误信息
- 链接"去登录"→ `/login`

## 三、Dashboard `dashboard/page.tsx`

```
  ┌─────────────────────────────────────────┐
  │  我的占卜                                │
  │                                         │
  │  ┌──────────┐  ┌──────────┐             │
  │  │ 今日剩余  │  │ 累计占卜  │             │
  │  │    2     │  │    15    │             │
  │  │  / 3 次  │  │    次    │             │
  │  └──────────┘  └──────────┘             │
  │                                         │
  │  [开始占卜]  → 跳转 /divination          │
  │                                         │
  ├─────────────────────────────────────────┤
  │  最近占卜                                │
  │                                         │
  │  ┌─────────────────────────────────────┐│
  │  │ 泽火革 → 雷泽归妹          SR      ││
  │  │ "泽火相激革故鼎..."       2小时前   ││
  │  │                          [查看]    ││
  │  └─────────────────────────────────────┘│
  │  ┌─────────────────────────────────────┐│
  │  │ 火风鼎 → 天风姤            R       ││
  │  │ "鼎沸薪传火..."           3小时前   ││
  │  │                          [查看]    ││
  │  └─────────────────────────────────────┘│
  │                                         │
  │          查看全部历史 →                  │
  └─────────────────────────────────────────┘
```

- 顶部用户信息区：
  - 问候语："你好"（不显示邮箱全称，隐私考虑）
  - 退出登录按钮（右上角，小字）
- 统计卡片：
  - 调 `GET /api/user/quota` 拿剩余次数
  - 累计占卜次数从 history API 的 total 拿
  - 付费用户显示"无限次" + 皇冠图标（lucide Crown）
- "开始占卜"按钮 → `/divination`
- 最近 5 条占卜记录：
  - 调 `GET /api/divination?page=1&limit=5`
  - 每条显示：卦名（本卦→之卦）、判词首句截断（20 字）、稀有度标签、时间（相对时间："2小时前"）
  - 点击 `[查看]` → 跳转占卜详情（暂时没有详情页，可以先 alert 或跳转到 `/divination?id=xxx`）
- "查看全部历史" → 暂时可以是 `/divination` 或后续做历史页

### 401 处理

- 页面加载时调 `checkAuth()`
- 未登录 → `router.push('/login')`
- 显示 loading 态直到认证检查完成

---

## 四、路由守卫（可选，手动实现即可）

不需要中间件。三个需要登录的页面（dashboard、divination）各自在 `useEffect` 中调 `checkAuth()`，未登录就 redirect。

---

## 五、约束

- 表单验证在前端做一遍，后端也会做（不需要重复提交无效数据）
- 密码不显示明文，切换按钮用 lucide-react 的 `Eye` / `EyeOff`
- 错误信息用红色文字（柔和红，不是亮红），位置在表单上方
- 移动端卡片宽度自适应（max-w-[400px] w-full px-4）
- 页面切换无闪烁（SSR 时显示 loading 骨架，客户端 hydrate 后显示真实内容）

---

## 输出

- `frontend/src/hooks/useAuth.ts`（重写，完整实现）
- `frontend/src/app/login/page.tsx`（覆盖占位）
- `frontend/src/app/register/page.tsx`（覆盖占位）
- `frontend/src/app/dashboard/page.tsx`（覆盖占位）
- `frontend/src/lib/api.ts`（如需要微调）

---

## 完成标准

- [ ] 注册 → 自动登录 → 跳转 Dashboard
- [ ] 登录 → 跳转 Dashboard
- [ ] 错误密码显示"邮箱或密码错误"
- [ ] 重复邮箱注册显示"该邮箱已被注册"
- [ ] Dashboard 显示今日剩余次数和最近占卜
- [ ] 退出登录清 token 并跳转首页
- [ ] 未登录访问 /dashboard 自动跳转 /login
- [ ] 移动端布局正常
