"""认证模块数据模型。

定义 User ORM 模型，使用 UUID 主键和 bcrypt 密码哈希。
"""

import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class User(Base):
    """用户模型。

    Attributes:
        id: UUID v4 主键。
        email: 邮箱，唯一且建索引。
        password_hash: bcrypt 哈希后的密码。
        subscription: 订阅类型（free / monthly / yearly）。
        created_at: 注册时间。
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    subscription = Column(String, default="free")  # free / monthly / yearly
    created_at = Column(DateTime, server_default=func.now())
