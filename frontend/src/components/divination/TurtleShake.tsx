"use client";

/**
 * 龟壳摇卦动画组件（v1.1 - 点击交互版）
 *
 * 用户点击龟壳触发摇晃动画，支持两种模式：
 * 1. 六爻模式（默认）：点击一次龟壳震动 6 次，铜钱逐次飞出
 * 2. 逐爻模式：点击一次摇一爻，需点击 6 次完成
 *
 * 交互细节：
 * - 悬停时龟壳微微放大（scale 1.05）+ 微弱光晕
 * - 点击瞬间"叩击"反馈（scale 缩小到 0.95 再弹回）
 * - 动画完成后回调 onComplete
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      className={`absolute rounded-[50%] border-2 border-gold-light/20 ${className ?? ""}`}
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
      {/* 主壳 - 最大椭圆 */}
      <ShellOval className="w-36 h-48 sm:w-44 sm:h-56" />
      {/* 左壳片 */}
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={-8} />
      {/* 右壳片 */}
      <ShellOval className="w-32 h-44 sm:w-40 sm:h-52" rotate={8} />
      {/* 壳顶纹路 - 水平短线 */}
      <div className="absolute top-[28%] w-16 sm:w-20 h-[2px] bg-gold-light/15 rounded-full" />
      <div className="absolute top-[35%] w-20 sm:w-24 h-[2px] bg-gold-light/15 rounded-full" />
      <div className="absolute top-[42%] w-18 sm:w-22 h-[2px] bg-gold-light/15 rounded-full" />
    </div>
  );
}

/* =========================================================================
 * 子组件：CSS 绘制的铜钱
 * ========================================================================= */

/** 单枚铜钱 - 金环方孔 */
function Coin() {
  return (
    <div className="relative flex items-center justify-center w-6 h-6">
      {/* 外圈 */}
      <div className="absolute inset-0 rounded-full bg-[#C4A97D] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]" />
      {/* 内圈浮雕 */}
      <div className="absolute inset-[2px] rounded-full border border-[#A68B5B]" />
      {/* 方孔 */}
      <div className="absolute w-[6px] h-[6px] bg-[#1A1520] rounded-[0.5px]" />
    </div>
  );
}

/* =========================================================================
 * 常量
 * ========================================================================= */

/** 六爻名称（自下而上） */
const LINE_NAMES = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/** 单次龟壳震动持续（秒） */
const SHAKE_DURATION = 0.4;
/** 六爻模式中每次震动之间的间隔（秒） */
const SHAKE_INTERVAL = 0.5;

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 摇卦模式 */
export type ShakeMode = "six-at-once" | "one-by-one";

