"""占卜 API 路由。

提供起卦、历史查询等端点。
所有端点需要 Bearer token 认证。
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.security import get_current_user
from app.database import get_db
from app.divination.engine import cast_hexagram
from app.divination.models import Reading
from app.divination.prompts import build_interpretation_prompt, build_judgment_prompt
from app.llm.client import LLMError, call_llm
from app.user.quota import check_quota, deduct_quota

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/divination", tags=["divination"])


# =============================================================================
# 请求 / 响应模型
# =============================================================================


class DivinationRequest(BaseModel):
    """起卦请求体。"""

    question: str = Field(..., min_length=1, max_length=200)


class DivinationResponse(BaseModel):
    """起卦响应体。"""

    id: str
    question: str
    hexagram: dict
    judgment_cn: str | None
    created_at: str


class DivinationListResponse(BaseModel):
    """分页历史列表响应体。"""

    items: list[DivinationResponse]
    total: int
    page: int
    limit: int


class InterpretationResponse(BaseModel):
    """解卦解读响应体。"""

    reading_id: str
    interpretation: str
    cached: bool


# =============================================================================
# 辅助函数
# =============================================================================


def _format_reading(reading: Reading) -> dict:
    """将 Reading ORM 对象格式化为 API 响应字典。

    Args:
        reading: 数据库中的 Reading 记录。

    Returns:
        符合 DivinationResponse 格式的字典。
    """
    created_at_iso: str = ""
    if reading.created_at is not None:
        created_at_iso = reading.created_at.isoformat()

    return {
        "id": str(reading.id),
        "question": reading.question,
        "hexagram": reading.hexagram_data or {},
        "judgment_cn": reading.judgment_cn,
        "created_at": created_at_iso,
    }


# =============================================================================
# API 端点
# =============================================================================


@router.post("", response_model=DivinationResponse, status_code=status.HTTP_201_CREATED)
async def create_divination(
    request: DivinationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """起卦并生成判词。

    完整链路：配额检查 → 起卦 → 保存记录 → LLM 判词 → 扣减配额。

    LLM 调用失败时采用降级模式：仍返回卦象信息，judgment_cn 为 null。

    Args:
        request: 起卦请求，含用户提问。
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        DivinationResponse: 含卦象、判词（可能为 null）、时间戳。

    Raises:
        HTTPException 429: 免费用户当日配额已用完。
    """
    # 1. 检查配额
    has_quota = await check_quota(current_user, db)
    if not has_quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="今日免费占卜次数已用完，请升级会员或明日再来",
        )

    # 2. 起卦
    hexagram_result = cast_hexagram()

    # 提取关键字段用于数据库存储
    original = hexagram_result["original"]
    changing_lines: list[int] = hexagram_result.get("changing_lines") or []
    transformed = hexagram_result.get("transformed")
    mutual = hexagram_result.get("mutual") or {}
    rarity: str = hexagram_result.get("rarity", "中平")

    # 3. 保存 Reading 记录（judgment_cn 暂为空）
    reading = Reading(
        user_id=current_user.id,
        question=request.question,
        hexagram_data=hexagram_result,
        hexagram_orig_name=original["name"],
        hexagram_orig_lines="".join(str(v) for v in original["lines"]),
        changing_lines=changing_lines,
        hexagram_trans_name=transformed["name"] if transformed else None,
        hexagram_mutual_name=mutual.get("name", ""),
        rarity=rarity,
        judgment_cn=None,  # LLM 调用后再填充
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)

    # 4. 调用 LLM 生成判词（降级模式：失败不阻塞）
    error_msg: str | None = None
    try:
        system_prompt, user_message = build_judgment_prompt(
            request.question, hexagram_result
        )
        judgment = await call_llm(system_prompt, user_message)
        reading.judgment_cn = judgment
        await db.commit()
        await db.refresh(reading)
    except LLMError as e:
        logger.warning("LLM 判词生成失败（降级模式），reading_id=%s: %s", reading.id, e)
        error_msg = str(e)
    except Exception as e:
        logger.error("LLM 判词生成未知异常（降级模式），reading_id=%s: %s", reading.id, e)
        error_msg = str(e)

    # 5. 扣减配额（起卦成功后扣减）
    await deduct_quota(current_user, db)

    # 6. 构建响应
    response = _format_reading(reading)

    # LLM 失败时附加 error 标注
    if error_msg is not None:
        response["error"] = error_msg

    return response


@router.get("", response_model=DivinationListResponse)
async def list_divinations(
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """分页获取当前用户的占卜历史，按时间倒序排列。

    Args:
        page: 页码（1 起）。
        limit: 每页记录数（1-100）。
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        DivinationListResponse: 含 items、total、page、limit。
    """
    # 查询总数
    count_result = await db.execute(
        select(func.count(Reading.id)).where(Reading.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    # 分页查询
    offset = (page - 1) * limit
    result = await db.execute(
        select(Reading)
        .where(Reading.user_id == current_user.id)
        .order_by(Reading.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    readings = result.scalars().all()

    items = [_format_reading(r) for r in readings]

    return DivinationListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{reading_id}", response_model=DivinationResponse)
async def get_divination(
    reading_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单次占卜详情。

    只能查看自己的占卜记录，查看他人的返回 404（防止信息泄露）。

    Args:
        reading_id: 占卜记录 UUID 字符串。
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        DivinationResponse: 占卜详情。

    Raises:
        HTTPException 404: 记录不存在或不属于当前用户。
    """
    # 校验 UUID 格式
    from uuid import UUID

    try:
        rid = UUID(reading_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    result = await db.execute(select(Reading).where(Reading.id == rid))
    reading = result.scalar_one_or_none()

    # 记录不存在 或 不属于当前用户 → 统一返回 404
    if reading is None or reading.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    return _format_reading(reading)


@router.get("/{reading_id}/interpretation", response_model=InterpretationResponse)
async def get_interpretation(
    reading_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取白话解卦解读。

    按需生成、缓存复用的设计模式：
    - 如果已有缓存（reading.interpretation 不为空），直接返回。
    - 如果没有，调用 LLM 生成，缓存到 reading.interpretation，返回。
    - 判词不存在时返回 400（先有判词才有解卦）。
    - 只能查看自己的占卜记录。

    Args:
        reading_id: 占卜记录 UUID 字符串。
        current_user: 当前认证用户。
        db: 数据库异步会话。

    Returns:
        InterpretationResponse: 含 reading_id、解读文本、是否缓存标记。

    Raises:
        HTTPException 400: 该记录尚无判词，无法生成解读。
        HTTPException 404: 记录不存在或不属于当前用户。
        HTTPException 502: LLM 调用失败。
    """
    from uuid import UUID

    # 1. 校验 UUID 格式
    try:
        rid = UUID(reading_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    # 2. 查询记录
    result = await db.execute(select(Reading).where(Reading.id == rid))
    reading = result.scalar_one_or_none()

    # 记录不存在 或 不属于当前用户 → 统一返回 404
    if reading is None or reading.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="占卜记录不存在",
        )

    # 3. 判词检查：没有判词无法解读
    if not reading.judgment_cn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该占卜记录尚无判词，无法生成解读。请等待判词生成完成后再试。",
        )

    # 4. 缓存命中：直接返回
    if reading.interpretation:
        return InterpretationResponse(
            reading_id=str(reading.id),
            interpretation=reading.interpretation,
            cached=True,
        )

    # 5. 缓存未命中：调用 LLM 生成解读
    try:
        system_prompt, user_message = build_interpretation_prompt(
            reading.question, reading.hexagram_data or {}
        )
        interpretation_text = await call_llm(system_prompt, user_message)
    except LLMError as e:
        logger.error("LLM 解卦解读生成失败，reading_id=%s: %s", reading.id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM 解读生成失败: {e}",
        )
    except Exception as e:
        logger.error("LLM 解卦解读生成未知异常，reading_id=%s: %s", reading.id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"解读服务暂时不可用: {e}",
        )

    # 6. 缓存解读结果
    reading.interpretation = interpretation_text
    await db.commit()

    return InterpretationResponse(
        reading_id=str(reading.id),
        interpretation=interpretation_text,
        cached=False,
    )
