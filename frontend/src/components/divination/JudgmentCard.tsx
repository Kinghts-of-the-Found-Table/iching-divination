"use client";

/**
 * 判词展示卡片
 *
 * 两种状态：
 * 1. AWAITING — 正在等待 LLM 判词，"⋯ 推演天机 ⋯" 加载态（三点脉冲动画）
 * 2. JUDGMENT — 判词逐字浮现（typewriter 效果）
 *
 * 包含稀有度标签、查看详细解读 / 再次占卜按钮。
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RarityEffect, { type Rarity } from "./RarityEffect";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** JudgmentCard 组件属性 */
export interface JudgmentCardProps {
  /** 当前状态：awaiting 或 judgment */
  phase: "awaiting" | "judgment";
  /** 卦名 */
  hexagramName: string;
  /** 稀有度 */
  rarity: Rarity;
  /** 判词全文（phase=judgment 时可用） */
  judgment: string;
  /** 点击"查看详细解读" */
  onExpand: () => void;
  /** 点击"再次占卜" */
  onRetry: () => void;
  /** 是否有解卦数据（控制"查看详细解读"是否可点击） */
  canExpand?: boolean;
}

/* =========================================================================
 * 子组件：AWAITING 加载态
 * ========================================================================= */

/** 三点脉冲动画 */
function AwaitingDots() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <p className="font-[family-name:var(--font-noto-serif)] text-lg text-ink">
        ⋯ 推演天机 ⋯
      </p>
      {/* 三点依次亮起 */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block w-2 h-2 rounded-full bg-gold"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * 子组件：稀有度标签
 * ========================================================================= */

/** 稀有度标签 */
function RarityLabel({ rarity }: { rarity: Rarity }) {
  const labelMap: Record<Rarity, { text: string; className: string }> = {
    N: {
      text: "N",
      className: "text-warning border-warning/30",
    },
    R: {
      text: "R",
      className: "text-ink-light border-ink-light/20",
    },
    SR: {
      text: "SR",
      className: "text-gold border-gold",
    },
    SSR: {
      text: "SSR",
      className: "text-gold-light border-gold-light bg-gold-light/5",
    },
  };

  const { text, className } = labelMap[rarity];

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[10px] font-[family-name:var(--font-body)] tracking-wider ${className}`}
    >
      {text}
    </span>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/** 字符显示速度配置 */
const CHAR_SPEED = 50; // 基础速度（ms/字）
const PUNCTUATION_PAUSE: Record<string, number> = {
  "。": 300,
  "，": 150,
  "；": 200,
  "：": 200,
  "\n": 400,
  "！": 250,
  "？": 250,
  "、": 100,
};

/**
 * 判词卡片。
 *
 * AWAITING 阶段显示加载动画；JUDGMENT 阶段执行 typewriter 效果。
 * 外层由 RarityEffect 包裹以展示稀有度视觉差异。
 */
export default function JudgmentCard({
  phase,
  hexagramName,
  rarity,
  judgment,
  onExpand,
  onRetry,
  canExpand = true,
}: JudgmentCardProps) {
  /** 已显示的字符数（typewriter 进度） */
  const [displayedCount, setDisplayedCount] = useState(0);
  /** typewriter 是否已完成 */
  const [typewriterDone, setTypewriterDone] = useState(false);
  /** 计时器引用 */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 下一个字符的延迟（根据字符类型变化） */
  const delayRef = useRef<number>(CHAR_SPEED);

  /* 重置 typewriter 当判词变化 */
  useEffect(() => {
    setDisplayedCount(0);
    setTypewriterDone(false);
  }, [judgment]);

  /* Typewriter 逐字动画 */
  useEffect(() => {
    if (phase !== "judgment" || !judgment || displayedCount >= judgment.length) {
      if (displayedCount >= judgment.length && judgment.length > 0) {
        setTypewriterDone(true);
      }
      return;
    }

    const char = judgment[displayedCount];
    delayRef.current = PUNCTUATION_PAUSE[char] ?? CHAR_SPEED;

    timerRef.current = setTimeout(() => {
      setDisplayedCount((prev) => prev + 1);
    }, delayRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, judgment, displayedCount]);

  /** 已完成文本 */
  const visibleText = judgment.slice(0, displayedCount);

  return (
    <RarityEffect rarity={rarity} className="w-full max-w-lg mx-auto">
      <div className="p-6 sm:p-8">
        {/* 等待态 */}
        {phase === "awaiting" && <AwaitingDots />}

        {/* 判词展示 */}
        {phase === "judgment" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* 卦名 + 稀有度标签 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-[family-name:var(--font-noto-serif)] text-xl text-ink">
                {rarity === "SSR" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
                    className="mr-1 inline-block"
                  >
                    ✨
                  </motion.span>
                )}
                {hexagramName}
              </h3>
              <RarityLabel rarity={rarity} />
            </div>

            {/* 判词正文 — typewriter 效果 */}
            <div
              className="font-[family-name:var(--font-noto-serif)] text-lg sm:text-xl leading-[2.0] text-ink whitespace-pre-line"
              aria-label={judgment}
            >
              {visibleText}
              {!typewriterDone && (
                <motion.span
                  className="inline-block w-[2px] h-[1em] bg-gold ml-[1px] align-text-bottom"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* 判词完成后显示按钮 */}
            <AnimatePresence>
              {typewriterDone && (
                <motion.div
                  className="flex items-center justify-center gap-6 mt-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* 查看详细解读 */}
                  <motion.button
                    onClick={onExpand}
                    disabled={!canExpand}
                    whileHover={canExpand ? { scale: 1.03 } : {}}
                    whileTap={canExpand ? { scale: 0.97 } : {}}
                    className={`rounded border px-5 py-2 font-[family-name:var(--font-noto-serif)] text-sm
                      transition-all duration-300
                      ${
                        canExpand
                          ? "border-gold text-gold hover:bg-gold hover:text-ivory cursor-pointer"
                          : "border-warning/30 text-warning cursor-not-allowed"
                      }`}
                  >
                    查看详细解读
                  </motion.button>

                  {/* 再次占卜 */}
                  <motion.button
                    onClick={onRetry}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded border border-ink-light/30 px-5 py-2
                      font-[family-name:var(--font-noto-serif)] text-sm text-ink-light
                      hover:border-ink-light hover:text-ink
                      transition-all duration-300 cursor-pointer"
                  >
                    再次占卜
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </RarityEffect>
  );
}
