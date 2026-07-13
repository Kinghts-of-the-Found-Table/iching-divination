"use client";

/**
 * 卦象逐行揭示组件
 *
 * 从初爻到上爻逐行显示卦象线条（每行间隔 0.8s），
 * 变爻以金色高亮并带闪烁效果，之卦在右侧渐显。
 *
 * 所有动画使用 Framer Motion，朴素克制。
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 单条爻线 */
export interface RevealLine {
  /** 位置号 1~6（1=初爻，6=上爻） */
  position: number;
  /** 阳爻 / 阴爻 */
  type: "yang" | "yin";
  /** 是否为变爻 */
  changing: boolean;
}

/** HexagramReveal 组件属性 */
export interface HexagramRevealProps {
  /** 六爻数据，下标 0 对应初爻 */
  lines: RevealLine[];
  /** 本卦名 */
  originalName: string;
  /** 之卦名（无变爻时为空） */
  changedName?: string;
  /** 八字卦辞（如"刚健中正，纯阳至健"） */
  description?: string;
  /** 揭示动画全部完成后回调 */
  onComplete: () => void;
}

/* =========================================================================
 * 常量
 * ========================================================================= */

/** 每行出现的间隔（秒） */
const LINE_INTERVAL = 0.8;
/** 单行动画持续（秒） */
const LINE_DURATION = 0.5;
/** 变爻闪烁次数 */
const FLASH_COUNT = 2;
/** 单次闪烁持续（秒） */
const FLASH_DURATION = 0.2;
/** 之卦渐显持续（秒） */
const CHANGED_FADE_DURATION = 1.0;
/** 结束后停留（秒） */
const HOLD_DURATION = 0.6;
/** 卦名浮现动画持续（秒） */
const NAME_REVEAL_DURATION = 1.2;

/** 爻位名称（自下而上） */
const POSITION_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/* =========================================================================
 * 子组件：单条爻线
 * ========================================================================= */

/**
 * 渲染一条爻线。
 * 阳爻为连续横线，阴爻为两段横线中间留空。
 * 变爻时线条为金色并在左侧显示圆点标记。
 */
