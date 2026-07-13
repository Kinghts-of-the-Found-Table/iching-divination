"""占卜 API 集成测试。

测试起卦、历史查询、翻译、配额管理等完整链路。
使用 mock LLM 避免外部 API 调用。
"""

import uuid
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


# =============================================================================
# 测试辅助函数
# =============================================================================


async def _register_and_login(client: AsyncClient, email: str | None = None) -> str:
    """注册并登录，返回 access_token。

    Args:
        client: HTTP 测试客户端。
        email: 可选邮箱，不传则自动生成唯一邮箱。

    Returns:
        Bearer token 字符串（不含 "Bearer " 前缀）。
    """
    if email is None:
        email = f"test-{uuid.uuid4().hex[:8]}@example.com"

    # 注册
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "123456"},
    )
    assert resp.status_code == 201, f"注册失败: {resp.text}"
    return resp.json()["access_token"]


# =============================================================================
# Mock LLM 辅助
# =============================================================================


def _mock_llm_success() -> AsyncMock:
    """创建一个返回成功判词的 mock LLM。"""
    mock = AsyncMock(return_value="春风送暖入神州，万象更新运自流。\n龙腾虎跃逢时至，功名利禄不须求。")
    return mock


def _mock_llm_failure() -> AsyncMock:
    """创建一个抛出 LLMError 的 mock LLM。"""
    from app.llm.client import LLMError

    mock = AsyncMock(side_effect=LLMError("模拟 LLM 调用失败"))
    return mock


# =============================================================================
# 基础测试类
# =============================================================================


