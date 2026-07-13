"""
LLM 调用封装与 Prompt 模板测试。

覆盖：
    1. call_llm 成功调用与响应解析
    2. API Key 未配置时抛出明确错误
    3. HTTP 错误响应（4xx/5xx）处理
    4. 网络错误重试逻辑
    5. 响应格式异常处理
    6. build_judgment_prompt 正确性
    7. build_translation_prompt 正确性

所有 LLM 调用测试使用 Mock，不依赖真实 API Key。
"""

import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.config import settings
from app.llm.client import LLMError, call_llm
from app.divination.prompts import (
    JUDGMENT_SYSTEM_PROMPT,
    JUDGMENT_USER_TEMPLATE,
    build_judgment_prompt,
)
from app.translation.prompts import (
    TRANSLATION_SYSTEM_PROMPT,
    TRANSLATION_USER_TEMPLATE,
    build_translation_prompt,
)


# =============================================================================
# 测试辅助：构建模拟的 httpx.Response
# =============================================================================

def _mock_response(
    status_code: int = 200,
    content: str = "",
    json_data: dict | None = None,
) -> MagicMock:
    """构建一个模拟的 httpx.Response 对象。

    Args:
        status_code: HTTP 状态码。
        content: 响应文本（json_data 为 None 时使用）。
        json_data: 响应 JSON 数据，优先级高于 content。

    Returns:
        配置好的 MagicMock 对象。
    """
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = status_code
    mock_resp.text = content
    if json_data is not None:
        mock_resp.json.return_value = json_data
    else:
        mock_resp.json.side_effect = ValueError("not JSON")
    return mock_resp


def _build_success_response(content: str) -> dict:
    """构建标准的成功响应 JSON。"""
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": content,
                }
            }
        ]
    }


# =============================================================================
# 1. call_llm 基本功能测试
# =============================================================================

class TestCallLLMSuccess(unittest.TestCase):
    """call_llm 正常调用场景测试。"""

    def setUp(self) -> None:
        """确保测试期间 API_KEY 不为空（Mock 环境下不会被真正使用）。"""
        self._original_key = settings.LLM_API_KEY
        settings.LLM_API_KEY = "sk-test-mock-key"

    def tearDown(self) -> None:
        """恢复原始 API_KEY 配置。"""
        settings.LLM_API_KEY = self._original_key

    @patch("app.llm.client.httpx.AsyncClient")
    def test_successful_call_returns_content(self, mock_client_cls: MagicMock) -> None:
        """正常调用应返回 choices[0].message.content 的文本。"""
        expected_text = "乾元亨利贞，君子以自强不息。"

        # 配置模拟的 AsyncClient
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data=_build_success_response(expected_text),
            )
        )
        mock_client_cls.return_value = mock_client

        # 执行
        async def run() -> str:
            return await call_llm(
                system_prompt="你是一位诗人。",
                user_message="写一首诗。",
                temperature=0.8,
                max_tokens=200,
            )

        import asyncio
        result = asyncio.run(run())

        self.assertEqual(result, expected_text)

    @patch("app.llm.client.httpx.AsyncClient")
    def test_temperature_passed_correctly(self, mock_client_cls: MagicMock) -> None:
        """验证 temperature 参数正确传递到请求体。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data=_build_success_response("test"),
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm(
                system_prompt="test",
                user_message="test",
                temperature=0.3,
            )

        import asyncio
        asyncio.run(run())

        # 验证请求体中的 temperature 值
        call_kwargs = mock_client.post.call_args
        payload = call_kwargs[1]["json"]
        self.assertEqual(payload["temperature"], 0.3)

    @patch("app.llm.client.httpx.AsyncClient")
    def test_response_content_is_stripped(self, mock_client_cls: MagicMock) -> None:
        """响应内容的前后空白应被去除。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data=_build_success_response("  有空白的内容  \n"),
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        result = asyncio.run(run())
        self.assertEqual(result, "有空白的内容")


# =============================================================================
# 2. API Key 检查测试
# =============================================================================

