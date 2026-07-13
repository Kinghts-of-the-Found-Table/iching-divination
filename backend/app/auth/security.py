"""认证安全模块。

提供密码哈希、JWT 令牌生成/解码，以及 FastAPI 认证依赖注入。
"""

from datetime import datetime, timedelta
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.auth.models import User

# HTTP Bearer 认证方案
security_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希。

    Args:
        password: 用户输入的明文密码。

    Returns:
        bcrypt 哈希后的密码字符串。
    """
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码是否匹配哈希值。

    Args:
        plain: 用户输入的明文密码。
        hashed: 数据库中存储的 bcrypt 哈希。

    Returns:
        密码匹配返回 True，否则返回 False。
    """
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    """生成 JWT access token。

    Args:
        user_id: 用户的 UUID 字符串。

    Returns:
        编码后的 JWT 字符串，含 sub 和 exp 字段。
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """生成 refresh token，有效期 7 天。

    Args:
        user_id: 用户的 UUID 字符串。

    Returns:
        编码后的 JWT 字符串。
    """
    expire = datetime.utcnow() + timedelta(days=7)
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """解码 JWT，失败返回 None（不抛异常）。

    Args:
        token: JWT 字符串。

    Returns:
        解码后的 payload 字典，解码失败返回 None。
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """从 Bearer token 中解析当前用户。

    供后续任务（如 TASK-005）的路由依赖注入使用。

    Args:
        credentials: HTTP Bearer 认证头中的凭据。
        db: 数据库异步会话。

    Returns:
        当前登录的 User ORM 对象。

    Raises:
        HTTPException 401: token 无效、过期或用户不存在。
    """
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    # 查询用户是否存在
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    return user
