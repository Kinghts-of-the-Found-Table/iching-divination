"""
六爻排盘引擎测试。

覆盖：
    1. 64 卦数据表完整性校验
    2. cast_hexagram 随机起卦 1000 次合法性
    3. 变爻逻辑正确性
    4. 互卦提取算法
    5. 静卦（无变爻）处理
    6. seed 参数复现性
    7. 辅助函数 get_hexagram_info / hexagram_by_name
"""

import unittest
from collections import Counter

from app.divination.data import HEXAGRAMS, TRIGRAMS, RARITY_ORDER
from app.divination.engine import cast_hexagram, get_hexagram_info, hexagram_by_name


# =============================================================================
# 1. 数据完整性
# =============================================================================

class TestDataIntegrity(unittest.TestCase):
    """测试 64 卦数据表的完整性和一致性。"""

    def test_64_hexagrams_count(self) -> None:
        """应有恰好 64 卦。"""
        self.assertEqual(
            len(HEXAGRAMS), 64,
            f"期望 64 卦，实际 {len(HEXAGRAMS)} 卦"
        )

    def test_all_binaries_are_unique_and_valid(self) -> None:
        """所有 binary 键必须是 6 位 0/1 字符串且唯一。"""
        binaries = list(HEXAGRAMS.keys())
        self.assertEqual(
            len(binaries), len(set(binaries)),
            "binary 键存在重复"
        )
        for b in binaries:
            self.assertEqual(len(b), 6, f"binary 长度应为 6，实际: {b}")
            self.assertTrue(
                all(c in "01" for c in b),
                f"binary 含非法字符: {b}"
            )

    def test_all_trigrams_reference_valid(self) -> None:
        """每卦的 trigram_upper / trigram_lower 必须在 TRIGRAMS 中。"""
        for binary, hex_data in HEXAGRAMS.items():
            upper = hex_data["trigram_upper"]
            lower = hex_data["trigram_lower"]
            self.assertIn(upper, TRIGRAMS,
                          f"{binary} ({hex_data['name']}) 上卦 {upper} 无效")
            self.assertIn(lower, TRIGRAMS,
                          f"{binary} ({hex_data['name']}) 下卦 {lower} 无效")

    def test_all_required_fields_present(self) -> None:
        """每卦必须包含 name / trigram_upper / trigram_lower / description / rarity。"""
        required = {"name", "trigram_upper", "trigram_lower", "description", "rarity"}
        for binary, hex_data in HEXAGRAMS.items():
            missing = required - set(hex_data.keys())
            self.assertFalse(missing, f"{binary} 缺少字段: {missing}")

    def test_rarity_values_valid(self) -> None:
        """稀有度必须在 {N, R, SR, SSR} 中。"""
        valid_rarities = {"N", "R", "SR", "SSR"}
        for binary, hex_data in HEXAGRAMS.items():
            rarity = hex_data["rarity"]
            self.assertIn(
                rarity, valid_rarities,
                f"{hex_data['name']} 稀有度 {rarity} 无效"
            )

    def test_description_length(self) -> None:
        """卦辞长度应在合理范围（6~16 字）。"""
        for binary, hex_data in HEXAGRAMS.items():
            desc = str(hex_data["description"])
            self.assertTrue(
                6 <= len(desc) <= 16,
                f"{hex_data['name']} 卦辞长度 {len(desc)}，内容: {desc}"
            )

    def test_ssr_count(self) -> None:
        """SSR 卦应为 2 卦（乾为天、坤为地）。"""
        ssr = [h["name"] for h in HEXAGRAMS.values() if h["rarity"] == "SSR"]
        self.assertEqual(len(ssr), 2, f"SSR 数量应为 2，实际 {len(ssr)}: {ssr}")
        self.assertIn("乾为天", ssr)
        self.assertIn("坤为地", ssr)

    def test_sr_count(self) -> None:
        """SR 卦应有 8 卦左右（泰、否、既济、未济、复、临、谦、大壮）。"""
        sr = [h["name"] for h in HEXAGRAMS.values() if h["rarity"] == "SR"]
        expected_sr = {"地天泰", "天地否", "水火既济", "火水未济",
                       "地雷复", "地泽临", "地山谦", "雷天大壮"}
        self.assertTrue(
            expected_sr.issubset(set(sr)),
            f"缺少 SR 卦: {expected_sr - set(sr)}"
        )

    def test_binary_trigram_consistency(self) -> None:
        """每卦的 binary 拆分后应与 trigram_upper / trigram_lower 一致。"""
        from app.divination.data import trigram_by_binary

        for binary, hex_data in HEXAGRAMS.items():
            lower_bin = binary[:3]
            upper_bin = binary[3:]
            expected_lower = trigram_by_binary(lower_bin)
            expected_upper = trigram_by_binary(upper_bin)
            self.assertEqual(
                hex_data["trigram_lower"], expected_lower,
                f"{hex_data['name']}: 下卦 binary={lower_bin}, "
                f"期望 {expected_lower}，实际 {hex_data['trigram_lower']}"
            )
            self.assertEqual(
                hex_data["trigram_upper"], expected_upper,
                f"{hex_data['name']}: 上卦 binary={upper_bin}, "
                f"期望 {expected_upper}，实际 {hex_data['trigram_upper']}"
            )


