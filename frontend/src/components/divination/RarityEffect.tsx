"use client";

/**
 * 稀有度特效包装组件（v1.1 - 签文等级版）
 *
 * 根据签文等级为判词卡片添加视觉特效：
 * - 大吉：金色光晕脉冲扩散 + 粒子从卡片四周爆发飘散 + 卦名上下浮动
 * - 吉：卡片顶部金色渐变描边 + 卦名亮度过渡
 * - 中平：无特效，正常显示
 * - 慎：卡片边缘暗灰色微光
 */

import { type ReactNode, useMemo } from "react";
import { motion } from "framer-motion";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 签文等级（原稀有度） */
export type Rarity = "慎" | "中平" | "吉" | "大吉";

/** RarityEffect 组件属性 */
export interface RarityEffectProps {
  /** 签文等级 */
  rarity: Rarity;
  /** 子内容（判词卡片） */
  children: ReactNode;
  /** 额外 CSS 类名 */
  className?: string;
}

/* =========================================================================
 * 大吉粒子组件
 * ========================================================================= */

/** 粒子配置 */
interface BurstParticle {
  dx: string;
  dy: string;
  delay: string;
  size: number;
  duration: string;
}

/**
 * 生成 8~12 个从卡片四周爆发飘散的金色粒子。
 */
function DaJiParticles() {
  const count = 10;

  /** 粒子配置（客户端生成，避免 SSR 问题） */
  const particles = useMemo<BurstParticle[]>(() => {
    const arr: BurstParticle[] = [];
    for (let i = 0; i < count; i++) {
      // 从卡片边缘向外爆发，覆盖 360 度
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const distance = 60 + Math.random() * 40;
      arr.push({
        dx: `${Math.cos(angle) * distance}px`,
        dy: `${Math.sin(angle) * distance}px`,
        delay: `${Math.random() * 0.3}s`,
        size: 2 + Math.random() * 2,
        duration: `${2.5 + Math.random() * 1.5}s`,
      });
    }
    return arr;
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-visible"
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={
            {
              top: "50%",
              left: "50%",
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: "#C4A97D",
              animation: `daji-particle-burst ${p.duration} ${p.delay} ease-out infinite`,
              "--dx": p.dx,
              "--dy": p.dy,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/**
 * 稀有度特效包装。
 *
 * 大吉：box-shadow 脉冲 + 粒子爆发 + 卦名浮动
 * 吉：border-top glow + 卦名 brightness 过渡
 * 中平：无特效
 * 慎：暗灰微光
 */
export default function RarityEffect({
  rarity,
  children,
  className = "",
}: RarityEffectProps) {
  /* 中平：无特效 */
  if (rarity === "中平") {
    return <div className={className}>{children}</div>;
  }

  /* 慎：暗灰色微光 */
  if (rarity === "慎") {
    return (
      <div
        className={`relative card-rounded ${className}`}
        style={{
          boxShadow: "0 0 8px rgba(107, 93, 79, 0.3)",
        }}
      >
        {children}
      </div>
    );
  }

  /* 吉：卡片顶部金色渐变描边 + 卦名渐亮 */
  if (rarity === "吉") {
    return (
      <motion.div
        className={`relative bg-diviner card-rounded ${className}`}
        style={{
          borderTop: "2px solid transparent",
          backgroundImage:
            "linear-gradient(to bottom, rgba(196, 169, 125, 0.08), transparent 30%)",
        }}
        initial={{ borderTopColor: "rgba(196, 169, 125, 0)" }}
        animate={{ borderTopColor: "rgba(196, 169, 125, 0.8)" }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {children}
      </motion.div>
    );
  }

  /* 大吉：金色光晕脉冲 + 粒子爆发 + 卦名浮动 */
  return (
    <motion.div
      className={`relative bg-diviner card-rounded overflow-visible ${className}`}
      initial={{ boxShadow: "none" }}
      animate={{
        boxShadow: [
          "0 0 12px rgba(196, 169, 125, 0.15), 0 0 24px rgba(196, 169, 125, 0.06)",
          "0 0 24px rgba(196, 169, 125, 0.35), 0 0 48px rgba(196, 169, 125, 0.12)",
          "0 0 12px rgba(196, 169, 125, 0.15), 0 0 24px rgba(196, 169, 125, 0.06)",
        ],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        border: "1px solid rgba(196, 169, 125, 0.4)",
      }}
    >
      <DaJiParticles />
      {children}
    </motion.div>
  );
}
