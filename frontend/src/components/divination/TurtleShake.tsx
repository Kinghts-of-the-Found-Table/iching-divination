"use client";

/**
 * 龟壳摇卦动画组件（v1.3 - 真实素材版）
 *
 * 用户每次点击龟壳摇一爻，共需点击 6 次。
 * 每次点击 → 龟壳震动 → 铜钱落下 → 显示该爻的阴阳类型和爻位名 → 传出结果。
 *
 * 素材：Dreamina 生成的龟壳 & 铜钱（道光通宝）PNG 图片。
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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
  /** 已摇出的爻列表（由父组件管理，用于纵向展示） */
  collectedLines?: LineResult[];
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
 * 子组件：龟壳（真实图片）
 * ========================================================================= */

function TurtleShell() {
  return (
    <div className="relative flex items-center justify-center w-44 h-52 sm:w-52 sm:h-60">
      <Image
        src="/images/turtle-shell.webp"
        alt="龟壳"
        width={280}
        height={320}
        className="object-contain drop-shadow-[0_0_24px_rgba(196,169,125,0.12)]"
        priority
      />
    </div>
  );
}

/* =========================================================================
 * 子组件：铜钱（真实图片）
 * ========================================================================= */

// 预生成 18 枚铜钱的正反面（6 爻 × 3 枚），模块级静态生成
const COIN_FACES: boolean[] = Array.from({ length: 18 }, () => Math.random() < 0.5);

function Coin({ index }: { index: number }) {
  const isFront = COIN_FACES[index];
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <Image
        src={isFront ? "/images/coin-front.webp" : "/images/coin-back.webp"}
        alt={isFront ? "铜钱正面" : "铜钱背面"}
        width={56}
        height={56}
        className="object-contain"
      />
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

export default function TurtleShake({ onLineRevealed, onComplete, collectedLines }: TurtleShakeProps) {
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
      <p className="font-[family-name:var(--font-noto-serif)] text-sm text-gold-light/80">
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

      {/* 爻位展示区域：纵向堆叠 + 大字大图 */}
      <div className="min-h-[200px] flex flex-col items-center gap-4">
        {/* 当前爻大图（最后摇出的那爻） */}
        <AnimatePresence>
          {lastLine && (
            <motion.div
              key={lastLine.position}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="flex gap-3">
                {[0, 1, 2].map((coinIdx) => (
                  <motion.div
                    key={coinIdx}
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      type: "spring", stiffness: 300, damping: 12,
                      delay: coinIdx * 0.12, duration: 0.5,
                    }}
                  >
                    <Coin index={(lastLine.position - 1) * 3 + coinIdx} />
                  </motion.div>
                ))}
              </div>
              <span className="font-[family-name:var(--font-noto-serif)] text-2xl text-gold-light">
                {lastLine.typeName}
              </span>
              <span className="text-base text-gold-light/60">
                {lastLine.positionName}
              </span>
              {lastLine.changing && (
                <span className="text-sm text-gold">变爻</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 已摇出的爻纵向列表 */}
        {collectedLines && collectedLines.length > 0 && (
          <div className="w-full max-w-[240px] mx-auto">
            <p className="text-xs text-warning/50 mb-2 text-center">已得卦象</p>
            <div className="flex flex-col gap-1.5">
              {collectedLines.map((line) => (
                <div key={line.position} className="flex items-center gap-2 text-sm">
                  <span className="text-gold-light/60 w-10 text-right">{line.positionName}</span>
                  <span className={line.changing ? "text-gold-light" : "text-gold-light/50"}>
                    {line.typeName}
                  </span>
                  {line.changing && (
                    <span className="text-xs text-gold border border-gold/30 rounded px-1.5 py-0.5">
                      变
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
