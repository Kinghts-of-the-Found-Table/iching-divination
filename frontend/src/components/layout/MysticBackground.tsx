"use client";

/**
 * 神秘背景组件
 *
 * 深紫墨色背景 + 金色粒子从底部缓慢升起 + 卦爻线条暗纹。
 * 纯 CSS 动画，不引入 Three.js。
 *
 * 通过 prop 控制是否显示：占卜相关页面显示，首页保持原暖白风格。
 * 粒子位置/延迟/大小在客户端随机生成（避免 SSR hydration mismatch）。
 */

import { useState, useEffect, useMemo } from "react";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** MysticBackground 组件属性 */
export interface MysticBackgroundProps {
  /** 是否显示神秘背景，默认 true */
  show?: boolean;
  /** 子内容 */
  children?: React.ReactNode;
}

/* =========================================================================
 * 常量
 * ========================================================================= */

/** 粒子数量范围 */
const PARTICLE_COUNT = 40;

/** 卦爻暗纹数量 */
const YAO_PATTERN_COUNT = 8;

/* =========================================================================
 * 子组件：单个金色粒子
 * ========================================================================= */

/** 单个金色粒子的配置 */
interface ParticleConfig {
  left: string;
  size: number;
  delay: string;
  duration: string;
  drift: string;
}

/** 生成随机粒子配置 */
function generateParticles(): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2, // 1~3px
      delay: `${Math.random() * 12}s`, // 随机延迟 0~12s
      duration: `${10 + Math.random() * 10}s`, // 10~20s 一轮
      drift: `${(Math.random() - 0.5) * 80}px`, // 水平漂移
    });
  }
  return particles;
}

/* =========================================================================
 * 子组件：卦爻暗纹
 * ========================================================================= */

/** 卦爻暗纹配置 */
interface YaoPatternConfig {
  top: string;
  left: string;
  rotate: number;
  type: "yang" | "yin";
}

/** 生成随机卦爻暗纹配置 */
function generateYaoPatterns(): YaoPatternConfig[] {
  const patterns: YaoPatternConfig[] = [];
  for (let i = 0; i < YAO_PATTERN_COUNT; i++) {
    patterns.push({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      rotate: Math.random() * 360,
      type: Math.random() > 0.5 ? "yang" : "yin",
    });
  }
  return patterns;
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/**
 * 神秘背景。
 *
 * 当 show=true 时渲染深紫墨色背景层：
 * - 30~50 个金色粒子从底部缓慢升起
 * - 随机散布的卦爻线条暗纹（opacity 0.03）
 *
 * 当 show=false 时不渲染任何内容，页面保持原有背景风格。
 *
 * 注意：粒子位置在客户端生成，通过 mounted 状态确保不产生 hydration mismatch。
 */
export default function MysticBackground({
  show = true,
  children,
}: MysticBackgroundProps) {
  /** 是否已挂载（避免 SSR hydration mismatch） */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** 粒子配置（仅在客户端生成） */
  const particles = useMemo(() => generateParticles(), []);
  /** 卦爻暗纹配置（仅在客户端生成） */
  const yaoPatterns = useMemo(() => generateYaoPatterns(), []);

  if (!show) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 深紫墨色背景层 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "#1A1520", zIndex: 0 }}
        aria-hidden="true"
      />

      {/* 粒子层 */}
      {mounted && (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute bottom-0 rounded-full"
              style={
                {
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: "#C4A97D",
                  animation: `mystic-particle-rise ${p.duration} ${p.delay} ease-in-out infinite`,
                  "--drift": p.drift,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* 卦爻暗纹层 */}
      {mounted && (
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {yaoPatterns.map((yao, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: yao.top,
                left: yao.left,
                transform: `rotate(${yao.rotate}deg)`,
                opacity: 0.03,
              }}
            >
              {yao.type === "yang" ? (
                /* 阳爻 - 连续横线 */
                <div
                  style={{
                    width: "60px",
                    height: "3px",
                    background: "#C4A97D",
                    borderRadius: "2px",
                  }}
                />
              ) : (
                /* 阴爻 - 两段横线 */
                <div style={{ display: "flex", gap: "8px" }}>
                  <div
                    style={{
                      width: "26px",
                      height: "3px",
                      background: "#C4A97D",
                      borderRadius: "2px",
                    }}
                  />
                  <div
                    style={{
                      width: "26px",
                      height: "3px",
                      background: "#C4A97D",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 内容层 */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </>
  );
}
