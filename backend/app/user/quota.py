"""配额管理辅助函数。

供 divination 和 user 路由共用的配额检查、扣减、查询逻辑。
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import settings
from app.user.models import DailyQuota


async def check_quota(user: User, db: AsyncSession) -> bool:
    """检查用户今日是否还有剩余占卜次数。

    付费用户（monthly / yearly）始终返回 True。
    免费用户检查当日已使用次数是否低于 FREE_DAILY_LIMIT。

    Args:
        user: 当前用户。
        db: 数据库异步会话。

    Returns:
        True 表示有剩余次数，False 表示已用完。
    """
    if user.subscription != "free":
        return True

    today = date.today()
    result = await db.execute(
        select(DailyQuota).where(
            DailyQuota.user_id == user.id,
            DailyQuota.date == today,
        )
    )
    quota = result.scalar_one_or_none()
    current = quota.count if quota else 0
    return current < settings.FREE_DAILY_LIMIT


async def get_remaining_quota(user: User, db: AsyncSession) -> int:
    """获取用户今日剩余占卜次数。

    Args:
        user: 当前用户。
        db: 数据库异步会话。

    Returns:
        剩余次数。付费用户返回 -1 表示无限制。
    """
    if user.subscription != "free":
        return -1

    today = date.today()
    result = await db.execute(
        select(DailyQuota).where(
            DailyQuota.user_id == user.id,
            DailyQuota.date == today,
        )
    )
    quota = result.scalar_one_or_none()
    current = quota.count if quota else 0
    return max(0, settings.FREE_DAILY_LIMIT - current)


async def deduct_quota(user: User, db: AsyncSession) -> None:
    """扣减用户今日占卜次数。

    付费用户不扣减。免费用户在 DailyQuota 中增加计数，
    若当天尚无记录则创建。

    Args:
        user: 当前用户。
        db: 数据库异步会话。
    """
    if user.subscription != "free":
        return

    today = date.today()
    result = await db.execute(
        select(DailyQuota).where(
            DailyQuota.user_id == user.id,
            DailyQuota.date == today,
        )
    )
    quota = result.scalar_one_or_none()

    if quota is None:
        quota = DailyQuota(user_id=user.id, date=today, count=1)
        db.add(quota)
    else:
        quota.count += 1

    await db.commit()
