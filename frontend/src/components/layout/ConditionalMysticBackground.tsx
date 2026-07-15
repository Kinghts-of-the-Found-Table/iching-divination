"use client";

/**
 * 条件神秘背景包装器
 *
 * 根据当前路由判断是否显示 MysticBackground：
 * - 首页（/）保持原有暖白风格
 * - 其他页面（占卜、仪表盘等）显示暗色古风背景
 */

import { usePathname } from "next/navigation";
import MysticBackground from "./MysticBackground";

/** 不显示神秘背景的路径（仅首页） */
const NO_MYSTIC_PATHS = new Set(["/", ""]);

/** ConditionalMysticBackground 组件属性 */
export interface ConditionalMysticBackgroundProps {
  /** 子内容 */
  children: React.ReactNode;
}

/**
 * 根据路由自动决定是否显示神秘背景。
 */
export default function ConditionalMysticBackground({
  children,
}: ConditionalMysticBackgroundProps) {
  const pathname = usePathname();
  const showMystic = !NO_MYSTIC_PATHS.has(pathname);

  return (
    <MysticBackground>{children}</MysticBackground>
  );
}