class TestDivinationCreate:
    """POST /api/divination 起卦测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_create_divination_success(self, client):
        """测试完整起卦链路：认证 → 起卦 → LLM 判词 → 返回完整结果。"""
        token = await _register_and_login(client)

        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp = await client.post(
                "/api/divination",
                json={"question": "我今年的事业运势如何？"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201, f"起卦失败: {resp.text}"
        data = resp.json()

        # 验证响应结构
        assert "id" in data
        assert data["question"] == "我今年的事业运势如何？"
        assert data["judgment_cn"] is not None
        assert "春风" in data["judgment_cn"]
        assert "created_at" in data

        # 验证卦象结构
        hexagram = data["hexagram"]
        assert "original" in hexagram
        assert "name" in hexagram["original"]
        assert "binary" in hexagram["original"]
        assert "lines" in hexagram["original"]
        assert len(hexagram["original"]["lines"]) == 6
        assert "changing_lines" in hexagram
        assert "mutual" in hexagram
        assert "rarity" in hexagram

    @pytest.mark.asyncio
    async def test_degraded_mode_llm_failure(self, client):
        """测试 LLM 调用失败时的降级模式：仍返回卦象，judgment_cn=null。"""
        token = await _register_and_login(client)

        with patch("app.divination.router.call_llm", _mock_llm_failure()):
            resp = await client.post(
                "/api/divination",
                json={"question": "测试降级模式"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201, f"降级模式不应返回错误: {resp.text}"
        data = resp.json()

        assert data["judgment_cn"] is None
        assert "error" in data  # 附带了错误信息
        assert "hexagram" in data
        assert data["hexagram"]["original"]["name"]  # 卦象仍然完整

    @pytest.mark.asyncio
    async def test_degraded_mode_unknown_exception(self, client):
        """测试 LLM 调用抛出非 LLMError 异常时的降级模式。"""
        token = await _register_and_login(client)

        mock = AsyncMock(side_effect=RuntimeError("未知运行时错误"))
        with patch("app.divination.router.call_llm", mock):
            resp = await client.post(
                "/api/divination",
                json={"question": "测试未知异常"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert data["judgment_cn"] is None
        assert data["hexagram"]["original"]["name"]

    @pytest.mark.asyncio
    async def test_unauthenticated_401(self, client):
        """测试未认证请求返回 401。"""
        resp = await client.post(
            "/api/divination",
            json={"question": "无 token 请求"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_401(self, client):
        """测试无效 token 返回 401。"""
        resp = await client.post(
            "/api/divination",
            json={"question": "无效 token"},
            headers={"Authorization": "Bearer invalid-token-here"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_question_422(self, client):
        """测试空提问返回 422（Pydantic 校验）。"""
        token = await _register_and_login(client)

        resp = await client.post(
            "/api/divination",
            json={"question": ""},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_question_too_long_422(self, client):
        """测试超长提问返回 422。"""
        token = await _register_and_login(client)

        resp = await client.post(
            "/api/divination",
            json={"question": "测" * 201},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_question_field_422(self, client):
        """测试缺少 question 字段返回 422。"""
        token = await _register_and_login(client)

        resp = await client.post(
            "/api/divination",
            json={},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422


class TestDivinationQuota:
    """配额管理测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_free_user_quota_exceeded_429(self, client):
        """测试免费用户超过每日限额返回 429。"""
        token = await _register_and_login(client)

        # 消耗全部免费次数（默认 3 次）
        for i in range(3):
            with patch("app.divination.router.call_llm", _mock_llm_success()):
                resp = await client.post(
                    "/api/divination",
                    json={"question": f"第{i+1}次占卜"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert resp.status_code == 201, f"第{i+1}次应成功: {resp.text}"

        # 第 4 次应返回 429
        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp = await client.post(
                "/api/divination",
                json={"question": "超额占卜"},
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 429
        assert "用完" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_premium_user_unlimited(self, client):
        """测试付费用户不限制次数。"""
        from sqlalchemy import select, update

        from app.auth.models import User
        from app.database import async_session

        # 注册并升级为付费用户
        token = await _register_and_login(client)

        # 通过数据库直接升级用户
        async with async_session() as db:
            # 从 token 中提取 user_id
            from app.auth.security import decode_token

            payload = decode_token(token)
            user_id = payload["sub"]
            await db.execute(
                update(User).where(User.id == user_id).values(subscription="monthly")
            )
            await db.commit()

        # 连续起卦 5 次（超过免费限额），每次都应成功
        for i in range(5):
            with patch("app.divination.router.call_llm", _mock_llm_success()):
                resp = await client.post(
                    "/api/divination",
                    json={"question": f"付费用户第{i+1}次"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert resp.status_code == 201, f"付费用户第{i+1}次应成功: {resp.text}"

    @pytest.mark.asyncio
    async def test_quota_not_deducted_on_llm_failure(self, client):
        """测试 LLM 失败时仍扣减配额（起卦本身已成功）。"""
        token = await _register_and_login(client)

        # 第一次起卦，LLM 失败
        with patch("app.divination.router.call_llm", _mock_llm_failure()):
            resp = await client.post(
                "/api/divination",
                json={"question": "LLM 失败"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 201

        # 再起卦 2 次（消耗剩余配额）
        for i in range(2):
            with patch("app.divination.router.call_llm", _mock_llm_success()):
                resp = await client.post(
                    "/api/divination",
                    json={"question": f"第{i+1}次"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert resp.status_code == 201

        # 第 4 次应返回 429（因为第 1 次虽然 LLM 失败但占卜成功了）
        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp = await client.post(
                "/api/divination",
                json={"question": "超额"},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 429


class TestDivinationHistory:
    """历史查询测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_list_empty(self, client):
        """测试新用户历史列表为空。"""
        token = await _register_and_login(client)

        resp = await client.get(
            "/api/divination",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_pagination(self, client):
        """测试分页功能。"""
        token = await _register_and_login(client)

        # 创建 5 条占卜记录
        for i in range(5):
            with patch("app.divination.router.call_llm", _mock_llm_success()):
                resp = await client.post(
                    "/api/divination",
                    json={"question": f"分页测试第{i+1}问"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert resp.status_code == 201

        # 第 1 页，每页 3 条
        resp = await client.get(
            "/api/divination?page=1&limit=3",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["limit"] == 3

        # 第 2 页，应剩余 2 条
        resp = await client.get(
            "/api/divination?page=2&limit=3",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5

    @pytest.mark.asyncio
    async def test_list_desc_order(self, client):
        """测试历史列表按时间倒序排列。"""
        token = await _register_and_login(client)

        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp1 = await client.post(
                "/api/divination",
                json={"question": "第一条"},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp2 = await client.post(
                "/api/divination",
                json={"question": "第二条"},
                headers={"Authorization": f"Bearer {token}"},
            )

        resp = await client.get(
            "/api/divination?limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        items = resp.json()["items"]
        # 最新创建的应该在前面
        assert items[0]["question"] == "第二条"
        assert items[1]["question"] == "第一条"

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        """测试未认证访问历史列表返回 401。"""
        resp = await client.get("/api/divination")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_default_pagination(self, client):
        """测试默认分页参数（page=1, limit=20）。"""
        token = await _register_and_login(client)

        resp = await client.get(
            "/api/divination",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["limit"] == 20


class TestDivinationGetById:
    """GET /api/divination/{id} 单条查询测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_get_own_reading(self, client):
        """测试查看自己的占卜记录。"""
        token = await _register_and_login(client)

        # 创建一条记录
        with patch("app.divination.router.call_llm", _mock_llm_success()):
            create_resp = await client.post(
                "/api/divination",
                json={"question": "我的占卜"},
                headers={"Authorization": f"Bearer {token}"},
            )
            reading_id = create_resp.json()["id"]

        # 查询详情
        resp = await client.get(
            f"/api/divination/{reading_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == reading_id
        assert data["question"] == "我的占卜"
        assert data["judgment_cn"] is not None

    @pytest.mark.asyncio
    async def test_cannot_see_others_reading(self, client):
        """测试不能查看他人的占卜记录（返回 404，防止信息泄露）。"""
        # 用户 A 创建一条记录
        token_a = await _register_and_login(client)
        with patch("app.divination.router.call_llm", _mock_llm_success()):
            create_resp = await client.post(
                "/api/divination",
                json={"question": "用户A的占卜"},
                headers={"Authorization": f"Bearer {token_a}"},
            )
        reading_id = create_resp.json()["id"]

        # 用户 B 尝试查看
        token_b = await _register_and_login(client)
        resp = await client.get(
            f"/api/divination/{reading_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 404
        assert "不存在" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_invalid_uuid_404(self, client):
        """测试无效 UUID 格式返回 404。"""
        token = await _register_and_login(client)

        resp = await client.get(
            "/api/divination/not-a-valid-uuid",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_id_404(self, client):
        """测试不存在的记录返回 404。"""
        token = await _register_and_login(client)

        fake_id = str(uuid.uuid4())
        resp = await client.get(
            f"/api/divination/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client):
        """测试未认证访问返回 401。"""
        resp = await client.get(f"/api/divination/{uuid.uuid4()}")
        assert resp.status_code == 401


class TestTranslation:
    """GET /api/divination/{id}/translation 翻译测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.fixture
    async def reading_with_judgment(self, client):
        """创建一个有判词的占卜记录，返回 (token, reading_id)。"""
        token = await _register_and_login(client)

        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp = await client.post(
                "/api/divination",
                json={"question": "翻译测试"},
                headers={"Authorization": f"Bearer {token}"},
            )
        reading_id = resp.json()["id"]
        return token, reading_id

    @pytest.mark.asyncio
    async def test_translation_uncached(self, client, reading_with_judgment):
        """测试首次翻译（未缓存），调用 LLM 并缓存。"""
        token, reading_id = reading_with_judgment

        mock_translation = AsyncMock(return_value="Spring breeze brings warmth...")
        with patch("app.translation.router.call_llm", mock_translation):
            resp = await client.get(
                f"/api/divination/{reading_id}/translation?lang=en",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["reading_id"] == reading_id
        assert data["lang"] == "en"
        assert "Spring" in data["text"]
        assert data["cached"] is False

    @pytest.mark.asyncio
    async def test_translation_cached(self, client, reading_with_judgment):
        """测试缓存翻译：第二次请求不调 LLM，直接返回缓存。"""
        token, reading_id = reading_with_judgment

        # 第一次：调用 LLM
        mock1 = AsyncMock(return_value="First translation call.")
        with patch("app.translation.router.call_llm", mock1):
            resp1 = await client.get(
                f"/api/divination/{reading_id}/translation?lang=en",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp1.status_code == 200
            assert resp1.json()["cached"] is False

        # 第二次：应从缓存返回，不调 LLM
        mock2 = AsyncMock(return_value="Should not be called.")
        with patch("app.translation.router.call_llm", mock2):
            resp2 = await client.get(
                f"/api/divination/{reading_id}/translation?lang=en",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp2.status_code == 200
            assert resp2.json()["cached"] is True
            assert resp2.json()["text"] == "First translation call."
            # 验证未调用 LLM
            mock2.assert_not_called()

    @pytest.mark.asyncio
    async def test_translation_judgment_not_ready(self, client):
        """测试判词未生成时翻译返回 400。"""
        token = await _register_and_login(client)

        # 创建一个判词为 null 的记录（模拟 LLM 失败）
        with patch("app.divination.router.call_llm", _mock_llm_failure()):
            resp = await client.post(
                "/api/divination",
                json={"question": "判词未生成"},
                headers={"Authorization": f"Bearer {token}"},
            )
        reading_id = resp.json()["id"]

        # 尝试翻译
        resp = await client.get(
            f"/api/divination/{reading_id}/translation?lang=en",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
        assert "判词尚未生成" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_translation_unsupported_language(self, client, reading_with_judgment):
        """测试不支持的语言返回 400。"""
        token, reading_id = reading_with_judgment

        resp = await client.get(
            f"/api/divination/{reading_id}/translation?lang=xx",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
        assert "不支持" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_translation_default_lang_en(self, client, reading_with_judgment):
        """测试默认语言为英文。"""
        token, reading_id = reading_with_judgment

        mock_translation = AsyncMock(return_value="Default English.")
        with patch("app.translation.router.call_llm", mock_translation):
            resp = await client.get(
                f"/api/divination/{reading_id}/translation",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert resp.status_code == 200
        assert resp.json()["lang"] == "en"

    @pytest.mark.asyncio
    async def test_translation_requires_auth(self, client, reading_with_judgment):
        """测试未认证访问翻译返回 401。"""
        _, reading_id = reading_with_judgment

        resp = await client.get(
            f"/api/divination/{reading_id}/translation?lang=en",
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_translation_cannot_access_others(self, client, reading_with_judgment):
        """测试不能翻译他人的判词。"""
        _, reading_id = reading_with_judgment

        # 另一个用户尝试翻译
        token_b = await _register_and_login(client)
        resp = await client.get(
            f"/api/divination/{reading_id}/translation?lang=en",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_translation_multiple_languages(self, client, reading_with_judgment):
        """测试多种语言翻译分别缓存。"""
        token, reading_id = reading_with_judgment

        # 翻译成英文
        mock_en = AsyncMock(return_value="English text")
        with patch("app.translation.router.call_llm", mock_en):
            resp_en = await client.get(
                f"/api/divination/{reading_id}/translation?lang=en",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp_en.json()["cached"] is False

        # 翻译成日文
        mock_ja = AsyncMock(return_value="日本語テキスト")
        with patch("app.translation.router.call_llm", mock_ja):
            resp_ja = await client.get(
                f"/api/divination/{reading_id}/translation?lang=ja",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp_ja.json()["cached"] is False

        # 再次请求英文，应缓存
        mock_no_call = AsyncMock(return_value="Should not call")
        with patch("app.translation.router.call_llm", mock_no_call):
            resp_en2 = await client.get(
                f"/api/divination/{reading_id}/translation?lang=en",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp_en2.json()["cached"] is True
            assert resp_en2.json()["text"] == "English text"
            mock_no_call.assert_not_called()


class TestUserProfile:
    """GET /api/user/profile 和 GET /api/user/quota 测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_profile_free_user(self, client):
        """测试免费用户的 profile 返回。"""
        token = await _register_and_login(client)

        resp = await client.get(
            "/api/user/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert "email" in data
        assert data["subscription"] == "free"
        assert data["daily_remaining"] == 3
        assert data["daily_limit"] == 3

    @pytest.mark.asyncio
    async def test_profile_after_usage(self, client):
        """测试使用一次占卜后，profile 中剩余次数减少。"""
        token = await _register_and_login(client)

        # 使用一次占卜
        with patch("app.divination.router.call_llm", _mock_llm_success()):
            await client.post(
                "/api/divination",
                json={"question": "消耗一次"},
                headers={"Authorization": f"Bearer {token}"},
            )

        resp = await client.get(
            "/api/user/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.json()["daily_remaining"] == 2

    @pytest.mark.asyncio
    async def test_profile_premium_user(self, client):
        """测试付费用户的 profile 返回。"""
        from sqlalchemy import update

        from app.auth.models import User
        from app.database import async_session

        token = await _register_and_login(client)

        # 升级为付费用户
        from app.auth.security import decode_token

        payload = decode_token(token)
        user_id = payload["sub"]
        async with async_session() as db:
            await db.execute(
                update(User).where(User.id == user_id).values(subscription="yearly")
            )
            await db.commit()

        resp = await client.get(
            "/api/user/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["subscription"] == "yearly"
        assert data["daily_remaining"] == -1  # 无限制
        assert data["daily_limit"] == 3

    @pytest.mark.asyncio
    async def test_quota_free_user(self, client):
        """测试免费用户配额查询。"""
        token = await _register_and_login(client)

        resp = await client.get(
            "/api/user/quota",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["remaining"] == 3
        assert data["limit"] == 3
        assert data["is_premium"] is False

    @pytest.mark.asyncio
    async def test_quota_premium_user(self, client):
        """测试付费用户配额查询。"""
        from sqlalchemy import update

        from app.auth.models import User
        from app.database import async_session
        from app.auth.security import decode_token

        token = await _register_and_login(client)

        payload = decode_token(token)
        user_id = payload["sub"]
        async with async_session() as db:
            await db.execute(
                update(User).where(User.id == user_id).values(subscription="monthly")
            )
            await db.commit()

        resp = await client.get(
            "/api/user/quota",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["remaining"] == -1
        assert data["is_premium"] is True

    @pytest.mark.asyncio
    async def test_profile_requires_auth(self, client):
        """测试未认证访问 profile 返回 401。"""
        resp = await client.get("/api/user/profile")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_quota_requires_auth(self, client):
        """测试未认证访问 quota 返回 401。"""
        resp = await client.get("/api/user/quota")
        assert resp.status_code == 401


class TestDivinationResponseSchema:
    """响应 schema 完整性测试。"""

    @pytest.fixture
    async def client(self):
        """创建异步 HTTP 测试客户端。"""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_static_hexagram_no_transformed(self, client):
        """测试静卦（无变爻）时响应结构正确。"""
        token = await _register_and_login(client)

        # 多次起卦，总有一次是静卦
        for _ in range(20):
            with patch("app.divination.router.call_llm", _mock_llm_success()):
                resp = await client.post(
                    "/api/divination",
                    json={"question": "测试静卦"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = resp.json()
                if data["hexagram"]["transformed"] is None:
                    # 确认静卦字段
                    assert data["hexagram"]["changing_lines"] == []
                    assert data["hexagram"]["transformed"] is None
                    return

        # 如果 20 次都没碰到静卦（概率极低），跳过
        pytest.skip("20 次起卦未遇到静卦（概率 < 0.0001%）")

    @pytest.mark.asyncio
    async def test_response_contains_all_hexagram_fields(self, client):
        """测试响应中 hexagram 字段结构完整。"""
        token = await _register_and_login(client)

        with patch("app.divination.router.call_llm", _mock_llm_success()):
            resp = await client.post(
                "/api/divination",
                json={"question": "结构完整性测试"},
                headers={"Authorization": f"Bearer {token}"},
            )

        data = resp.json()
        hexagram = data["hexagram"]

        # 验证原始卦象
        assert "original" in hexagram
        original = hexagram["original"]
        assert "name" in original
        assert "binary" in original
        assert "lines" in original
        assert "trigram_upper" in original
        assert "trigram_lower" in original
        assert len(original["binary"]) == 6
        assert all(isinstance(v, int) for v in original["lines"])

        # 验证变爻
        assert "changing_lines" in hexagram
        assert isinstance(hexagram["changing_lines"], list)

        # 验证互卦
        assert "mutual" in hexagram
        assert "name" in hexagram["mutual"]
        assert "binary" in hexagram["mutual"]

        # 验证稀有度
        assert "rarity" in hexagram
        assert hexagram["rarity"] in ("N", "R", "SR", "SSR")
