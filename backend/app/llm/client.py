"""LLM API 调用封装。

使用 httpx 异步调用 DeepSeek API，提供统一的文本生成接口。
包含自动重试、超时控制和明确的错误提示。
"""

import asyncio
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """LLM 调用异常。

    在以下情况抛出：
    - API Key 未配置
    - 网络连接失败（含重试后）
    - API 返回非 200 状态码
    - 响应解析失败
    """

    pass


async def call_llm(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.8,
    max_tokens: int = 1024,
) -> str:
    """调用 LLM API，返回纯文本响应。

    Args:
        system_prompt: 系统提示词，定义 LLM 的角色和行为规则。
        user_message: 用户消息，包含具体的生成任务和上下文。
        temperature: 创造性参数，判词建议 0.8，翻译建议 0.3。
        max_tokens: 最大输出 token 数。

    Returns:
        LLM 生成的纯文本内容。

    Raises:
        LLMError: API Key 未配置、网络错误（含重试后）、
                  API 返回错误状态码或响应格式异常时抛出。
    """
    # 前置检查：API Key 必须配置
    if not settings.LLM_API_KEY:
        raise LLMError(
            "LLM API Key 未配置，请在 .env 中设置 LLM_API_KEY"
        )

    # 构建请求 URL（兼容 OpenAI 兼容接口，自动拼接 /chat/completions）
    base_url = settings.LLM_API_BASE.rstrip("/")
    url = f"{base_url}/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # 超时设置：连接 10 秒，读取 30 秒
    timeout = httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0)

    # 网络错误自动重试 1 次（共 2 次尝试），间隔 2 秒
    max_attempts = 2
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)

            # 检查 HTTP 状态码
            if response.status_code != 200:
                error_detail = _extract_error_detail(response)
                raise LLMError(
                    f"LLM API 返回错误 (HTTP {response.status_code}): {error_detail}"
                )

            # 解析响应 JSON
            data = response.json()

            # 从 choices[0].message.content 提取文本
            content = _extract_content(data)
            return content

        except (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_error = e
            if attempt < max_attempts:
                logger.warning(
                    "LLM 调用网络异常（第 %d/%d 次），2 秒后重试: %s",
                    attempt, max_attempts, e,
                )
                await asyncio.sleep(2)
            else:
                raise LLMError(
                    f"LLM API 网络连接失败（已重试 {max_attempts} 次）: {last_error}"
                ) from last_error

        except LLMError:
            # LLMError 直接向上传播，不包装
            raise

        except Exception as e:
            # 其他未预期异常包装为 LLMError
            raise LLMError(f"LLM 调用异常: {e}") from e

    # 理论上不会走到这里，但保持 safety net
    raise LLMError(
        f"LLM API 网络连接失败（已重试 {max_attempts} 次）: {last_error}"
    )


def _extract_content(data: dict) -> str:
    """从 API 响应 JSON 中提取文本内容。

    Args:
        data: API 返回的 JSON 字典。

    Returns:
        提取的文本内容。

    Raises:
        LLMError: 响应格式不符合预期时抛出。
    """
    try:
        choices = data["choices"]
        if not choices:
            raise LLMError("LLM API 返回空的 choices 列表")
        content = choices[0]["message"]["content"]
        return str(content).strip()
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError(f"LLM 响应格式异常，无法解析文本: {e}") from e


def _extract_error_detail(response: httpx.Response) -> str:
    """从错误响应中提取详细信息。

    Args:
        response: httpx 响应对象。

    Returns:
        错误详情字符串，若无法解析则返回原始文本前 200 字符。
    """
    try:
        body = response.json()
        # 尝试 OpenAI 兼容格式的错误消息
        if "error" in body:
            return body["error"].get("message", str(body["error"]))
        return str(body)
    except (ValueError, AttributeError):
        return response.text[:200]
