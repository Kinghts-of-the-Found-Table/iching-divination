"""认证 API 路由。

提供用户注册、登录、token 刷新三个端点。
"""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 简单邮箱正则
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
# 手机号正则：1 开头 11 位数字
_PHONE_RE = re.compile(r"^1\d{10}$")


class RegisterRequest(BaseModel):
    """注册请求体。"""

    email: str | None = None
    phone: str | None = None
    password: str


class LoginRequest(BaseModel):
    """登录请求体。"""

    email: str | None = None
    phone: str | None = None
    password: str


class TokenResponse(BaseModel):
    """令牌响应体。"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """刷新令牌请求体。"""

    refresh_token: str


def _validate_email(email: str) -> bool:
    """简单邮箱格式校验。"""
    return _EMAIL_RE.match(email) is not None


def _validate_password(password: str) -> bool:
    """密码至少 6 位。"""
    return len(password) >= 6


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新用户。

    支持邮箱或手机号注册，至少提供一个。
    """
    # 至少提供一个
    if not req.email and not req.phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="邮箱和手机号至少填写一个")
    # 格式校验
    if req.email and not _validate_email(req.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="邮箱格式不正确")
    if req.phone and not _PHONE_RE.match(req.phone):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="手机号格式不正确（1开头11位数字）")
    if not _validate_password(req.password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="密码长度至少 6 位")

    # 检查邮箱是否已注册
    if req.email:
        existing = await db.execute(select(User).where(User.email == req.email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="该邮箱已被注册")
    # 检查手机号是否已注册
    if req.phone:
        existing = await db.execute(select(User).where(User.phone == req.phone))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="该手机号已被注册")

    # 创建用户
    user = User(
        email=req.email,
        phone=req.phone,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 生成令牌
    user_id_str = str(user.id)
    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录。

    支持邮箱或手机号登录，至少提供一个。
    """
    if not req.email and not req.phone:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="邮箱和手机号至少填写一个")

    # 按邮箱或手机号查找
    if req.email:
        result = await db.execute(select(User).where(User.email == req.email))
    else:
        result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(req.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="邮箱或密码错误")

    user_id_str = str(user.id)
    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    """刷新 access token。

    使用 refresh token 换取新的 access token。

    Args:
        req: 刷新请求，含 refresh_token。

    Returns:
        TokenResponse: 新的 access_token + refresh_token。

    Raises:
        HTTPException 401: refresh_token 无效或过期。
    """
    payload = decode_token(req.refresh_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 refresh token",
        )

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 refresh token",
        )

    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )
