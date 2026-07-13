"""
六爻占卜 — 八卦与六十四卦数据表。

本模块定义八卦（三爻）的符号体系和完整的 64 卦查找表，
是排盘引擎的数据基础。每卦包含名、二进制编码、上下卦、释义与稀有度。
"""

# =============================================================================
# 八卦（三爻）
# =============================================================================

TRIGRAMS: dict[str, dict[str, str]] = {
    "乾": {"binary": "111", "element": "金", "nature": "天"},
    "兑": {"binary": "110", "element": "金", "nature": "泽"},
    "离": {"binary": "101", "element": "火", "nature": "火"},
    "震": {"binary": "100", "element": "木", "nature": "雷"},
    "巽": {"binary": "011", "element": "木", "nature": "风"},
    "坎": {"binary": "010", "element": "水", "nature": "水"},
    "艮": {"binary": "001", "element": "土", "nature": "山"},
    "坤": {"binary": "000", "element": "土", "nature": "地"},
}

# 根据三爻二进制反查卦名
_TRIGRAM_BY_BINARY: dict[str, str] = {
    v["binary"]: k for k, v in TRIGRAMS.items()
}


def trigram_by_binary(binary: str) -> str | None:
    """根据三爻二进制字符串反查八卦名称。"""
    return _TRIGRAM_BY_BINARY.get(binary)


# =============================================================================
# 稀有度常量
# =============================================================================

RARITY_ORDER: dict[str, int] = {
    "慎": 1,
    "中平": 2,
    "吉": 3,
    "大吉": 4,
}

# =============================================================================
# 六十四卦数据表
# =============================================================================
# key: 六位二进制字符串，从左到右依次为初爻→上爻
#      1 = 阳爻（少阳 7 / 老阳 9）
#      0 = 阴爻（少阴 8 / 老阴 6）
#
# 命名规则：
#   - 上下卦相同：[卦名]为[自然象]，如"乾为天"
#   - 上下卦不同：[上卦自然象][下卦自然象][卦名]，如"风雷益"