# =============================================================================
# 2. cast_hexagram 函数测试
# =============================================================================

class TestCastHexagramRandom(unittest.TestCase):
    """cast_hexagram 随机起卦大规模测试。"""

    def test_1000_casts_all_valid(self) -> None:
        """随机起卦 1000 次，验证所有输出合法。"""
        for i in range(1000):
            with self.subTest(cast=i):
                result = cast_hexagram()

                # 基本结构检查
                self.assertIn("original", result)
                self.assertIn("changing_lines", result)
                # transformed 可以为 None（静卦）
                self.assertIn("transformed", result)
                self.assertIn("mutual", result)
                self.assertIn("rarity", result)

                # original 必须完整
                original = result["original"]
                self.assertIn("binary", original)
                self.assertIn("lines", original)
                self.assertIn("name", original)
                self.assertEqual(len(original["lines"]), 6)

                # binary 必须在 HEXAGRAMS 中
                self.assertIn(
                    original["binary"], HEXAGRAMS,
                    f"本卦 binary {original['binary']} 不在 64 卦表中"
                )

                # lines 值必须在 {6,7,8,9} 中
                for j, line_val in enumerate(original["lines"]):
                    self.assertIn(
                        line_val, {6, 7, 8, 9},
                        f"爻 {j} 无效值: {line_val}"
                    )

                # 互卦必须在 HEXAGRAMS 中
                mutual = result["mutual"]
                self.assertIn(
                    mutual["binary"], HEXAGRAMS,
                    f"互卦 binary {mutual['binary']} 不在 64 卦表中"
                )

                # 之卦（如有）必须在 HEXAGRAMS 中
                transformed = result["transformed"]
                if transformed is not None:
                    self.assertIn(
                        transformed["binary"], HEXAGRAMS,
                        f"之卦 binary {transformed['binary']} 不在 64 卦表中"
                    )
                    # 有变爻时，transformed 不能等于 original
                    self.assertNotEqual(
                        transformed["binary"], original["binary"],
                        "之卦不应与本卦相同"
                    )

                # 稀有度必须在合法范围
                self.assertIn(result["rarity"], {"N", "R", "SR", "SSR"})


