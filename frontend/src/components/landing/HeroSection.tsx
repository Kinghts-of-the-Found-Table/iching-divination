"use client";

/**
 * 首屏 Hero 区域
 *
 * 大留白 + 站点名 + 副标题 + CTA 按钮。
 * 背景极淡卦象暗纹（CSS 实现，不引入图片）。
 * 占据视口至少 70% 高度。
 */

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { SITE_TAGLINE } from "@/lib/constants";

export default function HeroSection() {
  const { isLoggedIn } = useAuth();
  const ctaHref = isLoggedIn ? "/divination" : "/login";

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-ivory px-4 text-center">
      {/* 卦象暗纹：极淡的阴阳爻线（纯 CSS） */}
      <div
        className="pointer-events-none absolute inset-0 select-none"
        aria-hidden="true"
      >
        {/* 顶部卦象线 — 乾卦 */}
        <div className="absolute left-1/2 top-[12%] flex -translate-x-1/2 flex-col gap-3 opacity-[0.04]">
          {["━", "━", "━", "━", "━", "━"].map((yao, i) => (
            <span
              key={i}
              className="font-[family-name:var(--font-noto-serif)] text-[120px] leading-none text-ink"
            >
              {yao}
            </span>
          ))}
        </div>
        {/* 底部卦象线 — 坤卦 */}
        <div className="absolute bottom-[12%] left-1/2 flex -translate-x-1/2 flex-col gap-3 opacity-[0.04]">
          {["╍ ╍", "╍ ╍", "╍ ╍", "╍ ╍", "╍ ╍", "╍ ╍"].map((yao, i) => (
            <span
              key={i}
              className="font-[family-name:var(--font-noto-serif)] text-[120px] leading-none text-ink"
            >
              {yao}
            </span>
          ))}
        </div>
      </div>

      {/* 主标题 */}
      <h1 className="mb-6 font-[family-name:var(--font-noto-serif)] text-[4rem] leading-none tracking-[0.3em] text-ink sm:text-[5rem]">
        六爻
      </h1>

      {/* 副标题 */}
      <p className="mb-12 text-lg text-ink-light sm:text-xl">
        {SITE_TAGLINE}
      </p>

      {/* CTA 按钮：金色描边透明底，hover 填充 */}
      <Link
        href={ctaHref}
        className="inline-block rounded border border-gold bg-transparent px-10 py-4 font-[family-name:var(--font-noto-serif)] text-lg tracking-wider text-ink transition-colors duration-300 hover:bg-gold hover:text-ivory"
      >
        开始占卜
      </Link>
    </section>
  );
}
