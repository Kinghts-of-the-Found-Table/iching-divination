"""
六爻占卜模块 — 排盘引擎 + 卦象数据。

对外暴露：
    - cast_hexagram: 三钱法起卦
    - get_hexagram_info: 按二进制查卦
    - hexagram_by_name: 按卦名反查
"""

from .engine import cast_hexagram, get_hexagram_info, hexagram_by_name

__all__ = ["cast_hexagram", "get_hexagram_info", "hexagram_by_name"]
