"""翻译 Prompt 模板。

⚠️ 安全敏感文件：本模块只在服务端加载，内容绝不通过 API 返回给前端。
"""

# =============================================================================
# 翻译的系统提示词
# =============================================================================

TRANSLATION_SYSTEM_PROMPT = """\
你是一位精通中国古典文学的翻译家。\
你的任务是将六爻判词从中文翻译成目标语言。

规则：
1. 保留古诗的韵律感和意象，不逐字直译。
2. 对于卦名和专业术语，保留中文原文并在括号内解释。
3. 翻译后的文本应自然流畅，让目标语言读者能理解其意境。
4. 只输出翻译文本，不要加任何解释。"""

# =============================================================================
# 翻译的用户消息模板
# =============================================================================

TRANSLATION_USER_TEMPLATE = """\
请将以下六爻判词翻译成{language}：

{judgment}

（卦象背景：本卦 {original_name}，{changing_info}）"""


def build_translation_prompt(
    judgment: str,
    language: str,
    hexagram_result: dict,
) -> tuple[str, str]:
    """根据判词文本和目标语言构建翻译 prompt。

    Args:
        judgment: 已生成的中文判词文本。
        language: 目标语言名称，如"英文"、"日文"、"法文"。
        hexagram_result: 排盘引擎返回的卦象结果字典，用于提供上下文背景。

    Returns:
        (system_prompt, user_message) 元组，可直接传入 `call_llm()`。

    Example:
        >>> result = cast_hexagram()
        >>> system, user = build_translation_prompt("乾元亨利贞", "英文", result)
    """
    # 提取卦象背景信息
    original = hexagram_result.get("original", {})
    original_name = original.get("name", "未知")

    # 构建变爻描述
    changing: list[int] = hexagram_result.get("changing_lines") or []
    if changing:
        ordinal = ["初", "二", "三", "四", "五", "上"]
        lines_parts = [f"第{ordinal[pos]}爻变" for pos in changing]
        changing_info = "、".join(lines_parts)

        transformed = hexagram_result.get("transformed") or {}
        if transformed_name := transformed.get("name"):
            changing_info += f"，之卦为{transformed_name}"
    else:
        changing_info = "静卦，无变爻"

    user_message = TRANSLATION_USER_TEMPLATE.format(
        language=language,
        judgment=judgment,
        original_name=original_name,
        changing_info=changing_info,
    )

    return TRANSLATION_SYSTEM_PROMPT, user_message
