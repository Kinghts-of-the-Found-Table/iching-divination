"use client";

/**
 * 龟壳摇卦动画组件
 *
 * 纯 CSS 绘制龟壳与铜钱，使用 Framer Motion 实现：
 * 1. 龟壳摇晃动画（~2 秒）
 * 2. 龟壳淡出，铜钱逐爻落下（带弹跳）
 *
 * 非交互式，动画完成后触发 onComplete 回调。
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** TurtleShake 组件属性 */
export interface TurtleShakeProps {
  /** 动画全部完成后回调 */
  onComplete: () => void;
}

/* =========================================================================
 * 子组件：CSS 绘制的龟壳
 * ========================================================================= */

/** 单个椭圆壳片 */
function ShellOval({
  className,
  rotate = 0,
}: {
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      className={`absolute rounded-[50%] border-2 border-ink/20 ${className ?? ""}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background:
          "radial-gradient(ellipse at 50% 40%, #8B7355 0%, #5C4033 60%, #3D2E1E 100%)",
      }}
    />
  );
}

/** CSS 绘制的龟壳 */
function TurtleShell() {
  return (
    <div className="relative flex items-center justify-center w-40 h-48 sm:w-48 sm:h-56">
      {/* 主壳 — 最大椭圆 */}
      <ShellOval className="w-36 h-48 sm:w-44 sm:h-56" />
      {/* 左壳片 */}
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={-8} />
      {/* 右壳片 */}
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={8} />
      {/* 壳顶纹路 — 水平短线 */}
      <div className="absolute top-[28%] w-16 sm:w-20 h-[2px] bg-ink/15 rounded-full" />
      <div className="absolute top-[35%] w-20 sm:w-24 h-[2px] bg-ink/15 rounded-full" />
      <div className="absolute top-[42%] w-18 sm:w-22 h-[2px] bg-ink/15 rounded-full" />
    </div>
  );
}

/* =========================================================================
 * 子组件：CSS 绘制的铜钱
 * ========================================================================= */

/** 单枚铜钱 — 金环方孔 */
function Coin() {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      {/* 外圈 */}
      <div className="absolute inset-0 rounded-full bg-[#C4A97D] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]" />
      {/* 内圈浮雕 */}
      <div className="absolute inset-[2px] rounded-full border border-[#A68B5B]" />
      {/* 方孔 */}
      <div className="absolute w-[6px] h-[6px] bg-ivory rounded-[0.5px]" />
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/** 六爻名称（自下而上） */
const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/** 动画阶段 */
type Phase = "shell-shaking" | "coins-falling" | "done";

/**
 * 龟壳摇卦动画。
 *
 * 流程：
 * 1. 龟壳摇晃 2.5 秒
 * 2. 龟壳淡出，六组铜钱依次从上方落至爻位（每组间隔 0.6s）
 * 3. 全部落定后回调 onComplete
 */
export default function TurtleShake({ onComplete }: TurtleShakeProps) {
  const [phase, setPhase] = useState<Phase>("shell-shaking");
  /** 已落地的铜钱组数（0~6） */
  const [landedCoins, setLandedCoins] = useState(0);

  /* 龟壳摇晃完成后进入铜钱阶段 */
  useEffect(() => {
    if (phase !== "shell-shaking") return;
    const timer = setTimeout(() => {
      setPhase("coins-falling");
    }, 2500);
    return () => clearTimeout(timer);
  }, [phase]);

  /* 铜钱逐组落下 */
  useEffect(() => {
    if (phase !== "coins-falling") return;
    if (landedCoins >= 6) {
      // 最后一组落地后稍作停留
      const timer = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setLandedCoins((prev) => prev + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, landedCoins, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-4 py-8">
      {/* 状态提示文字 */}
      <p className="font-[family-name:var(--font-noto-serif)] text-base text-ink-light">
        {phase === "shell-shaking" ? "摇晃中……" : "铜钱落地……"}
      </p>

      {/* 龟壳区域 */}
      <AnimatePresence>
        {phase === "shell-shaking" && (
          <motion.div
            key="turtle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: [0, -15, 15, -10, 10, 0],
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              rotate: {
                duration: 2.0,
                ease: "easeInOut",
                times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              },
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 },
            }}
          >
            <TurtleShell />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 铜钱落地区域 */}
      <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 sm:gap-x-14">
        {LINE_NAMES.map((name, index) => {
          const isLanded = index < landedCoins;
          return (
            <div key={name} className="flex flex-col items-center gap-2">
              {/* 三枚铜钱 */}
              <div className="flex gap-2">
                {[0, 1, 2].map((coinIdx) => (
                  <div key={coinIdx} className="w-6 h-6">
                    <AnimatePresence>
                      {isLanded && (
                        <motion.div
                          initial={{ y: -100, opacity: 0 }}
                          animate={{
                            y: 0,
                            opacity: 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 12,
                            delay: coinIdx * 0.08,
                            duration: 0.5,
                          }}
                        >
                          <Coin />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              {/* 爻位名称 */}
              <span className="text-[10px] text-warning font-[family-name:var(--font-body)]">
                {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* 底部空行保持布局 */}
      <div className="h-4" />
    </div>
  );
}
