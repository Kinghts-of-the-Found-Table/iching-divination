# TASK-004：LLM 调用封装 + 判词 Prompt 模板

- **任务ID**：TASK-004
- **依赖**：TASK-002（项目骨架已完成）
- **工作目录**：`iching-divination/backend/app/llm/` + `backend/app/divination/`
- **输出文件**：`llm/client.py`、`divination/prompts.py`

---

## 背景

占卜 API 需要调用 LLM 生成古诗体判词和翻译。本模块封装 LLM 调用和 prompt 模板。**Prompt 模板必须服务端隐藏，API 永远只返回生成的判词文本。**

---

## 要求

### 1. `llm/client.py` — LLM 调用封装

```python
import httpx
from app.config import settings

async def call_llm(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.8,
    max_tokens: int = 1024,
) -> str:
    """
    调用 LLM API，返回纯文本响应。
    
    Args:
        system_prompt: 系统提示词
        user_message: 用户消息
        temperature: 创造性参数（判词用 0.8，翻译用 0.3）
        max_tokens: 最大输出 token
    
    Returns:
        LLM 生成的文本
    
    Raises:
        LLMError: API Key 未配置、网络错误、API 返回错误时抛出
    """
```

#### 实现细节

- 使用 `httpx.AsyncClient` 异步请求
- API 地址、Key、模型名从 `settings` 读取
- 请求格式：
  ```json
  {
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "temperature": 0.8,
    "max_tokens": 1024
  }
  ```
- 超时设置：连接 10 秒，读取 30 秒
- 自动重试：网络错误重试 1 次（间隔 2 秒）
- 响应解析：从 `choices[0].message.content` 提取文本
- 如果 `settings.LLM_API_KEY` 为空，抛出明确错误 `LLMError("LLM API Key 未配置，请在 .env 中设置 LLM_API_KEY")`

#### 自定义异常

```python
class LLMError(Exception):
    """LLM 调用异常"""
    pass
```

### 2. `divination/prompts.py` — 判词 Prompt 模板

**此文件是安全敏感文件。只在服务端加载，绝不通过 API 返回给前端。**

```python
# 判词生成的系统提示词
JUDGMENT_SYSTEM_PROMPT = """
你是一位精通《周易》六爻占卜的资深命理师，继承了宋代邵雍《梅花易数》的文风传统。
你的任务是为求卦者撰写判词。

规则：
1. 判词形式为七言或五言古诗，四句到八句，讲究对仗和韵律。
2. 内容必须紧扣卦象含义，引用卦名和关键爻辞的意象。
3. 语言古雅但不晦涩，让现代读者能感受到意境。
4. 判词需包含：卦象总断（2句）+ 所问之事的指向（2~4句）+ 吉凶暗示（2句）。
5. 不可给出绝对化的"一定会怎样"的断言，留有余地。
6. 不可涉及政治、暴力、色情内容。
7. 如果问题是戏谑或无意义的，仍然以庄重的态度回应，但可在判词中委婉提示。
8. 只输出判词文本，不要加任何解释、注释、前缀。
"""

# 判词生成的用户消息模板
JUDGMENT_USER_TEMPLATE = """
求卦者的问题：{question}

所得卦象：
  本卦：{original_name}（上{trigram_upper}下{trigram_lower}）
  变爻：{changing_lines_text}
  之卦：{transformed_name}
  互卦：{mutual_name}

请为此卦撰写判词。
"""

def build_judgment_prompt(question: str, hexagram_result: dict) -> tuple[str, str]:
    """
    根据用户问题和排盘结果构建 LLM 调用的 prompt。
    
    Returns:
        (system_prompt, user_message) 元组
    """
    # 格式化变爻信息
    changing = hexagram_result.get("changing_lines") or []
    if changing:
        lines_text = "、".join(f"第{pos+1}爻" for pos in changing)
    else:
        lines_text = "无变爻（静卦）"
    
    user_message = JUDGMENT_USER_TEMPLATE.format(
        question=question,
        original_name=hexagram_result["original"]["name"],
        trigram_upper=hexagram_result["original"]["trigram_upper"],
        trigram_lower=hexagram_result["original"]["trigram_lower"],
        changing_lines_text=lines_text,
        transformed_name=hexagram_result.get("transformed", {}).get("name", "无"),
        mutual_name=hexagram_result.get("mutual", {}).get("name", "无"),
    )
    
    return JUDGMENT_SYSTEM_PROMPT, user_message
```

### 3. `translation/prompts.py` — 翻译 Prompt 模板

```python
TRANSLATION_SYSTEM_PROMPT = """
你是一位精通中国古典文学的翻译家。
你的任务是将六爻判词从中文翻译成目标语言。

规则：
1. 保留古诗的韵律感和意象，不逐字直译。
2. 对于卦名和专业术语，保留中文原文并在括号内解释。
3. 翻译后的文本应自然流畅，让目标语言读者能理解其意境。
4. 只输出翻译文本，不要加任何解释。
"""

TRANSLATION_USER_TEMPLATE = """
请将以下六爻判词翻译成{language}：

{judgment}

（卦象背景：本卦 {original_name}，{changing_info}）
"""

def build_translation_prompt(
    judgment: str,
    language: str,
    hexagram_result: dict,
) -> tuple[str, str]:
    """构建翻译 prompt"""
    ...
```

---

## 约束

- httpx 异步调用，不阻塞事件循环
- `prompts.py` 内容不可在 API 响应中返回
- `LLMError` 异常应在调用方（router）被捕获并返回友好的错误信息
- API Key 空值时给出明确错误，不要让请求发出去再报 401
- 类型注解完整
- docstring 用中文

---

## 自测

```bash
# 设置 API Key（使用真实 Key）
export LLM_API_KEY=sk-xxx

cd backend
python -c "
import asyncio
from app.llm.client import call_llm

async def test():
    result = await call_llm(
        system_prompt='你是一位诗人。',
        user_message='写一首关于秋天的五言绝句。',
        max_tokens=200,
    )
    print(result)

asyncio.run(test())
"
```

---

## 输出

- `backend/app/llm/__init__.py` — 导出 `call_llm`, `LLMError`
- `backend/app/llm/client.py`
- `backend/app/divination/prompts.py`
- `backend/app/translation/__init__.py`
- `backend/app/translation/prompts.py`

---

## 完成标准

- [ ] `call_llm()` 可调用 LLM 并返回文本
- [ ] API Key 未配置时抛出明确错误
- [ ] 网络错误时自动重试 1 次
- [ ] `build_judgment_prompt()` 正确格式化用户问题和卦象信息
- [ ] `build_translation_prompt()` 支持中→英翻译
- [ ] Prompt 模板不通过 API 暴露