class TestCallLLMAPICheck(unittest.TestCase):
    """API Key 未配置时的错误处理测试。"""

    def setUp(self) -> None:
        """保存原始配置并清空 API Key。"""
        self._original_key = settings.LLM_API_KEY
        settings.LLM_API_KEY = ""

    def tearDown(self) -> None:
        """恢复原始配置。"""
        settings.LLM_API_KEY = self._original_key

    def test_empty_api_key_raises_clear_error(self) -> None:
        """API Key 为空时应抛出明确的 LLMError，不发送任何请求。"""
        import asyncio

        async def run() -> str:
            return await call_llm("sys", "user")

        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("API Key 未配置", str(ctx.exception))
        self.assertIn("LLM_API_KEY", str(ctx.exception))


# =============================================================================
# 3. HTTP 错误响应测试
# =============================================================================

class TestCallLLMHTTPErrors(unittest.TestCase):
    """HTTP 非 200 响应错误处理测试。"""

    def setUp(self) -> None:
        """设置 Mock API Key。"""
        self._original_key = settings.LLM_API_KEY
        settings.LLM_API_KEY = "sk-test-mock-key"

    def tearDown(self) -> None:
        """恢复原始配置。"""
        settings.LLM_API_KEY = self._original_key

    @patch("app.llm.client.httpx.AsyncClient")
    def test_401_unauthorized(self, mock_client_cls: MagicMock) -> None:
        """401 错误应抛出 LLMError 并包含状态码。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=401,
                json_data={"error": {"message": "Invalid API Key"}},
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("401", str(ctx.exception))

    @patch("app.llm.client.httpx.AsyncClient")
    def test_500_internal_server_error(self, mock_client_cls: MagicMock) -> None:
        """500 错误应抛出 LLMError。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=500,
                content="Internal Server Error",
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("500", str(ctx.exception))

    @patch("app.llm.client.httpx.AsyncClient")
    def test_429_rate_limited(self, mock_client_cls: MagicMock) -> None:
        """429 限流错误应抛出 LLMError。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=429,
                json_data={"error": {"message": "Rate limit exceeded"}},
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("429", str(ctx.exception))


# =============================================================================
# 4. 网络错误重试测试
# =============================================================================

class TestCallLLMRetry(unittest.TestCase):
    """网络错误自动重试逻辑测试。"""

    def setUp(self) -> None:
        """设置 Mock API Key。"""
        self._original_key = settings.LLM_API_KEY
        settings.LLM_API_KEY = "sk-test-mock-key"

    def tearDown(self) -> None:
        """恢复原始配置。"""
        settings.LLM_API_KEY = self._original_key

    @patch("app.llm.client.httpx.AsyncClient")
    @patch("app.llm.client.asyncio.sleep", new_callable=AsyncMock)
    def test_retry_on_connect_error_then_success(
        self, mock_sleep: AsyncMock, mock_client_cls: MagicMock
    ) -> None:
        """首次 ConnectError 后重试成功，应返回结果。"""
        # 第一次请求失败，第二次成功
        mock_client1 = MagicMock()
        mock_client1.__aenter__ = AsyncMock(return_value=mock_client1)
        mock_client1.__aexit__ = AsyncMock(return_value=None)
        mock_client1.post = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

        mock_client2 = MagicMock()
        mock_client2.__aenter__ = AsyncMock(return_value=mock_client2)
        mock_client2.__aexit__ = AsyncMock(return_value=None)
        mock_client2.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data=_build_success_response("重试成功"),
            )
        )

        mock_client_cls.side_effect = [mock_client1, mock_client2]

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        result = asyncio.run(run())

        self.assertEqual(result, "重试成功")
        # 验证确实调用了两次（第一次失败 + 第二次成功）
        self.assertEqual(mock_client_cls.call_count, 2)
        # 验证 sleep 被调用了一次（重试间隔 2 秒）
        mock_sleep.assert_called_once_with(2)

    @patch("app.llm.client.httpx.AsyncClient")
    @patch("app.llm.client.asyncio.sleep", new_callable=AsyncMock)
    def test_retry_exhausted_raises_error(
        self, mock_sleep: AsyncMock, mock_client_cls: MagicMock
    ) -> None:
        """两次尝试均失败后应抛出 LLMError。"""
        mock_client1 = MagicMock()
        mock_client1.__aenter__ = AsyncMock(return_value=mock_client1)
        mock_client1.__aexit__ = AsyncMock(return_value=None)
        mock_client1.post = AsyncMock(side_effect=httpx.ConnectError("fail 1"))

        mock_client2 = MagicMock()
        mock_client2.__aenter__ = AsyncMock(return_value=mock_client2)
        mock_client2.__aexit__ = AsyncMock(return_value=None)
        mock_client2.post = AsyncMock(side_effect=httpx.ConnectError("fail 2"))

        mock_client_cls.side_effect = [mock_client1, mock_client2]

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("网络连接失败", str(ctx.exception))
        self.assertIn("2 次", str(ctx.exception))

    @patch("app.llm.client.httpx.AsyncClient")
    @patch("app.llm.client.asyncio.sleep", new_callable=AsyncMock)
    def test_retry_on_timeout(
        self, mock_sleep: AsyncMock, mock_client_cls: MagicMock
    ) -> None:
        """超时异常也应触发重试。"""
        mock_client1 = MagicMock()
        mock_client1.__aenter__ = AsyncMock(return_value=mock_client1)
        mock_client1.__aexit__ = AsyncMock(return_value=None)
        mock_client1.post = AsyncMock(side_effect=httpx.TimeoutException("timeout"))

        mock_client2 = MagicMock()
        mock_client2.__aenter__ = AsyncMock(return_value=mock_client2)
        mock_client2.__aexit__ = AsyncMock(return_value=None)
        mock_client2.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data=_build_success_response("ok"),
            )
        )

        mock_client_cls.side_effect = [mock_client1, mock_client2]

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        result = asyncio.run(run())

        self.assertEqual(result, "ok")
        self.assertEqual(mock_client_cls.call_count, 2)


# =============================================================================
# 5. 响应格式异常测试
# =============================================================================

class TestCallLLMResponseParsing(unittest.TestCase):
    """响应 JSON 解析异常测试。"""

    def setUp(self) -> None:
        """设置 Mock API Key。"""
        self._original_key = settings.LLM_API_KEY
        settings.LLM_API_KEY = "sk-test-mock-key"

    def tearDown(self) -> None:
        """恢复原始配置。"""
        settings.LLM_API_KEY = self._original_key

    @patch("app.llm.client.httpx.AsyncClient")
    def test_empty_choices_raises_error(self, mock_client_cls: MagicMock) -> None:
        """choices 为空列表时抛出 LLMError。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data={"choices": []},
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("空的 choices", str(ctx.exception))

    @patch("app.llm.client.httpx.AsyncClient")
    def test_missing_content_field_raises_error(self, mock_client_cls: MagicMock) -> None:
        """choices[0].message 缺少 content 字段时抛出 LLMError。"""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(
            return_value=_mock_response(
                status_code=200,
                json_data={
                    "choices": [{"message": {"role": "assistant"}}]
                },
            )
        )
        mock_client_cls.return_value = mock_client

        async def run() -> str:
            return await call_llm("sys", "user")

        import asyncio
        with self.assertRaises(LLMError) as ctx:
            asyncio.run(run())

        self.assertIn("响应格式异常", str(ctx.exception))


