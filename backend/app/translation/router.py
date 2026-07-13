"""翻译 API 路由。

提供判词翻译端点，支持翻译缓存。
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import get_current_user
from app.database import get_db
from app.divination.models import Reading
from app.llm.client import LLMError, call_llm
from app.translation.prompts import build_translation_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/divination", tags=["translation"])

# 支持的语言映射
SUPPORTED_LANGUAGES: dict[str, str] = {
    "en": "英文",
    "ja": "日文",
    "ko": "韩文",
    "fr": "法文",
    "de": "德文",
    "es": "西班牙文",
}


class TranslationResponse(BaseModel):
    """翻译响应体。"""

    reading_id: str
    lang: str
    text: str
    cached: bool  # 是否来自缓存


@router.get("/{reading_id}/translation", response_model=TranslationResponse)
async def get_translation(
    reading_id: str,
    lang: str = Query("en", description="目标语言代码：en/ja/ko/fr/de/es"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取判词翻译。

    - 若 translations JSON 中已有缓存，直接返回（cached=true）。
    - 若没有缓存，调用 LLM 翻译后缓存到数据库（cached=false）。
    - 判词尚未生成时返回 400。
    - 不支持的语言返回 400。

    Args:
        reading_id: 占卜记录 UUID。
        lang: 目标语言代码。
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        TranslationResponse: 翻译文本 + 缓存状态。

    Raises:
        HTTPException 400: 判词不存在或语言不支持。
        HTTPException 404: 占卜记录不存在或不属于当前用户。
    """
    # 校验语言
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的语言：{lang}。支持：{', '.join(SUPPORTED_LANGUAGES.keys())}",
        )

    # 校验 reading_id
    try:
        rid = UUID(reading_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    # 查询占卜记录
    result = await db.execute(select(Reading).where(Reading.id == rid))
    reading = result.scalar_one_or_none()

    if reading is None or reading.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    # 检查判词是否已生成
    if not reading.judgment_cn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="判词尚未生成",
        )

    # 检查缓存
    translations: dict = reading.translations or {}
    if lang in translations:
        return TranslationResponse(
            reading_id=str(reading.id),
            lang=lang,
            text=translations[lang],
            cached=True,
        )

    # 调用 LLM 翻译
    language_name = SUPPORTED_LANGUAGES[lang]
    hexagram_data: dict = reading.hexagram_data or {}
    try:
        system_prompt, user_message = build_translation_prompt(
            judgment=reading.judgment_cn,
            language=language_name,
            hexagram_result=hexagram_data,
        )
        translation_text = await call_llm(
            system_prompt, user_message, temperature=0.3
        )
    except LLMError as e:
        logger.error("LLM 翻译失败，reading_id=%s, lang=%s: %s", reading.id, lang, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"翻译服务暂时不可用：{e}",
        )
    except Exception as e:
        logger.error("LLM 翻译未知异常，reading_id=%s, lang=%s: %s", reading.id, lang, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="翻译服务暂时不可用",
        )

    # 缓存翻译结果
    translations[lang] = translation_text
    reading.translations = translations
    await db.commit()

    return TranslationResponse(
        reading_id=str(reading.id),
        lang=lang,
        text=translation_text,
        cached=False,
    )
