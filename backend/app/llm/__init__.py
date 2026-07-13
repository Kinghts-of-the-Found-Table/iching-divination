"""LLM 调用封装模块。

提供统一的 LLM API 调用接口和自定义异常。
"""

from app.llm.client import LLMError, call_llm

__all__ = ["call_llm", "LLMError"]
