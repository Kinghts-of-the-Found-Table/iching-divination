# TASK-005b：解卦解读端点

- **任务ID**：TASK-005b
- **依赖**：TASK-005 ✅（占卜 API 已完成）
- **工作目录**：`iching-divination/backend/app/divination/`

---

## 背景

判词是古诗体（已实现）。用户点击"详细解读"后，需要展开白话解析，内容包括：
- 卦象白话解读（结合用户问题）
- 变爻爻辞原文 + 白话释义
- 综合建议

端点设计为按需生成、缓存复用，跟翻译端点一样的模式。

---

## 要求

### 1. 模型更新

在 `Reading` 模型中加一个字段：

```python
# 解卦解读（白话，按需生成后缓存）
interpretation = Column(Text, nullable=True)
```

### 2. Prompt 模板

在 `divination/prompts.py` 中新增：

```python
INTERPRETATION_SYSTEM_PROMPT = """\
你是一位精通《周易》的学者。你的任务是用白话文为用户解读六爻占卜结果。

规则：
1. 用现代汉语，平实易懂，不要使用古诗文体。
2. 结构分三段：
   【卦象解读】— 结合用户问题，解释本卦的核心含义（2~3句）
   【变爻分析】— 逐一列出变爻的爻辞原文（古文），并用白话解释其含义
   【综合建议】— 结合卦象和变爻，给出务实建议（2~3句）
3. 如果有变爻，重点分析变爻。如果是静卦，重点分析本卦卦辞。
4. 引用爻辞时必须准确，使用通行本王弼注本的爻辞。
5. 不给出绝对化的预测断言。
6. 不涉及政治、暴力、色情内容。
7. 总字数控制在 300~500 字。
"""

INTERPRETATION_USER_TEMPLATE = """\
用户问题：{question}

本卦：{original_name}（上{trigram_upper}下{trigram_lower}）
{changing_info}
之卦：{transformed_name}
互卦：{mutual_name}

请为此次占卜撰写白话解读。"""

def build_interpretation_prompt(question: str, hexagram_result: dict) -> tuple[str, str]:
    """构建解卦解读 prompt"""
    ...
```

### 3. API 端点

在 `divination/router.py` 中新增：

```python
@router.get("/{reading_id}/interpretation")
async def get_interpretation(
    reading_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取白话解卦解读。
    
    - 如果已有缓存（reading.interpretation 不为空），直接返回
    - 如果没有，调用 LLM 生成，缓存到 reading.interpretation，返回
    - 判词不存在时返回 400（先有判词才有解卦）
    - 只能查看自己的占卜
    """
```

响应格式：
```python
class InterpretationResponse(BaseModel):
    reading_id: str
    interpretation: str
    cached: bool
```

---

## 约束

- 解读内容用词平实，不卖弄玄学
- 爻辞引用准确
- 生成后缓存，不重复调用 LLM
- LLM 调用失败返回 502

---

## 输出

- `backend/app/divination/models.py` — 加 interpretation 字段
- `backend/app/divination/prompts.py` — 加解读 prompt
- `backend/app/divination/router.py` — 加解读端点

---

## 完成标准

- [ ] GET /api/divination/{id}/interpretation 有缓存时直接返回
- [ ] 无缓存时调用 LLM 生成并缓存
- [ ] 解读内容包含卦象解读 + 变爻分析 + 综合建议三段
- [ ] 爻辞原文准确引用
- [ ] 第二次请求同一 reading 返回 cached=true
