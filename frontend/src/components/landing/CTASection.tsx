"use client";

/**
 * 底部 CTA 区域
 *
 * 大留白 + 引导语 + 开始占卜按钮。
 * 点击行为与 Hero CTA 一致：未登录跳转 /login，已登录跳转 /divination。
 */

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function CTASection() {
  const { isLoggedIn } = useAuth();
  const ctaHref = isLoggedIn ? "/divination" : "/login";

  return (
    <section className="bg-ivory px-4 py-32 text-center">
      <h2 className="mb-8 font-[family-name:var(--font-noto-serif)] text-2xl text-ink">
        准备好了吗？
      </h2>
      <Link
        href={ctaHref}
        className="inline-block rounded border border-gold bg-transparent px-10 py-4 font-[family-name:var(--font-noto-serif)] text-lg tracking-wider text-ink transition-colors duration-300 hover:bg-gold hover:text-ivory"
      >
        开始占卜
      </Link>
    </section>
  );
}
