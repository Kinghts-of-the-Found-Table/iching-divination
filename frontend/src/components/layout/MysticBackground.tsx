"use client";

/**
 * 神秘背景组件
 *
 * 使用 Dreamina 生成的古风卦象纹理图作为背景。
 * 纯图片 + CSS overlay，性能远优于粒子动画。
 *
 * 通过 prop 控制是否显示：首页保持原暖白风格，占卜相关页面显示暗色背景。
 */

import { useState, useEffect } from "react";

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
 * 主组件
 * ========================================================================= */

/**
 * 神秘背景。
 *
 * 当 show=true 时渲染暗色古风背景层：
 * - 底层：Dreamina 生成的卦象纹理图，cover 铺满
 * - 叠加层：半透明暗色渐变，确保文字可读性
 *
 * 当 show=false 时不渲染任何内容，页面保持原有暖白风格。
 */
export default function MysticBackground({
  show = true,
  children,
}: MysticBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!show) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen" data-mystic-bg="">
      {/* 背景图层 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: mounted ? "url(/images/mystic-bg.png)" : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          backgroundColor: "#0D0A14",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* 内容层 */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
