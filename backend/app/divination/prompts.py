"""判词生成 Prompt 模板。

⚠️ 安全敏感文件：本模块只在服务端加载，内容绝不通过 API 返回给前端。
所有函数返回的 prompt 仅用于 LLM 调用，API 响应只包含最终判词文本。
"""

# =============================================================================
# 判词生成的系统提示词
# =============================================================================

JUDGMENT_SYSTEM_PROMPT = """\
你是一位精通《周易》六爻占卜的资深命理师，继承了宋代邵雍《梅花易数》的文风传统。\
你的任务是为求卦者撰写判词。

规则：
1. 判词形式为七言或五言古诗，四句到八句，讲究对仗和韵律。
2. 内容必须紧扣卦象含义，引用卦名和关键爻辞的意象。
3. 语言古雅但不晦涩，让现代读者能感受到意境。
4. 判词需包含：卦象总断（2句）+ 所问之事的指向（2~4句）+ 吉凶暗示（2句）。
5. 不可给出绝对化的"一定会怎样"的断言，留有余地。
6. 不可涉及政治、暴力、色情内容。
7. 如果问题是戏谑或无意义的，仍然以庄重的态度回应，但可在判词中委婉提示。
8. 只输出判词文本，不要加任何解释、注释、前缀。"""

# =============================================================================
# 判词生成的用户消息模板
# =============================================================================

JUDGMENT_USER_TEMPLATE = """\
求卦者的问题：{question}

所得卦象：
  本卦：{original_name}（上{trigram_upper}下{trigram_lower}）
  变爻：{changing_lines_text}
  之卦：{transformed_name}
  互卦：{mutual_name}

请为此卦撰写判词。"""


def build_judgment_prompt(question: str, hexagram_result: dict) -> tuple[str, str]:
    """根据用户问题和排盘结果构建 LLM 调用的 prompt。

    Args:
        question: 用户提出的问题，如"我今年的财运如何？"。
        hexagram_result: 排盘引擎返回的卦象结果字典，结构与
                         `cast_hexagram()` 返回值一致。

    Returns:
        (system_prompt, user_message) 元组，可直接传入 `call_llm()`。

    Example:
        >>> result = cast_hexagram()
        >>> system, user = build_judgment_prompt("问前程", result)
    """
    # 格式化变爻信息
    changing: list[int] = hexagram_result.get("changing_lines") or []
    if changing:
        # 使用地支序数（初、二、三、四、五、上）
        ordinal = ["初", "二", "三", "四", "五", "上"]
        lines_parts = [f"第{ordinal[pos]}爻" for pos in changing]
        lines_text = "、".join(lines_parts)
    else:
        lines_text = "无变爻（静卦）"

    # 提取本卦信息
    original = hexagram_result.get("original", {})
    original_name = original.get("name", "未知")
    trigram_upper = original.get("trigram_upper", "?")
    trigram_lower = original.get("trigram_lower", "?")

    # 提取之卦信息（可能为空）
    transformed = hexagram_result.get("transformed") or {}
    transformed_name = transformed.get("name", "无")

    # 提取互卦信息
    mutual = hexagram_result.get("mutual") or {}
    mutual_name = mutual.get("name", "无")

    user_message = JUDGMENT_USER_TEMPLATE.format(
        question=question,
        original_name=original_name,
        trigram_upper=trigram_upper,
        trigram_lower=trigram_lower,
        changing_lines_text=lines_text,
        transformed_name=transformed_name,
        mutual_name=mutual_name,
    )

    return JUDGMENT_SYSTEM_PROMPT, user_message


# =============================================================================
# 解卦解读的系统提示词
# =============================================================================

INTERPRETATION_SYSTEM_PROMPT = """\
你是一位精通《周易》的学者。你的首要任务是直接回答用户的问题，然后用卦象分析来支撑你的回答。

规则：
1. 开篇第一句必须直接回应用户的问题，给出一个明确的判断方向。
2. 用现代汉语，平实易懂，不要使用古诗文体。
3. 每一段都要回扣用户的问题，不要做脱离问题的泛泛解读。
4. 结构分三段：
   【直接回答】— 针对用户问题给出判断（2~3句），点明卦象给出的核心信号是吉是凶、该进该退
   【卦象与变爻分析】— 引用本卦和变爻的爻辞原文（古文），并用白话解释这些爻辞如何关联到用户的问题（3~5句）
   【务实建议】— 基于卦象，给出用户在当前处境下具体可以做什么（2~3句，避免空泛的"保持心态"类建议）
5. 如果有变爻，重点分析变爻。如果是静卦，重点分析本卦卦辞。
6. 引用爻辞时必须准确，使用通行本王弼注本的爻辞。
7. 不给出绝对化的预测断言。
8. 不涉及政治、暴力、色情内容。
9. 总字数控制在 300~500 字。"""

# =============================================================================
# 解卦解读的用户消息模板
# =============================================================================

INTERPRETATION_USER_TEMPLATE = """\
用户问题：{question}

本卦：{original_name}（上{trigram_upper}下{trigram_lower}）
{changing_info}
之卦：{transformed_name}
互卦：{mutual_name}

请直接回答用户的问题，然后引用卦象和爻辞来支撑你的判断。"""


def build_interpretation_prompt(question: str, hexagram_result: dict) -> tuple[str, str]:
    """根据用户问题和排盘结果构建解卦解读的 prompt。

    Args:
        question: 用户提出的问题，如"我今年的财运如何？"。
        hexagram_result: 排盘引擎返回的卦象结果字典，结构与
                         `cast_hexagram()` 返回值一致。

    Returns:
        (system_prompt, user_message) 元组，可直接传入 `call_llm()`。

    Example:
        >>> result = cast_hexagram()
        >>> system, user = build_interpretation_prompt("问前程", result)
    """
    # 提取本卦信息
    original = hexagram_result.get("original", {})
    original_name = original.get("name", "未知")
    trigram_upper = original.get("trigram_upper", "?")
    trigram_lower = original.get("trigram_lower", "?")

    # 提取之卦信息（可能为空）
    transformed = hexagram_result.get("transformed") or {}
    transformed_name = transformed.get("name", "无")

    # 提取互卦信息
    mutual = hexagram_result.get("mutual") or {}
    mutual_name = mutual.get("name", "无")

    # 格式化变爻信息
    changing: list[int] = hexagram_result.get("changing_lines") or []
    if changing:
        ordinal = ["初", "二", "三", "四", "五", "上"]
        lines_parts = [f"第{ordinal[pos]}爻变动" for pos in changing]
        changing_info = "变爻：" + "、".join(lines_parts)
    else:
        changing_info = "变爻：无变爻（静卦）"

    user_message = INTERPRETATION_USER_TEMPLATE.format(
        question=question,
        original_name=original_name,
        trigram_upper=trigram_upper,
        trigram_lower=trigram_lower,
        changing_info=changing_info,
        transformed_name=transformed_name,
        mutual_name=mutual_name,
    )

    return INTERPRETATION_SYSTEM_PROMPT, user_message
