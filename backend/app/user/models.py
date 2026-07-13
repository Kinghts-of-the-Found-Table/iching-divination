"""用户模块数据模型。

定义每日占卜配额表 DailyQuota。
"""

import uuid

from sqlalchemy import Column, Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class DailyQuota(Base):
    """每日占卜配额表。

    记录每个用户每天的占卜次数，用于免费用户限流。
    user_id + date 组合唯一，确保每天只有一条记录。

    Attributes:
        id: UUID v4 主键。
        user_id: 外键关联 users 表。
        date: 日期。
        count: 当日已使用次数。
    """

    __tablename__ = "daily_quotas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    count = Column(Integer, default=0)

    __table_args__ = (UniqueConstraint("user_id", "date"),)
