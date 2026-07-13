"""用户 API 路由。

提供用户信息查询和配额查看端点。
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import get_current_user
from app.config import settings
from app.database import get_db
from app.user.quota import get_remaining_quota

router = APIRouter(prefix="/api/user", tags=["user"])


# =============================================================================
# 响应模型
# =============================================================================


class ProfileResponse(BaseModel):
    """用户信息响应体。"""

    email: str
    subscription: str
    daily_remaining: int  # -1 表示无限制（付费用户）
    daily_limit: int


class QuotaResponse(BaseModel):
    """配额信息响应体。"""

    remaining: int   # -1 表示无限制（付费用户）
    limit: int
    is_premium: bool


# =============================================================================
# API 端点
# =============================================================================


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户信息和今日剩余占卜次数。

    Args:
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        ProfileResponse: 邮箱、订阅类型、剩余次数、每日上限。
    """
    remaining = await get_remaining_quota(current_user, db)

    return ProfileResponse(
        email=current_user.email,
        subscription=current_user.subscription,
        daily_remaining=remaining,
        daily_limit=settings.FREE_DAILY_LIMIT,
    )


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """仅返回配额信息。

    Args:
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        QuotaResponse: 剩余次数、每日上限、是否付费用户。
    """
    remaining = await get_remaining_quota(current_user, db)
    is_premium = current_user.subscription != "free"

    return QuotaResponse(
        remaining=remaining,
        limit=settings.FREE_DAILY_LIMIT,
        is_premium=is_premium,
    )
