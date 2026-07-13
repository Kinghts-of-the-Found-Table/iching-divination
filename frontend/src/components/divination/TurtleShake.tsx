"use client";

/**
 * 龟壳摇卦动画组件（v1.2 - 逐爻点击版）
 *
 * 用户每次点击龟壳摇一爻，共需点击 6 次。
 * 每次点击 → 龟壳震动 → 铜钱落下 → 显示该爻的阴阳类型和爻位名 → 传出结果。
 *
 * 交互细节：
 * - 悬停时龟壳微微放大 + 微弱光晕
 * - 点击瞬间"叩击"反馈（scale 缩小到 0.95 再弹回）
 * - 第 6 次完成后回调 onComplete
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 单爻结果 */
export interface LineResult {
  position: number;       // 1~6，1=初爻
  positionName: string;   // "初爻"~"上爻"
  type: "yang" | "yin";
  typeName: string;       // "少阳" / "少阴" / "老阳" / "老阴"
  value: number;          // 7/8/9/6
  changing: boolean;      // 老阳或老阴
}

/** TurtleShake 组件属性 */
export interface TurtleShakeProps {
  /** 每摇出一爻时回调 */
  onLineRevealed: (line: LineResult) => void;
  /** 六爻全部完成后回调 */
  onComplete: () => void;
}

/* =========================================================================
 * 常量
 * ========================================================================= */

const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

const TYPE_NAMES: Record<number, string> = {
  6: "老阴",
  7: "少阳",
  8: "少阴",
  9: "老阳",
};

const SHAKE_DURATION = 0.4;

/* =========================================================================
 * 工具函数
 * ========================================================================= */

/** 模拟三钱抛掷，返回 6/7/8/9 */
function castOneLine(): number {
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += Math.random() < 0.5 ? 3 : 2;
  }
  return sum;
}

/* =========================================================================
 * 子组件：CSS 龟壳
 * ========================================================================= */

function ShellOval({ className, rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div
      className={`absolute rounded-[50%] border-2 border-gold-light/20 ${className ?? ""}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: "radial-gradient(ellipse at 50% 40%, #8B7355 0%, #5C4033 60%, #3D2E1E 100%)",
      }}
    />
  );
}

function TurtleShell() {
  return (
    <div className="relative flex items-center justify-center w-40 h-48 sm:w-48 sm:h-56">
      <ShellOval className="w-36 h-48 sm:w-44 sm:h-56" />
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={-8} />
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={8} />
      <div className="absolute top-[28%] w-16 sm:w-20 h-[2px] bg-gold-light/15 rounded-full" />
      <div className="absolute top-[35%] w-20 sm:w-24 h-[2px] bg-gold-light/15 rounded-full" />
      <div className="absolute top-[42%] w-18 sm:w-22 h-[2px] bg-gold-light/15 rounded-full" />
    </div>
  );
}

/* =========================================================================
 * 子组件：铜钱
 * ========================================================================= */

function Coin() {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      <div className="absolute inset-0 rounded-full bg-[#C4A97D] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]" />
      <div className="absolute inset-[2px] rounded-full border border-[#A68B5B]" />
      <div className="absolute w-[6px] h-[6px] bg-[#1A1520] rounded-[0.5px]" />
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

export default function TurtleShake({ onLineRevealed, onComplete }: TurtleShakeProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [landedCoins, setLandedCoins] = useState(0);
  const [isKnocked, setIsKnocked] = useState(false);
  const [lastLine, setLastLine] = useState<LineResult | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onLineRevealedRef = useRef(onLineRevealed);
  onLineRevealedRef.current = onLineRevealed;

  const handleClick = useCallback(() => {
    if (isShaking || isDone) return;

    setIsKnocked(true);
    setTimeout(() => setIsKnocked(false), 200);
    setIsShaking(true);

    // 生成这一爻
    const value = castOneLine();
    const pos = landedCoins; // 0~5
    const line: LineResult = {
      position: pos + 1,
      positionName: LINE_NAMES[pos],
      type: value === 7 || value === 9 ? "yang" : "yin",
      typeName: TYPE_NAMES[value],
      value,
      changing: value === 6 || value === 9,
    };

    // 震动结束后落铜钱 + 传出结果
    setTimeout(() => {
      setLastLine(line);
      setLandedCoins((prev) => prev + 1);
      setIsShaking(false);
      onLineRevealedRef.current(line);

      if (pos + 1 >= 6) {
        setTimeout(() => {
          setIsDone(true);
          onCompleteRef.current();
        }, 600);
      }
    }, SHAKE_DURATION * 1000 + 200);
  }, [isShaking, isDone, landedCoins]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-8">
      {/* 进度提示 */}
      <p className="font-[family-name:var(--font-noto-serif)] text-base text-gold-light/80">
        {isDone
          ? "卦象已成"
          : isShaking
            ? `摇晃中… ${landedCoins + 1}/6`
            : landedCoins === 0
              ? "点击龟壳摇第一爻"
              : `点击龟壳摇第${LINE_NAMES[landedCoins]}（${landedCoins + 1}/6）`}
      </p>

      {/* 龟壳 */}
      <motion.div
        className="cursor-pointer"
        onClick={handleClick}
        whileHover={isShaking || isDone ? {} : { scale: 1.05 }}
        whileTap={isShaking || isDone ? {} : { scale: 0.95 }}
        animate={{ scale: isKnocked ? 0.95 : isDone ? 1 : 1 }}
        transition={{ scale: { duration: 0.2, ease: "easeOut" } }}
        style={
          !isShaking && !isDone
            ? { filter: "drop-shadow(0 0 12px rgba(196,169,125,0.15))" }
            : isShaking
              ? { filter: "drop-shadow(0 0 20px rgba(196,169,125,0.25))" }
              : {}
        }
      >
        <motion.div
          animate={{
            rotate: isShaking ? [0, -15, 15, -10, 10, 0] : 0,
            opacity: isDone ? 0.3 : 1,
          }}
          transition={{
            rotate: { duration: SHAKE_DURATION, ease: "easeInOut", times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
            opacity: { duration: 0.4 },
          }}
        >
          <TurtleShell />
        </motion.div>
      </motion.div>

      {/* 铜钱落地区域 */}
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 sm:gap-x-14">
        {LINE_NAMES.map((name, i) => {
          const isLanded = i < landedCoins;
          const isLatest = i === landedCoins - 1 && lastLine;
          return (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {[0, 1, 2].map((coinIdx) => (
                  <div key={coinIdx} className="w-6 h-6">
                    <AnimatePresence>
                      {isLanded && (
                        <motion.div
                          initial={{ y: -100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{
                            type: "spring", stiffness: 300, damping: 12,
                            delay: coinIdx * 0.08, duration: 0.5,
                          }}
                        >
                          <Coin />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              {/* 爻位名称 + 类型 */}
              <span className={`text-[10px] font-[family-name:var(--font-body)] transition-colors duration-300 ${
                isLanded ? (isLatest && lastLine?.changing ? "text-gold-light" : "text-gold-light/70") : "text-warning"
              }`}>
                {name}
              </span>
              {isLatest && lastLine && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-[10px] font-[family-name:var(--font-body)] ${
                    lastLine.changing ? "text-gold-light" : "text-gold-light/60"
                  }`}
                >
                  {lastLine.typeName}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-4" />
    </div>
  );
}
