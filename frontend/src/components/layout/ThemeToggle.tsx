"use client";

/**
 * 主题切换浮动按钮
 *
 * 屏幕右下角悬浮，点击在两套皮肤之间切换。
 * 瑞士风显示 🌙（切到二次元），二次元显示 ☀️（切回瑞士）。
 */

import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center
        border border-[var(--color-border)] bg-[var(--color-bg-card)] text-lg
        shadow-[var(--shadow-card)] backdrop-blur-sm cursor-pointer"
      style={{
        borderRadius: "var(--radius-md)",
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={theme === "swiss" ? "切换到二次元皮肤" : "切换到瑞士风皮肤"}
      title={theme === "swiss" ? "切到二次元魔法占卜" : "切到瑞士国际主义"}
    >
      {theme === "swiss" ? "🌙" : "☀️"}
    </motion.button>
  );
}
