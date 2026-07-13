# TASK-005：占卜 API + 翻译 API + 配额管理

- **任务ID**：TASK-005
- **依赖**：TASK-001（排盘引擎）✅、TASK-003（认证）✅、TASK-004（LLM）✅、TASK-002（骨架）✅
- **工作目录**：`iching-divination/backend/app/divination/` + `backend/app/translation/` + `backend/app/user/`

---

## 背景

这是后端核心链路：用户提问 → 起卦 → 生成判词 → 保存记录 → 扣减配额。同时提供翻译端点和配额查询。

---

## 要求

### 1. 数据模型

#### `divination/models.py`

```python
class Reading(Base):
    __tablename__ = "readings"
    
    id = Column(UUID, primary_key, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    question = Column(String, nullable=False)
    
    # 卦象
    hexagram_orig_name = Column(String, nullable=False)
    hexagram_orig_lines = Column(String(6), nullable=False)  # "788977"
    changing_lines = Column(JSON, default=[])                 # [2, 4]
    hexagram_trans_name = Column(String, nullable=True)       # 静卦时为 null
    hexagram_mutual_name = Column(String, nullable=False)
    rarity = Column(String, default="R")
    
    # 判词
    judgment_cn = Column(Text, nullable=True)   # LLM 返回后填充
    
    # 翻译缓存
    translations = Column(JSON, default={})     # {"en": "...", "ja": "..."}
    
    created_at = Column(DateTime, server_default=func.now())
```

#### `user/models.py`

```python
class DailyQuota(Base):
    __tablename__ = "daily_quotas"
    
    id = Column(UUID, primary_key, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    count = Column(Integer, default=0)
    
    __table_args__ = (UniqueConstraint("user_id", "date"),)
```

### 2. 占卜 API `divination/router.py`

```python
router = APIRouter(prefix="/api/divination", tags=["divination"])

@router.post("")
async def create_divination(
    request: DivinationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    起卦并生成判词。
    
    流程：
    1. 检查今日配额（免费用户 3 次/天，付费用户不限）
    2. 调用排盘引擎 cast_hexagram()
    3. 保存 Reading 记录（judgment_cn 暂为空）
    4. 构建 prompt，调用 LLM 生成判词
    5. 更新 judgment_cn
    6. 扣减配额
    7. 返回完整结果
    
    配额不足返回 429
    LLM 调用失败时：仍返回卦象信息，judgment_cn 为 null，标注 error
    """
```

#### 请求格式

```python
class DivinationRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=200)
```

#### 响应格式

```python
class DivinationResponse(BaseModel):
    id: str
    question: str
    hexagram: dict       # 排盘结果（original / changing_lines / transformed / mutual / rarity）
    judgment_cn: str | None
    created_at: str      # ISO 格式
```

#### 配额检查逻辑

```python
async def check_quota(user: User, db: AsyncSession) -> bool:
    """检查今日剩余次数。付费用户始终返回 True。"""
    if user.subscription != "free":
        return True
    today = date.today()
    quota = await db.execute(
        select(DailyQuota).where(
            DailyQuota.user_id == user.id,
            DailyQuota.date == today,
        )
    )
    quota = quota.scalar_one_or_none()
    current = quota.count if quota else 0
    return current < settings.FREE_DAILY_LIMIT
```

### 3. 历史查询

```python
@router.get("")
async def list_divinations(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """分页获取当前用户的占卜历史，按时间倒序"""

@router.get("/{reading_id}")
async def get_divination(
    reading_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单次占卜详情。只能查看自己的。不是自己的返回 404。"""
```

### 4. 翻译 API `translation/router.py`

```python
router = APIRouter(prefix="/api/divination", tags=["translation"])

@router.get("/{reading_id}/translation")
async def get_translation(
    reading_id: str,
    lang: str = "en",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取判词翻译。
    
    - 如果 translations JSON 中已有对应语言缓存，直接返回
    - 如果没有，调用 LLM 翻译，缓存到 translations 字段，返回
    - 判词不存在时返回 400（"判词尚未生成"）
    - 不支持的语言返回 400
    """
```

### 5. 配额查询 `user/router.py`

```python
router = APIRouter(prefix="/api/user", tags=["user"])

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回用户信息和今日剩余次数"""
    # 响应：{email, subscription, daily_remaining, daily_limit}

@router.get("/quota")
async def get_quota(...):
    """仅返回配额信息：{remaining, limit, is_premium}"""
```

---

## 约束

- 所有占卜接口需要认证（Bearer token）
- 用户只能看自己的占卜记录（user_id 校验）
- 配额检查在起卦之前（先扣额度还是先起卦？先起卦再扣——避免扣了额度但起卦失败）
- LLM 调用失败不阻塞用户看到卦象（降级体验：有卦无判词）
- 类型注解完整，docstring 中文

---

## 自测

```bash
# 先注册/登录获取 token
TOKEN="Bearer xxx"

# 起卦
curl -X POST http://localhost:8000/api/divination \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"我今年的事业运势如何？"}'

# 查历史
curl http://localhost:8000/api/divinations?page=1 \
  -H "Authorization: $TOKEN"

# 查配额
curl http://localhost:8000/api/user/quota \
  -H "Authorization: $TOKEN"

# 翻译
curl "http://localhost:8000/api/divination/{id}/translation?lang=en" \
  -H "Authorization: $TOKEN"
```

---

## 输出

- `backend/app/divination/models.py`
- `backend/app/divination/router.py`（覆盖之前的空文件）
- `backend/app/user/models.py`（DailyQuota）
- `backend/app/user/router.py`
- `backend/app/translation/router.py`
- `backend/app/main.py`（注册新 router）
- `backend/tests/test_divination.py`

---

## 完成标准

- [ ] POST /api/divination 完整链路跑通：起卦 → 判词 → 扣配额
- [ ] 免费用户超限返回 429
- [ ] 付费用户不限次
- [ ] 未认证请求返回 401
- [ ] GET /api/divinations 分页正确
- [ ] GET /api/divination/{id} 只能看自己的
- [ ] GET /api/divination/{id}/translation 翻译缓存生效
- [ ] GET /api/user/profile 返回配额信息
- [ ] LLM API Key 未配置时，起卦仍返回卦象（judgment_cn=null）