# =============================================================================
# 6. build_judgment_prompt 测试
# =============================================================================

class TestBuildJudgmentPrompt(unittest.TestCase):
    """判词 Prompt 构建函数测试。"""

    def _make_base_result(self) -> dict:
        """构建一个标准卦象结果，减少重复代码。"""
        return {
            "original": {
                "name": "风雷益",
                "binary": "100011",
                "lines": [7, 8, 8, 8, 7, 7],
                "trigram_upper": "巽",
                "trigram_lower": "震",
            },
            "changing_lines": [2],  # 第三爻变
            "transformed": {
                "name": "风火家人",
            },
            "mutual": {
                "name": "山地剥",
                "binary": "000001",
            },
            "rarity": "R",
        }

    def test_normal_hexagram_with_changing_lines(self) -> None:
        """有变爻的标准卦象，prompt 应包含所有关键信息。"""
        result = self._make_base_result()
        system, user = build_judgment_prompt("我的财运如何？", result)

        # system prompt 应包含核心规则关键词
        self.assertIn("梅花易数", system)
        self.assertIn("七言或五言古诗", system)
        self.assertIn("判词文本", system)

        # user message 应包含卦象信息
        self.assertIn("我的财运如何？", user)
        self.assertIn("风雷益", user)
        self.assertIn("上巽下震", user)
        self.assertIn("第三爻", user)
        self.assertIn("风火家人", user)
        self.assertIn("山地剥", user)

    def test_static_hexagram_no_changing_lines(self) -> None:
        """无变爻（静卦）时 prompt 应标注清楚。"""
        result = self._make_base_result()
        result["changing_lines"] = []
        result["transformed"] = None

        system, user = build_judgment_prompt("问健康", result)

        self.assertIn("无变爻（静卦）", user)
        self.assertIn("无", user)  # transformed_name 为"无"

    def test_empty_changing_lines_list(self) -> None:
        """changing_lines 为空列表的处理。"""
        result = self._make_base_result()
        result["changing_lines"] = []

        system, user = build_judgment_prompt("测试", result)

        self.assertIn("无变爻（静卦）", user)

    def test_missing_optional_fields_handled(self) -> None:
        """缺少 transformed / mutual 字段时不崩溃。"""
        minimal_result = {
            "original": {
                "name": "乾为天",
                "trigram_upper": "乾",
                "trigram_lower": "乾",
            },
            "changing_lines": [],
        }

        system, user = build_judgment_prompt("问前程", minimal_result)

        self.assertIn("乾为天", user)
        self.assertIn("无变爻（静卦）", user)

    def test_prompt_not_contain_forbidden_content(self) -> None:
        """验证 prompt 模板不含敏感信息泄露路径。"""
        result = self._make_base_result()
        system, user = build_judgment_prompt("test", result)

        # prompt 中不应包含 API Key 或配置信息
        self.assertNotIn("API_KEY", system)
        self.assertNotIn("api_key", user)
        self.assertNotIn("sk-", system)
        self.assertNotIn("sk-", user)

    def test_ordinal_correctness(self) -> None:
        """验证变爻序号使用正确的地支序数（初、二、三、四、五、上）。"""
        result = self._make_base_result()
        # 测试第 0 爻（初爻）和第 5 爻（上爻）
        result["changing_lines"] = [0, 5]

        system, user = build_judgment_prompt("test", result)

        self.assertIn("第初爻", user)   # 第 0 位 → "初爻"
        self.assertIn("第上爻", user)   # 第 5 位 → "上爻"


