"""翻译模块。

提供判词翻译的 prompt 模板和构建函数。
"""

from app.translation.prompts import (
    TRANSLATION_SYSTEM_PROMPT,
    TRANSLATION_USER_TEMPLATE,
    build_translation_prompt,
)

__all__ = [
    "TRANSLATION_SYSTEM_PROMPT",
    "TRANSLATION_USER_TEMPLATE",
    "build_translation_prompt",
]