/** TurtleShake 组件属性 */
export interface TurtleShakeProps {
  /** 动画全部完成后回调 */
  onComplete: () => void;
  /** 摇卦模式，默认六爻模式 */
  mode?: ShakeMode;
  /** 模式切换回调 */
  onModeChange?: (mode: ShakeMode) => void;
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/**
 * 龟壳摇卦动画（点击交互版）。
 *
 * 六爻模式：点击龟壳 -> 龟壳震动 6 次（每次代表一爻），铜钱逐次飞出 -> onComplete
 * 逐爻模式：每次点击龟壳 -> 龟壳震动 1 次 -> 一组铜钱飞出 -> 需点击 6 次 -> onComplete
 */
export default function TurtleShake({
  onComplete,
  mode = "six-at-once",
  onModeChange,
}: TurtleShakeProps) {
  /** 当前模式 */
  const [currentMode, setCurrentMode] = useState<ShakeMode>(mode);

  /** 是否正在摇晃中 */
  const [isShaking, setIsShaking] = useState(false);
  /** 是否已完成 */
  const [isDone, setIsDone] = useState(false);

  /** 已落地的铜钱组数（0~6） */
  const [landedCoins, setLandedCoins] = useState(0);

  /** 当前正在进行的震动索引（六爻模式中 0~5） */
  const [currentShake, setCurrentShake] = useState(0);

  /** 叩击反馈 */
  const [isKnocked, setIsKnocked] = useState(false);

  /** onComplete 回调引用，避免 useEffect 依赖问题 */
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  /** 震动定时器引用 */
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── 模式切换 ── */
  const handleModeToggle = useCallback(() => {
    if (isShaking || isDone) return;
    const newMode: ShakeMode =
      currentMode === "six-at-once" ? "one-by-one" : "six-at-once";
    setCurrentMode(newMode);
    onModeChange?.(newMode);
    // 重置状态
    setLandedCoins(0);
    setCurrentShake(0);
  }, [currentMode, isShaking, isDone, onModeChange]);

  /* ── 六爻模式：自动连续震动 ── */
  useEffect(() => {
    if (!isShaking || currentMode !== "six-at-once") return;

    // 每次震动后落下一组铜钱
    if (currentShake > 0 && currentShake <= landedCoins + 1) {
      if (landedCoins < currentShake) {
        setLandedCoins(currentShake);
      }
    }

    if (currentShake >= 6) {
      // 六次震动完成
      setIsShaking(false);
      const timer = setTimeout(() => {
        setIsDone(true);
        onCompleteRef.current();
      }, 600);
      return () => clearTimeout(timer);
    }

    // 触发下一次震动
    shakeTimerRef.current = setTimeout(() => {
      setCurrentShake((prev) => prev + 1);
    }, SHAKE_INTERVAL * 1000);

    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, [isShaking, currentMode, currentShake, landedCoins]);

  /* ── 逐爻模式：单次震动完成 ── */
  useEffect(() => {
    if (!isShaking || currentMode !== "one-by-one") return;

    // 单次震动后落下一组铜钱
    const timer = setTimeout(() => {
      setLandedCoins((prev) => prev + 1);
      setIsShaking(false);

      if (landedCoins + 1 >= 6) {
        // 六组全部完成
        const doneTimer = setTimeout(() => {
          setIsDone(true);
          onCompleteRef.current();
        }, 600);
        return () => clearTimeout(doneTimer);
      }
    }, SHAKE_DURATION * 1000 + 200);

    return () => clearTimeout(timer);
  }, [isShaking, currentMode, landedCoins]);

  /* ── 点击龟壳 ── */
  const handleClick = useCallback(() => {
    if (isShaking || isDone) return;

    // 叩击反馈
    setIsKnocked(true);
    setTimeout(() => setIsKnocked(false), 200);

    if (currentMode === "six-at-once") {
      // 六爻模式：启动连续震动
      setIsShaking(true);
      setCurrentShake(1);
    } else {
      // 逐爻模式：单次震动
      setIsShaking(true);
    }
  }, [isShaking, isDone, currentMode]);

  /* ── 计算龟壳动画 ── */
  /** 当前龟壳是否处于震动状态 */
  const isTurtleShaking = isShaking && (
    currentMode === "one-by-one" ||
    (currentMode === "six-at-once" && currentShake > 0)
  );

  /** 龟壳的旋转动画序列 */
  const shakeRotate = isTurtleShaking
    ? [0, -15, 15, -10, 10, 0]
    : [0];

  /** 龟壳的缩放 */
  const turtleScale = isKnocked
    ? 0.95
    : isShaking
      ? 1
      : 1.05; // 悬停时 1.05

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-8">
      {/* 模式切换按钮 */}
      {!isShaking && !isDone && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleModeToggle}
            className="rounded border border-gold-light/40 px-3 py-1 text-xs
              font-[family-name:var(--font-body)] text-gold-light/80
              transition-all duration-300 hover:border-gold-light hover:text-gold-light
              cursor-pointer"
          >
            {currentMode === "six-at-once" ? "一摇六爻" : "逐爻摇卦"}
            {"  ⇄  "}
            {currentMode === "six-at-once" ? "切换为逐爻" : "切换为六爻"}
          </button>
        </div>
      )}

      {/* 状态提示文字 */}
      <p className="font-[family-name:var(--font-noto-serif)] text-base text-gold-light/80">
        {isDone
          ? "卦象已成"
          : isShaking
            ? currentMode === "six-at-once"
              ? `摇晃中… ${currentShake}/6`
              : `摇晃中… ${landedCoins + 1}/6`
            : currentMode === "six-at-once"
              ? "点击龟壳开始摇卦"
              : landedCoins === 0
                ? "点击龟壳摇第一爻"
                : `点击龟壳摇第${LINE_NAMES[landedCoins]}（${landedCoins + 1}/6）`}
      </p>

      {/* 龟壳区域 */}
      <motion.div
        className="cursor-pointer"
        onClick={handleClick}
        whileHover={isShaking || isDone ? {} : { scale: 1.05 }}
        whileTap={isShaking || isDone ? {} : { scale: 0.95 }}
        animate={{
          scale: turtleScale,
        }}
        transition={{
          scale: { duration: 0.2, ease: "easeOut" },
        }}
        style={
          !isShaking && !isDone
            ? {
                filter: "drop-shadow(0 0 12px rgba(196, 169, 125, 0.15))",
              }
            : isShaking
              ? {
                  filter: "drop-shadow(0 0 20px rgba(196, 169, 125, 0.25))",
                }
              : {}
        }
      >
        <motion.div
          animate={{
            rotate: isTurtleShaking ? shakeRotate : 0,
            opacity: isDone ? 0.3 : 1,
          }}
          transition={{
            rotate: {
              duration: SHAKE_DURATION,
              ease: "easeInOut",
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            },
            opacity: { duration: 0.4 },
          }}
        >
          <TurtleShell />
        </motion.div>
      </motion.div>

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
              <span
                className={`text-[10px] font-[family-name:var(--font-body)] transition-colors duration-300 ${
                  isLanded ? "text-gold-light" : "text-warning"
                }`}
              >
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
