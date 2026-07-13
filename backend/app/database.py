"""数据库初始化模块。

使用 SQLAlchemy 2.0 异步风格，引擎使用 aiosqlite。
提供依赖注入函数 get_db() 和表创建函数 init_db()。
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基类。"""

    pass


# 创建异步引擎，将 sqlite:/// 替换为 sqlite+aiosqlite:///
engine = create_async_engine(
    settings.DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///"),
    echo=settings.DEBUG,
)

# 异步会话工厂
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """FastAPI 依赖注入：获取数据库会话。

    用法：
        @app.get("/some-path")
        async def handler(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session() as session:
        yield session


async def init_db():
    """初始化数据库：创建所有 ORM 模型对应的表。

    当前暂无模型定义，后续任务添加模型后此函数会自动建表。
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