# =============================================================================
# 7. build_translation_prompt 测试
# =============================================================================

class TestBuildTranslationPrompt(unittest.TestCase):
    """翻译 Prompt 构建函数测试。"""

    def _make_base_result(self) -> dict:
        """构建标准卦象结果。"""
        return {
            "original": {
                "name": "乾为天",
                "trigram_upper": "乾",
                "trigram_lower": "乾",
            },
            "changing_lines": [3],  # 第四爻变
            "transformed": {
                "name": "风天小畜",
            },
            "mutual": {
                "name": "乾为天",
            },
            "rarity": "SSR",
        }

    def test_normal_translation_prompt(self) -> None:
        """标准翻译 prompt 应包含判词和目标语言。"""
        result = self._make_base_result()
        judgment = "乾元亨利贞，自强不息行。"
        system, user = build_translation_prompt(judgment, "英文", result)

        # system prompt 检查
        self.assertIn("翻译", system)
        self.assertIn("古典文学", system)

        # user message 检查
        self.assertIn("英文", user)
        self.assertIn(judgment, user)
        self.assertIn("乾为天", user)
        self.assertIn("第四爻变", user)

    def test_translation_prompt_without_changing_lines(self) -> None:
        """静卦翻译 prompt 应正确描述。"""
        result = self._make_base_result()
        result["changing_lines"] = []
        result["transformed"] = None

        system, user = build_translation_prompt("判词内容", "日文", result)

        self.assertIn("静卦，无变爻", user)

    def test_translation_prompt_no_transformed(self) -> None:
        """有变爻但无之卦信息时的处理。"""
        result = self._make_base_result()
        result["transformed"] = None  # 有变爻但无之卦

        system, user = build_translation_prompt("判词", "法文", result)

        self.assertIn("第四爻变", user)
        # 之卦缺失时不添加之卦文本
        self.assertNotIn("风天小畜", user)

    def test_translation_prompt_minimal_result(self) -> None:
        """最小卦象信息下不崩溃。"""
        minimal = {
            "original": {"name": "坤为地"},
            "changing_lines": [],
        }

        system, user = build_translation_prompt("判词", "英文", minimal)

        self.assertIn("坤为地", user)
        self.assertIn("静卦", user)

    def test_translation_prompt_not_leak_sensitive_info(self) -> None:
        """翻译 prompt 不应包含敏感信息。"""
        result = self._make_base_result()
        system, user = build_translation_prompt("test", "英文", result)

        self.assertNotIn("API_KEY", system)
        self.assertNotIn("sk-", user)


