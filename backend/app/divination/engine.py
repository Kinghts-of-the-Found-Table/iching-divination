"""
六爻排盘引擎 — 三钱法起卦 + 互卦 + 变卦计算。

纯 Python 标准库实现，零外部依赖。
"""

import random

from .data import HEXAGRAMS, RARITY_ORDER, trigram_by_binary


def _lines_to_binary(lines: list[int]) -> str:
    """将六爻数值列表转换为二进制字符串。

    Args:
        lines: 六爻数值列表，索引 0 为初爻，索引 5 为上爻。
               7(少阳) / 9(老阳) → '1'
               8(少阴) / 6(老阴) → '0'

    Returns:
        六位二进制字符串，左=初爻，右=上爻。
    """
    if len(lines) != 6:
        raise ValueError(f"lines 长度必须为 6，实际为 {len(lines)}")
    return "".join("1" if val in (7, 9) else "0" for val in lines)


def _compute_mutual_binary(original_binary: str) -> str:
    """从本卦六爻二进制计算互卦二进制。

    互卦规则：
    - 下互卦 = 本卦第二爻、第三爻、第四爻（索引 1, 2, 3）
    - 上互卦 = 本卦第三爻、第四爻、第五爻（索引 2, 3, 4）
    - 互卦二进制 = 下互卦三爻 + 上互卦三爻

    Args:
        original_binary: 本卦六爻二进制，左=初爻。

    Returns:
        互卦六爻二进制。
    """
    # 索引 1,2,3 → 下互卦；索引 2,3,4 → 上互卦
    lower_mutual = original_binary[1:4]   # 二、三、四爻
    upper_mutual = original_binary[2:5]   # 三、四、五爻
    return lower_mutual + upper_mutual


def _build_hexagram_result(binary: str, lines: list[int]) -> dict:
    """根据二进制和爻值构建卦象结果字典。

    Args:
        binary: 六爻二进制。
        lines: 六爻数值列表。

    Returns:
        卦象信息字典。
    """
    hex_data = HEXAGRAMS[binary]
    return {
        "name": hex_data["name"],
        "binary": binary,
        "lines": list(lines),
        "trigram_upper": hex_data["trigram_upper"],
        "trigram_lower": hex_data["trigram_lower"],
    }


def _rarity_max(a: str, b: str) -> str:
    """取两个稀有度中较高者。SSR > SR > R > N。"""
    return a if RARITY_ORDER[a] >= RARITY_ORDER[b] else b


def cast_hexagram(seed: int | None = None) -> dict:
    """三钱法起卦。

    模拟三枚铜钱抛掷六次，从初爻到上爻依次生成。

    每爻规则：
    - 铜钱正面（阳）= 3，反面（阴）= 2
    - 三枚和：6（老阴⚋→变）、7（少阳⚊）、8（少阴⚋）、9（老阳⚊→变）
    - 老阴/老阳记为「变爻」

    Args:
        seed: 可选的随机种子，用于测试复现。

    Returns:
        {
            "original": {
                "name": "风雷益",
                "binary": "100011",
                "lines": [7, 8, 8, 8, 7, 7],
                "trigram_upper": "巽",
                "trigram_lower": "震",
            },
            "changing_lines": [3],       # 变爻位置列表，0-indexed 从初爻起
            "transformed": { ... } | None,  # 之卦，无变爻时为 None（静卦）
            "mutual": {
                "name": "山地剥",
                "binary": "000001",
            },
            "rarity": "R",
        }
    """
    if seed is not None:
        random.seed(seed)

    # 1. 生成六爻：每次抛掷 3 枚铜钱，求和
    lines: list[int] = []
    for _ in range(6):
        coin_sum = sum(random.choice([2, 3]) for _ in range(3))
        lines.append(coin_sum)  # lines[0]=初爻, ..., lines[5]=上爻

    # 2. 确定本卦
    original_binary = _lines_to_binary(lines)
    original = _build_hexagram_result(original_binary, lines)
    original_rarity = str(HEXAGRAMS[original_binary]["rarity"])

    # 3. 确定变爻（老阴 6 或老阳 9 的位置）
    changing_lines: list[int] = [
        i for i, val in enumerate(lines) if val in (6, 9)
    ]

    # 4. 计算之卦（变卦）
    transformed: dict | None = None
    transformed_rarity: str | None = None
    if changing_lines:
        transformed_lines = list(lines)
        for i in changing_lines:
            # 老阴(6) 变阳(7)，老阳(9) 变阴(8)
            transformed_lines[i] = 7 if transformed_lines[i] == 6 else 8
        transformed_binary = _lines_to_binary(transformed_lines)
        transformed = _build_hexagram_result(transformed_binary, transformed_lines)
        transformed_rarity = str(HEXAGRAMS[transformed_binary]["rarity"])

    # 5. 计算互卦
    mutual_binary = _compute_mutual_binary(original_binary)
    mutual_hex = HEXAGRAMS[mutual_binary]
    mutual = {
        "name": mutual_hex["name"],
        "binary": mutual_binary,
    }

    # 6. 稀有度顺延：有变爻时取本卦与之卦中较高者
    if transformed_rarity is not None:
        final_rarity = _rarity_max(original_rarity, transformed_rarity)
    else:
        final_rarity = original_rarity

    return {
        "original": original,
        "changing_lines": changing_lines,
        "transformed": transformed,
        "mutual": mutual,
        "rarity": final_rarity,
    }


def get_hexagram_info(binary: str) -> dict:
    """根据六爻二进制字符串获取完整卦象信息。

    Args:
        binary: 六位二进制字符串，左=初爻，右=上爻。

    Returns:
        卦象完整数据字典（name, trigram_upper, trigram_lower, description, rarity）。

    Raises:
        KeyError: 当 binary 不在 HEXAGRAMS 表中时。
    """
    return dict(HEXAGRAMS[binary])


def hexagram_by_name(name: str) -> dict | None:
    """根据卦名反查卦象数据。

    Args:
        name: 六十四卦标准中文名称，如"乾为天"、"风雷益"。

    Returns:
        卦象完整数据字典，未找到时返回 None。
    """
    from .data import _NAME_TO_BINARY

    binary = _NAME_TO_BINARY.get(name)
    if binary is None:
        return None
    return dict(HEXAGRAMS[binary])
