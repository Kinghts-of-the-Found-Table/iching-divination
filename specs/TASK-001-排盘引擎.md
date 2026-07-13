# TASK-001：六爻排盘引擎 + 64 卦数据表

- **任务ID**：TASK-001
- **依赖**：无
- **工作目录**：`iching-divination/backend/app/divination/`
- **输出文件**：`engine.py`、`data.py`、`__init__.py`
- **测试文件**：`iching-divination/backend/tests/test_engine.py`

---

## 背景

这是整个占卜系统的地基。前端摇卦动画完成后，后端调用本模块获取真实的六爻排盘结果。排盘结果会传给 LLM 生成判词。算法的正确性是整个产品的信任基础。

---

## 输入

无（随机起卦）。但函数签名应接受可选的随机种子，方便测试。

---

## 要求

### 1. `data.py` — 64 卦数据表

定义以下数据结构：

```python
# 八卦（三爻）
TRIGRAMS = {
    "乾": {"binary": "111", "element": "金", "nature": "天"},
    "兑": {"binary": "110", "element": "金", "nature": "泽"},
    "离": {"binary": "101", "element": "火", "nature": "火"},
    "震": {"binary": "100", "element": "木", "nature": "雷"},
    "巽": {"binary": "011", "element": "木", "nature": "风"},
    "坎": {"binary": "010", "element": "水", "nature": "水"},
    "艮": {"binary": "001", "element": "土", "nature": "山"},
    "坤": {"binary": "000", "element": "土", "nature": "地"},
}

# 64 卦查找表
# key: 六位二进制字符串，从初爻到上爻（左=初爻，右=上爻），1=阳 0=阴
# 例如 "111111" = 乾为天，"000000" = 坤为地
HEXAGRAMS = {
    "111111": {
        "name": "乾为天",
        "trigram_upper": "乾",
        "trigram_lower": "乾",
        "description": "刚健中正，纯阳至健",
        "rarity": "SSR",       # 稀有度：N / R / SR / SSR
    },
    "000000": {
        "name": "坤为地",
        "trigram_upper": "坤",
        "trigram_lower": "坤",
        "description": "柔顺伸展，厚德载物",
        "rarity": "SSR",
    },
    # ... 全部 64 卦（2^6 = 64）
}
```

- 64 卦数据必须完整，不可遗漏
- 卦名使用标准中文名称（如"风雷益"而非"益卦"）
- 稀有度标注规则：乾、坤为 SSR；特殊卦象（泰、否、既济、未济等 8 个左右）为 SR；大部分为 R；少数凶卦为 N
- description 控制在 8~12 字

### 2. `engine.py` — 排盘算法

#### 核心函数

```python
def cast_hexagram(seed: int | None = None) -> dict:
    """
    三钱法起卦。
    模拟 3 枚铜钱抛掷 6 次，从初爻到上爻依次生成。
    
    每爻规则：
    - 铜钱正面（阳）= 3，反面（阴）= 2
    - 三枚和 = 6(老阴⚋→变)、7(少阳⚊)、8(少阴⚋)、9(老阳⚊→变)
    
    Returns:
        {
            "original": {
                "name": "风雷益",
                "binary": "100011",     # 初爻在右
                "lines": [7, 8, 8, 9, 7, 7],  # [初爻, ..., 上爻]
                "trigram_upper": "巽",
                "trigram_lower": "震",
            },
            "changing_lines": [3],      # 变爻位置，0-indexed 从初爻起
            "transformed": {            # 之卦，无变爻时为 null
                "name": "风火家人",
                "binary": "100111",
                "lines": [7, 8, 7, 9, 7, 7],
            },
            "mutual": {                 # 互卦
                "name": "山地剥",
                "binary": "000001",
            },
            "rarity": "R",
        }
    """
```

#### 关键算法细节

1. **随机性**：使用 Python `random` 模块。如有 seed 参数则 `random.seed(seed)`。每次抛掷 3 枚铜钱，每枚独立随机（`random.choice([2, 3])`），求和。

2. **变爻处理**：line=6 或 line=9 的位置标记为变爻。变爻位置翻转（6→阳，9→阴）得之卦。无变爻时 `transformed` 为 `null`（静卦）。

3. **互卦**：从本卦的六爻中取第 2,3,4 爻组成下互卦（三爻），第 3,4,5 爻组成上互卦（三爻），合成六爻查表得互卦名。

4. **查表**：六爻 binary 字符串（如 `"100011"`）查 `data.HEXAGRAMS` 得卦名等信息。

5. **稀有度顺延**：本卦有变爻时，最终稀有度取本卦和之卦中较高的。

#### 辅助函数

```python
def hexagram_by_name(name: str) -> dict | None:
    """根据卦名反查卦象数据"""

def get_hexagram_info(binary: str) -> dict:
    """根据六爻 binary 获取完整卦象信息"""
```

---

## 约束

- 纯 Python，零外部依赖（标准库 `random` 即可）
- 类型注解必须完整
- docstring 用中文
- `data.py` 的 64 卦数据必须完整，不可有占位符
- 稀有度至少区分 SSR（2 卦）、SR（8 卦左右）、R（大部分）、N（少数凶卦）

---

## 输出

### 源文件
- `backend/app/divination/__init__.py` — 导出 `cast_hexagram`, `hexagram_by_name`, `get_hexagram_info`
- `backend/app/divination/data.py` — TRIGRAMS 和 HEXAGRAMS 完整数据
- `backend/app/divination/engine.py` — 排盘算法

### 测试文件
- `backend/tests/test_engine.py`

### 测试要点
- 随机起卦 1000 次，验证所有输出的 binary 都在 HEXAGRAMS 中
- 验证变爻逻辑：line=6 或 9 的位置一定在 changing_lines 中
- 验证互卦提取逻辑：用固定 seed 验证已知结果
- 验证无变爻时 transformed 为 null
- 验证 seed 参数可复现

---

## 完成标准

- [ ] `cast_hexagram()` 可调用并返回完整结构
- [ ] 64 卦数据表完整，binary → 卦名全部可查
- [ ] 互卦算法正确
- [ ] 变爻逻辑正确
- [ ] 全部测试通过
- [ ] 运行 `python -c "from app.divination import cast_hexagram; print(cast_hexagram())"` 输出有效结果
