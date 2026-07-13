"""FastAPI 应用入口。

六爻占卜 API 服务，提供摇卦、判词、翻译等功能。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.auth.router import router as auth_router
from app.divination.router import router as divination_router
from app.translation.router import router as translation_router
from app.user.router import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理。

    启动时初始化数据库（自动建表）。
    """
    await init_db()
    yield


app = FastAPI(
    title="六爻占卜 API",
    description="I Ching Divination API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 中间件：开发阶段允许所有来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册认证路由
app.include_router(auth_router)

# 注册占卜路由
app.include_router(divination_router)

# 注册翻译路由
app.include_router(translation_router)

# 注册用户路由
app.include_router(user_router)


@app.get("/api/health")
async def health():
    """健康检查端点。

    Returns:
        dict: 包含 status 和 version 的 JSON 响应。
    """
    return {"status": "ok", "version": "0.1.0"}