# =============================================================================
# 8. Prompt 模板常量测试
# =============================================================================

class TestPromptTemplates(unittest.TestCase):
    """Prompt 模板常量的存在性和基本结构检查。"""

    def test_judgment_system_prompt_not_empty(self) -> None:
        """判词系统提示词非空。"""
        self.assertTrue(len(JUDGMENT_SYSTEM_PROMPT) > 50)
        self.assertIn("梅花易数", JUDGMENT_SYSTEM_PROMPT)

    def test_judgment_user_template_has_placeholders(self) -> None:
        """判词用户模板包含必要的占位符。"""
        placeholders = ["{question}", "{original_name}", "{changing_lines_text}",
                        "{transformed_name}", "{mutual_name}"]
        for ph in placeholders:
            self.assertIn(
                ph, JUDGMENT_USER_TEMPLATE,
                f"JUDGMENT_USER_TEMPLATE 缺少占位符: {ph}"
            )

    def test_translation_system_prompt_not_empty(self) -> None:
        """翻译系统提示词非空。"""
        self.assertTrue(len(TRANSLATION_SYSTEM_PROMPT) > 50)
        self.assertIn("翻译", TRANSLATION_SYSTEM_PROMPT)

    def test_translation_user_template_has_placeholders(self) -> None:
        """翻译用户模板包含必要的占位符。"""
        placeholders = ["{language}", "{judgment}", "{original_name}", "{changing_info}"]
        for ph in placeholders:
            self.assertIn(
                ph, TRANSLATION_USER_TEMPLATE,
                f"TRANSLATION_USER_TEMPLATE 缺少占位符: {ph}"
            )


# =============================================================================
# 9. LLMError 异常类型测试
# =============================================================================

class TestLLMError(unittest.TestCase):
    """LLMError 自定义异常测试。"""

    def test_llm_error_is_exception_subclass(self) -> None:
        """LLMError 应是 Exception 的子类。"""
        self.assertTrue(issubclass(LLMError, Exception))

    def test_llm_error_can_be_raised_and_caught(self) -> None:
        """LLMError 可以被正常抛出和捕获。"""
        with self.assertRaises(LLMError):
            raise LLMError("测试错误")

    def test_llm_error_stores_message(self) -> None:
        """LLMError 应正确存储消息字符串。"""
        try:
            raise LLMError("自定义错误信息")
        except LLMError as e:
            self.assertEqual(str(e), "自定义错误信息")


if __name__ == "__main__":
    unittest.main()
