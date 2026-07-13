# TASK-002：后端项目骨架

- **任务ID**：TASK-002
- **依赖**：无
- **工作目录**：`iching-divination/backend/`
- **输出文件**：见下方清单

---

## 背景

搭建 FastAPI 后端的最小可运行骨架，包含配置系统、数据库初始化、健康检查端点。后续所有模块（认证、占卜、翻译）都基于这个骨架扩展。

---

## 要求

### 1. 目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              ← FastAPI 入口
│   ├── config.py            ← 配置管理
│   ├── database.py          ← SQLAlchemy 初始化
│   │
│   ├── auth/
│   │   └── __init__.py
│   ├── divination/
│   │   └── __init__.py
│   ├── translation/
│   │   └── __init__.py
│   ├── user/
│   │   └── __init__.py
│   └── llm/
│       └── __init__.py
│
├── tests/
│   └── __init__.py
│
├── requirements.txt
└── .env.example
```

所有 `__init__.py` 文件可为空，但必须存在。

### 2. `config.py` — 配置管理

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "sqlite:///./iching.db"
    
    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 小时
    
    # LLM
    LLM_API_KEY: str = ""             # DeepSeek API Key
    LLM_API_BASE: str = "https://api.deepseek.com/v1"
    LLM_MODEL: str = "deepseek-chat"
    
    # 每日免费次数
    FREE_DAILY_LIMIT: int = 3
    
    # 服务
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"

settings = Settings()
```

- 类型注解完整
- 所有值有合理默认值
- LLM_API_KEY 默认为空字符串（无 key 时服务能启动，但 LLM 调用会报明确错误）

### 3. `database.py` — 数据库

- 使用 SQLAlchemy 2.0 异步风格（`AsyncSession`）
- 引擎用 `aiosqlite`
- 提供 `get_db()` 依赖注入函数
- 提供 `init_db()` 函数：创建所有表（当前为空，后续任务会添加模型）
- `Base = declarative_base()`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

engine = create_async_engine(
    settings.DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///"),
    echo=settings.DEBUG,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### 4. `main.py` — 入口

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    await init_db()
    yield

app = FastAPI(
    title="六爻占卜 API",
    description="I Ching Divination API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS（开发阶段允许所有来源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
```

### 5. `requirements.txt`

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy[asyncio]==2.0.*
aiosqlite==0.20.*
pydantic-settings==2.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
httpx==0.28.*
```

版本号精确到 minor，用 `*` 允许 patch 更新。全部使用目前 2026 年 7 月最新的稳定版本。

### 6. `.env.example`

```
# 数据库
DATABASE_URL=sqlite:///./iching.db

# JWT（生产环境务必修改）
JWT_SECRET=your-secret-key-here

# LLM API
LLM_API_KEY=your-deepseek-api-key
LLM_API_BASE=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# 服务
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

---

## 约束

- Python 3.12
- 异步 FastAPI 风格（async/await）
- 所有函数包含类型注解
- docstring 用中文
- 代码需可直接运行：安装依赖后 `uvicorn app.main:app --reload` 能启动，`/api/health` 返回 200

---

## 输出

### 源文件清单
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/app/config.py`
- `backend/app/database.py`
- `backend/app/auth/__init__.py`
- `backend/app/divination/__init__.py`
- `backend/app/translation/__init__.py`
- `backend/app/user/__init__.py`
- `backend/app/llm/__init__.py`
- `backend/tests/__init__.py`
- `backend/requirements.txt`
- `backend/.env.example`

### 自测验证
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app &
curl http://localhost:8000/api/health
```

---

## 完成标准

- [ ] 目录结构完整，所有 `__init__.py` 存在
- [ ] `uvicorn app.main:app` 可启动
- [ ] `GET /api/health` 返回 `{"status": "ok", "version": "0.1.0"}`
- [ ] 数据库初始化不报错（SQLite 文件自动创建）
- [ ] `requirements.txt` 所有依赖可正常安装
- [ ] `.env.example` 格式正确且不包含真实密钥