class TestCastHexagramLogic(unittest.TestCase):
    """cast_hexagram 核心逻辑精确测试。"""

    def test_changing_lines_consistency(self) -> None:
        """变爻位置必须与 line 值一致（line=6 或 9 为变爻）。"""
        for i in range(500):
            with self.subTest(cast=i):
                result = cast_hexagram()
                lines = result["original"]["lines"]
                changing = result["changing_lines"]

                for j, val in enumerate(lines):
                    if val in (6, 9):
                        self.assertIn(
                            j, changing,
                            f"爻 {j} 值为 {val}，应在 changing_lines 中"
                        )
                    else:
                        self.assertNotIn(
                            j, changing,
                            f"爻 {j} 值为 {val}，不应在 changing_lines 中"
                        )

    def test_no_changing_lines_means_static(self) -> None:
        """无变爻时 transformed 必须为 None（静卦）。"""
        for i in range(500):
            with self.subTest(cast=i):
                result = cast_hexagram()
                if result["changing_lines"]:
                    self.assertIsNotNone(
                        result["transformed"],
                        "有变爻时 transformed 不应为 None"
                    )
                else:
                    self.assertIsNone(
                        result["transformed"],
                        "无变爻时 transformed 必须为 None"
                    )

    def test_changing_flips_yin_yang(self) -> None:
        """变爻翻转：6(老阴)→阳，9(老阳)→阴。"""
        for i in range(500):
            with self.subTest(cast=i):
                result = cast_hexagram()
                if result["transformed"] is None:
                    continue

                orig_lines = result["original"]["lines"]
                trans_lines = result["transformed"]["lines"]
                changing = result["changing_lines"]

                for j in changing:
                    if orig_lines[j] == 6:
                        # 老阴变少阳（数值 7，阴阳属性为阳）
                        self.assertEqual(
                            trans_lines[j], 7,
                            f"老阴(6) 应变 7，实际 {trans_lines[j]}"
                        )
                        self.assertEqual(result["original"]["binary"][j], "0")
                        self.assertEqual(result["transformed"]["binary"][j], "1")
                    elif orig_lines[j] == 9:
                        self.assertEqual(
                            trans_lines[j], 8,
                            f"老阳(9) 应变 8，实际 {trans_lines[j]}"
                        )
                        self.assertEqual(result["original"]["binary"][j], "1")
                        self.assertEqual(result["transformed"]["binary"][j], "0")

                # 非变爻位置应保持不变
                for j in range(6):
                    if j not in changing:
                        self.assertEqual(trans_lines[j], orig_lines[j])

    def test_seed_reproducibility(self) -> None:
        """相同 seed 产生相同结果。"""
        result1 = cast_hexagram(seed=42)
        result2 = cast_hexagram(seed=42)
        self.assertEqual(result1, result2, "相同 seed 必须产生相同结果")

    def test_different_seeds_produce_different_results(self) -> None:
        """不同 seed 极大概率产生不同结果。"""
        result1 = cast_hexagram(seed=7)
        result2 = cast_hexagram(seed=99)
        self.assertNotEqual(result1, result2, "不同 seed 应产生不同结果")

    def test_mutual_hexagram_fixed_seed(self) -> None:
        """用固定 seed 验证互卦正确性。"""
        result = cast_hexagram(seed=5)
        original_binary = result["original"]["binary"]
        mutual_binary = result["mutual"]["binary"]

        # 互卦应等于从本卦提取的 2-3-4 / 3-4-5 爻
        expected_mutual = (
            original_binary[1:4] + original_binary[2:5]
        )
        self.assertEqual(
            mutual_binary, expected_mutual,
            f"互卦 {mutual_binary} 不符合预期 {expected_mutual}"
        )
        self.assertIn(mutual_binary, HEXAGRAMS)

    def test_rarity_escalation_with_changing_lines(self) -> None:
        """有变爻时稀有度取本卦和之卦中较高者。"""
        found_escalation = False
        for seed_val in range(200):
            result = cast_hexagram(seed=seed_val)
            if result["transformed"] is not None:
                orig_rarity_rank = RARITY_ORDER[
                    HEXAGRAMS[result["original"]["binary"]]["rarity"]  # type: ignore[arg-type]
                ]
                trans_rarity_rank = RARITY_ORDER[
                    HEXAGRAMS[result["transformed"]["binary"]]["rarity"]  # type: ignore[arg-type]
                ]
                final_rarity_rank = RARITY_ORDER[result["rarity"]]
                expected_rank = max(orig_rarity_rank, trans_rarity_rank)
                self.assertEqual(
                    final_rarity_rank, expected_rank,
                    f"稀有度应取较高者: 本卦={orig_rarity_rank} "
                    f"之卦={trans_rarity_rank} 最终={final_rarity_rank}"
                )
                found_escalation = True

        self.assertTrue(found_escalation, "未找到任何有变爻的情况以验证稀有度顺延")


