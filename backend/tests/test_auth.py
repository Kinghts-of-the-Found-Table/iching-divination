"""认证模块单元测试。

测试密码哈希、JWT 令牌生成/解码、注册/登录/刷新 API 端点。
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.models import User
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.main import app


class TestPasswordHashing:
    """密码哈希测试。"""

    def test_hash_and_verify(self):
        """测试哈希后再验证能通过。"""
        plain = "mySecureP@ss123"
        hashed = hash_password(plain)
        assert hashed != plain
        assert verify_password(plain, hashed)

    def test_wrong_password_fails(self):
        """测试错误密码校验失败。"""
        hashed = hash_password("correct")
        assert not verify_password("wrong", hashed)

    def test_same_password_different_hashes(self):
        """测试同一密码两次哈希结果不同（随机 salt）。"""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2
        assert verify_password("same", h1)
        assert verify_password("same", h2)


class TestJWT:
    """JWT 令牌测试。"""

    def test_create_and_decode_access_token(self):
        """测试创建并解码 access token。"""
        uid = str(uuid.uuid4())
        token = create_access_token(uid)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == uid
        assert "exp" in payload

    def test_create_and_decode_refresh_token(self):
        """测试创建并解码 refresh token。"""
        uid = str(uuid.uuid4())
        token = create_refresh_token(uid)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == uid

    def test_decode_invalid_token(self):
        """测试解码无效 token 返回 None。"""
        assert decode_token("not.a.valid.jwt") is None
        assert decode_token("") is None

    def test_incorrect_signature(self):
        """测试错误签名 token 解码失败。"""
        from app.config import settings

        from jose import jwt as jose_jwt

        # 用错误密钥签名
        bad_token = jose_jwt.encode(
            {"sub": "test", "exp": 9999999999},
            "wrong-secret-key",
            algorithm=settings.JWT_ALGORITHM,
        )
        assert decode_token(bad_token) is None


class TestAuthAPI:
    """认证 API 端点集成测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.fixture
    def unique_email(self):
        """生成唯一测试邮箱。"""
        return f"test-{uuid.uuid4().hex[:8]}@example.com"

    @pytest.mark.asyncio
    async def test_register_success(self, client, unique_email):
        """测试注册成功返回 201 和 tokens。"""
        resp = await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_register_duplicate_409(self, client, unique_email):
        """测试重复注册返回 409。"""
        # 第一次注册
        await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        # 第二次注册同一邮箱
        resp = await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        assert resp.status_code == 409
        assert "已被注册" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_email_400(self, client):
        """测试无效邮箱返回 400。"""
        resp = await client.post(
            "/api/auth/register",
            json={"email": "not-an-email", "password": "123456"},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_register_short_password_400(self, client, unique_email):
        """测试短密码返回 400。"""
        resp = await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "12345"},
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_login_success(self, client, unique_email):
        """测试登录成功返回 tokens。"""
        # 先注册
        await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        # 再登录
        resp = await client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "123456"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password_401(self, client, unique_email):
        """测试错误密码登录返回 401。"""
        # 先注册
        await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        # 错误密码登录
        resp = await client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "wrong-password"},
        )
        assert resp.status_code == 401
        assert "邮箱或密码错误" == resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_email_401(self, client):
        """测试不存在邮箱登录返回 401（信息不区分）。"""
        resp = await client.post(
            "/api/auth/login",
            json={"email": "noone@example.com", "password": "123456"},
        )
        assert resp.status_code == 401
        assert "邮箱或密码错误" == resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_refresh_success(self, client, unique_email):
        """测试 token 刷新成功。"""
        # 注册获取 refresh token
        resp = await client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "123456"},
        )
        refresh_token = resp.json()["refresh_token"]

        # 刷新
        resp = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_invalid_token_401(self, client):
        """测试无效 refresh token 返回 401。"""
        resp = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        assert resp.status_code == 401
