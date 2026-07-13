"""占卜模块数据模型。

定义 Reading ORM 模型，存储每次占卜的完整记录。
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Reading(Base):
    """占卜记录模型。

    存储每次起卦的完整数据：卦象信息、判词、解卦解读、翻译缓存。

    Attributes:
        id: UUID v4 主键。
        user_id: 外键关联 users 表，建索引用于按用户查询。
        question: 用户提问，最长 200 字。
        hexagram_data: 排盘引擎返回的完整卦象结果（JSON）。
        hexagram_orig_name: 本卦名称。
        hexagram_orig_lines: 六爻数值字符串，如 "788977"。
        changing_lines: 变爻位置列表（JSON），如 [2, 4]。
        hexagram_trans_name: 之卦名称，静卦时为 null。
        hexagram_mutual_name: 互卦名称。
        rarity: 稀有度（N / R / SR / SSR）。
        judgment_cn: LLM 生成的中文判词，LLM 调用失败时为 null。
        interpretation: LLM 生成的白话解卦解读，按需生成后缓存，null 表示未生成。
        translations: 翻译缓存（JSON），如 {"en": "...", "ja": "..."}。
        created_at: 占卜时间。
    """

    __tablename__ = "readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    question = Column(String, nullable=False)

    # 卦象完整数据（JSON），方便响应时直接还原
    hexagram_data = Column(JSON, default={})

    # 卦象关键字段（方便数据库查询和索引）
    hexagram_orig_name = Column(String, nullable=False)
    hexagram_orig_lines = Column(String(6), nullable=False)
    changing_lines = Column(JSON, default=[])
    hexagram_trans_name = Column(String, nullable=True)
    hexagram_mutual_name = Column(String, nullable=False)
    rarity = Column(String, default="R")

    # 判词（LLM 生成后填充，失败时为 null）
    judgment_cn = Column(Text, nullable=True)

    # 解卦解读（白话，按需生成后缓存）
    interpretation = Column(Text, nullable=True)

    # 翻译缓存
    translations = Column(JSON, default={})

    created_at = Column(DateTime, server_default=func.now())