function LineSVG({
  type,
  changing,
  isGold,
}: {
  type: "yang" | "yin";
  changing: boolean;
  isGold: boolean;
}) {
  const lineColor = isGold ? "#C4A97D" : "#3D3226";
  const width = 80;
  const height = 6;
  const radius = 3;

  return (
    <div className="relative flex items-center justify-center w-full">
      {/* 变爻标记 — 左侧金色圆点 */}
      {changing && (
        <motion.div
          className="absolute left-[calc(50%-56px)] w-[6px] h-[6px] rounded-full bg-gold-light sm:left-[calc(50%-64px)]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        />
      )}

      {/* 爻线 */}
      <svg width={width} height={height + 4} className="block">
        {type === "yang" ? (
          /* 阳爻 — 连续横线 */
          <rect
            x={0}
            y={2}
            width={width}
            height={height}
            rx={radius}
            fill={lineColor}
          />
        ) : (
          /* 阴爻 — 两段横线，中间留空 */
          <>
            <rect
              x={0}
              y={2}
              width={32}
              height={height}
              rx={radius}
              fill={lineColor}
            />
            <rect
              x={48}
              y={2}
              width={32}
              height={height}
              rx={radius}
              fill={lineColor}
            />
          </>
        )}
      </svg>
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/**
 * 卦象逐行揭示。
 *
 * 流程：
 * 1. 从初爻到上爻逐行显示，行间隔 LINE_INTERVAL
 * 2. 如有变爻，全部显示后进行闪烁动画
 * 3. 之卦在右侧渐显
 * 4. 完成后回调 onComplete
 */
export default function HexagramReveal({
  lines,
  originalName,
  changedName,
  description,
  onComplete,
}: HexagramRevealProps) {
  /** 当前已揭示的行数（0~6） */
  const [revealed, setRevealed] = useState(0);
  /** 变爻闪烁阶段 */
  const [flashing, setFlashing] = useState(false);
  /** 闪烁后固定金色 */
  const [goldSettled, setGoldSettled] = useState(false);
  /** 是否显示之卦 */
  const [showChanged, setShowChanged] = useState(false);
  /** 卦名是否已浮现 */
  const [showName, setShowName] = useState(false);

  const hasChangingLines = lines.some((l) => l.changing);

  /* 逐行揭示 */
  useEffect(() => {
    if (revealed >= 6) return;
    const timer = setTimeout(() => {
      setRevealed((prev) => prev + 1);
    }, LINE_INTERVAL * 1000);
    return () => clearTimeout(timer);
  }, [revealed]);

  /* 全部揭示后触发闪烁 */
  useEffect(() => {
    if (revealed < 6 || !hasChangingLines) return;
    const startDelay = 300; // 全部揭示后稍作停顿
    const timer = setTimeout(() => {
      setFlashing(true);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [revealed, hasChangingLines]);

  /* 闪烁完成后固定金色 + 显示之卦 */
  useEffect(() => {
    if (!flashing) return;
    const flashTotal = FLASH_COUNT * 2 * FLASH_DURATION * 1000; // 两次闪烁的总时长
    const timer = setTimeout(() => {
      setFlashing(false);
      setGoldSettled(true);
      if (changedName) {
        setShowChanged(true);
      }
    }, flashTotal);
    return () => clearTimeout(timer);
  }, [flashing, changedName]);

  /* 之卦显示后触发卦名浮现 */
  useEffect(() => {
    if (!goldSettled && revealed === 6 && !hasChangingLines) {
      // 无变爻：全部揭示后触发卦名浮现
      const timer = setTimeout(() => setShowName(true), 300);
      return () => clearTimeout(timer);
    }
    if (goldSettled && (!changedName || showChanged)) {
      // 有变爻：之卦显示后触发卦名浮现
      const timer = setTimeout(() => setShowName(true), 300);
      return () => clearTimeout(timer);
    }
  }, [goldSettled, showChanged, revealed, hasChangingLines, changedName]);

  /* 卦名浮现动画完成后回调 */
  useEffect(() => {
    if (!showName) return;
    const timer = setTimeout(onComplete, (NAME_REVEAL_DURATION + HOLD_DURATION) * 1000);
    return () => clearTimeout(timer);
  }, [showName, onComplete]);

  /** 判断某行是否处于金色闪烁状态 */
  function isLineFlashing(changing: boolean): boolean {
    // 只在变爻且处于闪烁阶段时，间歇性切换颜色
    // 使用简单的奇偶判断（闪烁频率由 FLASH_DURATION 控制）
    return changing && flashing;
  }

  /* 排序：显示时自上而下（上爻在上），但迭代从初爻开始 */
  const displayLines = [...lines].reverse(); // [上爻, 五爻, ..., 初爻]

  return (
    <motion.div
      className="flex flex-col items-center gap-3 px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 标题 */}
      <h3 className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink">
        卦象
      </h3>

      {/* 卦象行 + 之卦的横向布局 */}
      <div className="flex items-center gap-8 sm:gap-12">
        {/* 本卦六行（自上而下排列） */}
        <div className="flex flex-col gap-3">
          {displayLines.map((line, displayIdx) => {
            // displayIdx=0 → 上爻（数组中 position=6, dataIdx=5）
            // displayIdx=5 → 初爻（数组中 position=1, dataIdx=0）
            const dataIdx = 5 - displayIdx;
            const isRevealed = dataIdx < revealed;
            const lineFlashing = isLineFlashing(line.changing);

            return (
              <div key={line.position} className="flex items-center gap-2">
                {/* 爻位名称（仅在初爻和上爻显示） */}
                <span className="w-8 text-right text-[10px] text-warning font-[family-name:var(--font-body)]">
                  {line.position === 1 || line.position === 6
                    ? POSITION_NAMES[line.position - 1]
                    : ""}
                </span>

                {/* 爻线容器 */}
                <div className="w-[80px] h-[10px] flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {isRevealed ? (
                      <motion.div
                        key={`line-${line.position}${lineFlashing ? "-flash" : ""}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          opacity: { duration: LINE_DURATION },
                          x: { duration: LINE_DURATION, ease: "easeOut" },
                        }}
                      >
                        <LineSVG
                          type={line.type}
                          changing={line.changing}
                          isGold={goldSettled ? line.changing : lineFlashing}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-[80px] h-[10px]" />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {/* 之卦（如果存在） */}
        <AnimatePresence>
          {showChanged && changedName && (
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: CHANGED_FADE_DURATION }}
            >
              <span className="text-[10px] text-warning font-[family-name:var(--font-body)]">
                之卦
              </span>
              {displayLines.map((line) => {
                // 之卦：变爻反转类型
                const changedType =
                  line.changing && line.type === "yang" ? "yin" : line.changing && line.type === "yin" ? "yang" : line.type;
                const isChanging = line.changing;
                return (
                  <div key={`changed-${line.position}`} className="w-[80px] h-[10px] flex items-center justify-center opacity-60">
                    <LineSVG
                      type={changedType}
                      changing={false}
                      isGold={isChanging}
                    />
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 本卦名 - 仪式感浮现 */}
      <AnimatePresence>
        {showName && (
          <motion.div
            className="mt-6 flex flex-col items-center"
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: NAME_REVEAL_DURATION, ease: "easeOut" }}
          >
            <h2
              className="text-center font-[family-name:var(--font-noto-serif)] text-ink"
              style={{ fontSize: "48px", lineHeight: 1.4 }}
            >
              {originalName}
            </h2>
            {description && (
              <motion.p
                className="mt-3 font-[family-name:var(--font-noto-serif)] text-base text-ink-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                {description}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
