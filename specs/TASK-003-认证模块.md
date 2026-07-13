# TASK-003：用户认证模块

- **任务ID**：TASK-003
- **依赖**：TASK-002（项目骨架已完成）
- **工作目录**：`iching-divination/backend/app/auth/`
- **输出文件**：`models.py`、`security.py`、`router.py`

---

## 背景

用户通过邮箱+密码注册登录，获取 JWT token 后调用需要认证的 API。本模块提供注册、登录、token 刷新三个端点。

---

## 要求

### 1. `models.py` — 数据模型

```python
from app.database import Base
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    subscription = Column(String, default="free")  # free / monthly / yearly
    created_at = Column(DateTime, server_default=func.now())
```

- 使用 uuid4 作主键
- email 唯一且建索引
- 密码只存 bcrypt 哈希
- subscription 枚举：`free`、`monthly`、`yearly`

### 2. `security.py` — 密码与 JWT

```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str: ...
def verify_password(plain: str, hashed: str) -> bool: ...

def create_access_token(user_id: str) -> str:
    """生成 JWT，有效期从 settings 读取"""

def create_refresh_token(user_id: str) -> str:
    """生成 refresh token，有效期 7 天"""

def decode_token(token: str) -> dict | None:
    """解码 JWT，失败返回 None"""
```

- `create_access_token` 的 `sub` 字段存 user_id 字符串
- token 过期时间从 `settings.JWT_EXPIRE_MINUTES` 读取
- `decode_token` 捕获 `JWTError` 返回 None（不抛异常）

### 3. `router.py` — API 路由

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(email: str, password: str, db: AsyncSession = Depends(get_db)):
    """
    注册新用户。
    - email 格式校验（简单正则）
    - 密码至少 6 位
    - 邮箱已注册返回 409
    - 成功返回 access_token + refresh_token
    """

@router.post("/login")
async def login(email: str, password: str, db: AsyncSession = Depends(get_db)):
    """
    用户登录。
    - 邮箱不存在返回 401
    - 密码错误返回 401
    - 成功返回 access_token + refresh_token
    """

@router.post("/refresh")
async def refresh(refresh_token: str):
    """
    刷新 access token。
    - refresh_token 无效或过期返回 401
    - 成功返回新的 access_token
    """
```

#### 请求/响应格式

使用 Pydantic models 封装（定义在 `router.py` 中即可，无需单独文件）：

```python
from pydantic import BaseModel, EmailStr

class RegisterRequest(BaseModel):
    email: str       # EmailStr 在 MVP 可先不用（减少依赖），用 str + 简单正则
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

### 4. 认证依赖注入

在 `security.py` 中额外提供：

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """从 Bearer token 中解析当前用户，token 无效或用户不存在返回 401"""
```

这个函数供后续 TASK-005 等模块使用。

---

## 约束

- 密码用 bcrypt 哈希，不存明文
- JWT payload 不含密码或敏感信息（只存 user_id 和 exp）
- 错误信息不要暴露"邮箱不存在"和"密码错误"的区别（统一返回"邮箱或密码错误"）
- 类型注解完整
- docstring 用中文

---

## 自测

```bash
# 注册
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 重复注册应返回 409
# 错误密码应返回 401
```

---

## 输出

- `backend/app/auth/__init__.py` — 可能已有空文件，覆盖为空或保持
- `backend/app/auth/models.py`
- `backend/app/auth/security.py`
- `backend/app/auth/router.py`

---

## 完成标准

- [ ] 注册成功返回 token
- [ ] 登录成功返回 token
- [ ] 重复邮箱注册返回 409
- [ ] 错误密码返回 401
- [ ] refresh token 可刷新 access token
- [ ] `get_current_user` 依赖注入可用
- [ ] 重启服务后 token 仍然有效（JWT 无状态）
