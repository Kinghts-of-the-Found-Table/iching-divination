"use client";

/**
 * 稀有度特效包装组件
 *
 * 根据稀有度等级为判词卡片添加视觉特效：
 * - N：无特效
 * - R：无特效（默认）
 * - SR：顶部暗金色细线 + 稀有度标签暗金描边
 * - SSR：金色边框 + 卡片边缘金光粒子飘散（纯 CSS）
 */

import { type ReactNode } from "react";
import { motion } from "framer-motion";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 稀有度等级 */
export type Rarity = "N" | "R" | "SR" | "SSR";

/** RarityEffect 组件属性 */
export interface RarityEffectProps {
  /** 稀有度等级 */
  rarity: Rarity;
  /** 子内容（判词卡片） */
  children: ReactNode;
  /** 额外 CSS 类名 */
  className?: string;
}

/* =========================================================================
 * SSR 粒子组件
 * ========================================================================= */

/**
 * SSR 金光粒子飘散。
 * 4~6 个金色小圆点从卡片底部飘起，3 秒后消失。
 * 使用绝对定位的 span + CSS animation，不引入粒子库。
 */
function SSRParticles() {
  const particles = [
    { left: "10%", delay: 0, size: 4 },
    { left: "30%", delay: 0.5, size: 5 },
    { left: "55%", delay: 0.3, size: 3 },
    { left: "75%", delay: 0.7, size: 5 },
    { left: "90%", delay: 0.2, size: 4 },
    { left: "45%", delay: 0.9, size: 3 },
  ];

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: "#C4A97D",
            animation: `ssr-particle-rise 3s ${p.delay}s ease-out forwards`,
            opacity: 0,
          }}
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
 * SR：border-top 暗金线。
 * SSR：全边框金色 + 粒子飘散。
 */
export default function RarityEffect({
  rarity,
  children,
  className = "",
}: RarityEffectProps) {
  /* N 和 R 无特效 */
  if (rarity === "N" || rarity === "R") {
    return <div className={className}>{children}</div>;
  }

  /* SR：顶部暗金边框 */
  if (rarity === "SR") {
    return (
      <motion.div
        className={`relative border-t border-gold bg-diviner card-rounded ${className}`}
        initial={{ borderTopColor: "rgba(139, 115, 85, 0)" }}
        animate={{ borderTopColor: "rgba(139, 115, 85, 1)" }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {children}
      </motion.div>
    );
  }

  /* SSR：全边框金色 + 粒子 + 边框发光 */
  return (
    <motion.div
      className={`relative border border-gold-light bg-diviner card-rounded overflow-hidden ${className}`}
      initial={{ borderColor: "rgba(196, 169, 125, 0)", boxShadow: "none" }}
      animate={{
        borderColor: "rgba(196, 169, 125, 1)",
        boxShadow: "0 0 20px rgba(196, 169, 125, 0.15), 0 0 40px rgba(196, 169, 125, 0.06)",
      }}
      transition={{ delay: 0.2, duration: 0.8 }}
    >
      <SSRParticles />
      {children}
    </motion.div>
  );
}