HEXAGRAMS: dict[str, dict[str, object]] = {
    # ──────────────────────────────────────────────
    # 上卦 乾（天） — 8 卦
    # ──────────────────────────────────────────────
    "111111": {
        "name": "乾为天",
        "trigram_upper": "乾",
        "trigram_lower": "乾",
        "description": "刚健中正，纯阳至健",
        "rarity": "大吉",
    },
    "110111": {
        "name": "天泽履",
        "trigram_upper": "乾",
        "trigram_lower": "兑",
        "description": "履险蹈危，慎言慎行",
        "rarity": "中平",
    },
    "101111": {
        "name": "天火同人",
        "trigram_upper": "乾",
        "trigram_lower": "离",
        "description": "与人和同，大同之象",
        "rarity": "中平",
    },
    "100111": {
        "name": "天雷无妄",
        "trigram_upper": "乾",
        "trigram_lower": "震",
        "description": "真实无伪，不可妄为",
        "rarity": "中平",
    },
    "011111": {
        "name": "天风姤",
        "trigram_upper": "乾",
        "trigram_lower": "巽",
        "description": "不期而遇，风行天下",
        "rarity": "中平",
    },
    "010111": {
        "name": "天水讼",
        "trigram_upper": "乾",
        "trigram_lower": "坎",
        "description": "争讼不和，慎始慎终",
        "rarity": "慎",
    },
    "001111": {
        "name": "天山遁",
        "trigram_upper": "乾",
        "trigram_lower": "艮",
        "description": "退避隐遁，小人渐长",
        "rarity": "中平",
    },
    "000111": {
        "name": "天地否",
        "trigram_upper": "乾",
        "trigram_lower": "坤",
        "description": "天地不交，闭塞不通",
        "rarity": "吉",
    },

    # ──────────────────────────────────────────────
    # 上卦 兑（泽） — 8 卦
    # ──────────────────────────────────────────────
    "111110": {
        "name": "泽天夬",
        "trigram_upper": "兑",
        "trigram_lower": "乾",
        "description": "决断果敢，刚决柔也",
        "rarity": "中平",
    },
    "110110": {
        "name": "兑为泽",
        "trigram_upper": "兑",
        "trigram_lower": "兑",
        "description": "喜悦和乐，朋友讲习",
        "rarity": "中平",
    },
    "101110": {
        "name": "泽火革",
        "trigram_upper": "兑",
        "trigram_lower": "离",
        "description": "变革更新，除旧布新",
        "rarity": "中平",
    },
    "100110": {
        "name": "泽雷随",
        "trigram_upper": "兑",
        "trigram_lower": "震",
        "description": "随顺时势，择善而从",
        "rarity": "中平",
    },
    "011110": {
        "name": "泽风大过",
        "trigram_upper": "兑",
        "trigram_lower": "巽",
        "description": "大为过甚，过犹不及",
        "rarity": "慎",
    },
    "010110": {
        "name": "泽水困",
        "trigram_upper": "兑",
        "trigram_lower": "坎",
        "description": "困厄窘迫，身陷困境",
        "rarity": "慎",
    },
    "001110": {
        "name": "泽山咸",
        "trigram_upper": "兑",
        "trigram_lower": "艮",
        "description": "感而遂通，男女感应",
        "rarity": "中平",
    },
    "000110": {
        "name": "泽地萃",
        "trigram_upper": "兑",
        "trigram_lower": "坤",
        "description": "聚集荟萃，精英汇聚",
        "rarity": "中平",
    },

    # ──────────────────────────────────────────────
    # 上卦 离（火） — 8 卦
    # ──────────────────────────────────────────────
    "111101": {
        "name": "火天大有",
        "trigram_upper": "离",
        "trigram_lower": "乾",
        "description": "丰盛富有，如日中天",
        "rarity": "中平",
    },
    "110101": {
        "name": "火泽睽",
        "trigram_upper": "离",
        "trigram_lower": "兑",
        "description": "乖离不合，求同存异",
        "rarity": "中平",
    },
    "101101": {
        "name": "离为火",
        "trigram_upper": "离",
        "trigram_lower": "离",
        "description": "光明附丽，柔顺中正",
        "rarity": "中平",
    },
    "100101": {
        "name": "火雷噬嗑",
        "trigram_upper": "离",
        "trigram_lower": "震",
        "description": "咬合决断，明罚敕法",
        "rarity": "中平",
    },
    "011101": {
        "name": "火风鼎",
        "trigram_upper": "离",
        "trigram_lower": "巽",
        "description": "鼎立新局，革故鼎新",
        "rarity": "中平",
    },
    "010101": {
        "name": "火水未济",
        "trigram_upper": "离",
        "trigram_lower": "坎",
        "description": "事尚未成，未来可期",
        "rarity": "吉",
    },
    "001101": {
        "name": "火山旅",
        "trigram_upper": "离",
        "trigram_lower": "艮",
        "description": "行旅在外，客居他乡",
        "rarity": "中平",
    },
    "000101": {
        "name": "火地晋",
        "trigram_upper": "离",
        "trigram_lower": "坤",
        "description": "前进光明，日出地上",
        "rarity": "中平",
    },

    # ──────────────────────────────────────────────
    # 上卦 震（雷） — 8 卦
    # ──────────────────────────────────────────────
    "111100": {
        "name": "雷天大壮",
        "trigram_upper": "震",
        "trigram_lower": "乾",
        "description": "壮大强盛，刚健而动",
        "rarity": "吉",
    },
    "110100": {
        "name": "雷泽归妹",
        "trigram_upper": "震",
        "trigram_lower": "兑",
        "description": "少女归嫁，不宜轻率",
        "rarity": "中平",
    },
    "101100": {
        "name": "雷火丰",
        "trigram_upper": "震",
        "trigram_lower": "离",
        "description": "丰盛盈满，日中则昃",
        "rarity": "中平",
    },
    "100100": {
        "name": "震为雷",
        "trigram_upper": "震",
        "trigram_lower": "震",
        "description": "震惊百里，临危不乱",
        "rarity": "中平",
    },
    "011100": {
        "name": "雷风恒",
        "trigram_upper": "震",
        "trigram_lower": "巽",
        "description": "恒久不变，夫妇之道",
        "rarity": "中平",
    },
    "010100": {
        "name": "雷水解",
        "trigram_upper": "震",
        "trigram_lower": "坎",
        "description": "解除患难，险以动出",
        "rarity": "中平",
    },
    "001100": {
        "name": "雷山小过",
        "trigram_upper": "震",
        "trigram_lower": "艮",
        "description": "稍有过越，小者过也",
        "rarity": "中平",
    },
    "000100": {
        "name": "雷地豫",
        "trigram_upper": "震",
        "trigram_lower": "坤",
        "description": "愉悦和乐，顺势而动",
        "rarity": "中平",
    },

    # ──────────────────────────────────────────────
    # 上卦 巽（风） — 8 卦
    # ──────────────────────────────────────────────
    "111011": {
        "name": "风天小畜",
        "trigram_upper": "巽",
        "trigram_lower": "乾",
        "description": "小有积蓄，蓄势待发",
        "rarity": "中平",
    },
    "110011": {
        "name": "风泽中孚",
        "trigram_upper": "巽",
        "trigram_lower": "兑",
        "description": "诚信中孚，信及豚鱼",
        "rarity": "中平",
    },
    "101011": {
        "name": "风火家人",
        "trigram_upper": "巽",
        "trigram_lower": "离",
        "description": "家庭和睦，各正其位",
        "rarity": "中平",
    },
    "100011": {
        "name": "风雷益",
        "trigram_upper": "巽",
        "trigram_lower": "震",
        "description": "损上益下，利益万民",
        "rarity": "中平",
    },
    "011011": {
        "name": "巽为风",
        "trigram_upper": "巽",
        "trigram_lower": "巽",
        "description": "谦逊顺从，风行草偃",
        "rarity": "中平",
    },
    "010011": {
        "name": "风水涣",
        "trigram_upper": "巽",
        "trigram_lower": "坎",
        "description": "涣散分离，风行水上",
        "rarity": "中平",
    },
    "001011": {
        "name": "风山渐",
        "trigram_upper": "巽",
        "trigram_lower": "艮",
        "description": "循序渐进，女子归吉",
        "rarity": "中平",
    },
    "000011": {
        "name": "风地观",
        "trigram_upper": "巽",
        "trigram_lower": "坤",
        "description": "观察审视，风行地上",
        "rarity": "中平",
    },

    # ──────────────────────────────────────────────
    # 上卦 坎（水） — 8 卦
    # ──────────────────────────────────────────────
    "111010": {
        "name": "水天需",
        "trigram_upper": "坎",
        "trigram_lower": "乾",
        "description": "待机而动，耐心守候",
        "rarity": "中平",
    },
    "110010": {
        "name": "水泽节",
        "trigram_upper": "坎",
        "trigram_lower": "兑",
        "description": "节制有度，不逾规矩",
        "rarity": "中平",
    },
    "101010": {
        "name": "水火既济",
        "trigram_upper": "坎",
        "trigram_lower": "离",
        "description": "事已成就，盛极将衰",
        "rarity": "吉",
    },
    "100010": {
        "name": "水雷屯",
        "trigram_upper": "坎",
        "trigram_lower": "震",
        "description": "万物始生，艰难初启",
        "rarity": "中平",
    },
    "011010": {
        "name": "水风井",
        "trigram_upper": "坎",
        "trigram_lower": "巽",
        "description": "井养不穷，修身养民",
        "rarity": "中平",
    },
    "010010": {
        "name": "坎为水",
        "trigram_upper": "坎",
        "trigram_lower": "坎",
        "description": "重重险阻，习坎行险",
        "rarity": "中平",
    },
    "001010": {
        "name": "水山蹇",
        "trigram_upper": "坎",
        "trigram_lower": "艮",
        "description": "艰难险阻，跛足难行",
        "rarity": "慎",
    },
    "000010": {
        "name": "水地比",
        "trigram_upper": "坎",
        "trigram_lower": "坤",
        "description": "亲附和合，团结互助",
        "rarity": "中平",
    },

    # ──────────────────────────────────────────────
    # 上卦 艮（山） — 8 卦
    # ──────────────────────────────────────────────
    "111001": {
        "name": "山天大畜",
        "trigram_upper": "艮",
        "trigram_lower": "乾",
        "description": "大积大蓄，厚积薄发",
        "rarity": "中平",
    },
    "110001": {
        "name": "山泽损",
        "trigram_upper": "艮",
        "trigram_lower": "兑",
        "description": "损下益上，损有余补",
        "rarity": "中平",
    },
    "101001": {
        "name": "山火贲",
        "trigram_upper": "艮",
        "trigram_lower": "离",
        "description": "文饰美化，华而有实",
        "rarity": "中平",
    },
    "100001": {
        "name": "山雷颐",
        "trigram_upper": "艮",
        "trigram_lower": "震",
        "description": "颐养天年，养正之道",
        "rarity": "中平",
    },
    "011001": {
        "name": "山风蛊",
        "trigram_upper": "艮",
        "trigram_lower": "巽",
        "description": "败坏中生，拨乱反正",
        "rarity": "中平",
    },
    "010001": {
        "name": "山水蒙",
        "trigram_upper": "艮",
        "trigram_lower": "坎",
        "description": "蒙昧初开，启蒙发智",
        "rarity": "中平",
    },
    "001001": {
        "name": "艮为山",
        "trigram_upper": "艮",
        "trigram_lower": "艮",
        "description": "停止知止，适时而止",
        "rarity": "中平",
    },
    "000001": {
        "name": "山地剥",
        "trigram_upper": "艮",
        "trigram_lower": "坤",
        "description": "层层剥落，小人道长",
        "rarity": "慎",
    },

    # ──────────────────────────────────────────────
    # 上卦 坤（地） — 8 卦
    # ──────────────────────────────────────────────
    "111000": {
        "name": "地天泰",
        "trigram_upper": "坤",
        "trigram_lower": "乾",
        "description": "天地交泰，万事亨通",
        "rarity": "吉",
    },
    "110000": {
        "name": "地泽临",
        "trigram_upper": "坤",
        "trigram_lower": "兑",
        "description": "居高临下，亲临督导",
        "rarity": "吉",
    },
    "101000": {
        "name": "地火明夷",
        "trigram_upper": "坤",
        "trigram_lower": "离",
        "description": "光明受伤，晦暗之时",
        "rarity": "慎",
    },
    "100000": {
        "name": "地雷复",
        "trigram_upper": "坤",
        "trigram_lower": "震",
        "description": "一阳来复，万象更新",
        "rarity": "吉",
    },
    "011000": {
        "name": "地风升",
        "trigram_upper": "坤",
        "trigram_lower": "巽",
        "description": "上升渐进，积小成大",
        "rarity": "中平",
    },
    "010000": {
        "name": "地水师",
        "trigram_upper": "坤",
        "trigram_lower": "坎",
        "description": "行险而顺，师出有名",
        "rarity": "中平",
    },
    "001000": {
        "name": "地山谦",
        "trigram_upper": "坤",
        "trigram_lower": "艮",
        "description": "谦逊自持，卑以自牧",
        "rarity": "吉",
    },
    "000000": {
        "name": "坤为地",
        "trigram_upper": "坤",
        "trigram_lower": "坤",
        "description": "柔顺伸展，厚德载物",
        "rarity": "大吉",
    },
}

# 构建卦名→binary 的反查索引
_NAME_TO_BINARY: dict[str, str] = {
    v["name"]: k for k, v in HEXAGRAMS.items()  # type: ignore[arg-type]
}