# =============================================================================
# 3. 辅助函数测试
# =============================================================================

class TestGetHexagramInfo(unittest.TestCase):
    """get_hexagram_info 测试。"""

    def test_valid_binary_returns_full_info(self) -> None:
        """合法 binary 返回完整卦象。"""
        info = get_hexagram_info("111111")
        self.assertEqual(info["name"], "乾为天")
        self.assertEqual(info["trigram_upper"], "乾")
        self.assertEqual(info["trigram_lower"], "乾")
        self.assertIn("description", info)
        self.assertIn("rarity", info)

    def test_invalid_binary_raises_key_error(self) -> None:
        """非法 binary 抛出 KeyError。"""
        with self.assertRaises(KeyError):
            get_hexagram_info("111112")

    def test_all_64_binaries_return_info(self) -> None:
        """所有 64 卦的 binary 都应返回有效信息。"""
        for binary in HEXAGRAMS:
            info = get_hexagram_info(binary)
            self.assertEqual(info["name"], HEXAGRAMS[binary]["name"])


class TestHexagramByName(unittest.TestCase):
    """hexagram_by_name 测试。"""

    def test_exact_name_returns_hexagram(self) -> None:
        """精确卦名返回正确数据。"""
        result = hexagram_by_name("乾为天")
        self.assertIsNotNone(result)
        self.assertEqual(result["name"], "乾为天")
        self.assertEqual(result["rarity"], "SSR")

    def test_case_sensitive(self) -> None:
        """未知卦名返回 None。"""
        self.assertIsNone(hexagram_by_name("不存在的卦"))

    def test_partial_name_returns_none(self) -> None:
        """部分匹配不返回结果。"""
        self.assertIsNone(hexagram_by_name("乾"))

    def test_all_64_names_found(self) -> None:
        """所有 64 卦名都应能反查到。"""
        for hex_data in HEXAGRAMS.values():
            name = str(hex_data["name"])
            result = hexagram_by_name(name)
            self.assertIsNotNone(result, f"无法反查卦名: {name}")
            self.assertEqual(result["name"], name)


# =============================================================================
# 4. 边界条件测试
# =============================================================================

class TestEdgeCases(unittest.TestCase):
    """边界条件与极端情况。"""

    def test_result_structure_is_json_serializable_types(self) -> None:
        """验证返回结果只包含 JSON 可序列化的类型。"""
        result = cast_hexagram(seed=1)

        def check_types(obj, path: str = "root") -> None:
            if obj is None:
                return
            if isinstance(obj, (str, int, float, bool)):
                return
            if isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_types(item, f"{path}[{i}]")
                return
            if isinstance(obj, dict):
                for k, v in obj.items():
                    check_types(v, f"{path}.{k}")
                return
            raise AssertionError(f"{path}: 不支持的返回类型 {type(obj)}")

        check_types(result)

    def test_lines_sum_distribution(self) -> None:
        """验证铜钱和值分布符合三钱法概率。

        三钱和值: 6(1/8), 7(3/8), 8(3/8), 9(1/8)
        """
        all_lines: list[int] = []
        for _ in range(6000):  # 6000 次 × 6 爻 = 36000 爻
            result = cast_hexagram()
            all_lines.extend(result["original"]["lines"])

        counter = Counter(all_lines)
        total = len(all_lines)

        for val, expected_prob in [(6, 1/8), (7, 3/8), (8, 3/8), (9, 1/8)]:
            actual_prob = counter.get(val, 0) / total
            self.assertTrue(
                abs(actual_prob - expected_prob) < 0.03,
                f"爻值 {val} 概率偏差: 期望 {expected_prob:.3f}, "
                f"实际 {actual_prob:.3f}"
            )


if __name__ == "__main__":
    unittest.main()
