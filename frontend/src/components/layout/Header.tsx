"use client";

/**
 * 顶部导航栏
 *
 * 固定于视口顶部，半透明暖白背景 + backdrop blur。
 * 左侧站点名（衬线字），右侧根据登录状态显示不同入口。
 */

import Link from "next/link";
import { Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { isLoggedIn, isPremium, remainingQuota } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b backdrop-blur-md" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* 左侧：站点名 */}
        <Link
          href="/"
          className="font-[family-name:var(--font-noto-serif)] text-xl tracking-widest no-underline transition-colors" style={{ color: 'var(--color-text)' }}
        >
          六爻
        </Link>

        {/* 右侧：导航 */}
        <nav className="flex items-center gap-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                我的
              </Link>
              {isPremium ? (
                <span className="flex items-center gap-1" style={{ color: 'var(--color-accent-alt)' }}>
                  <Crown className="h-3.5 w-3.5" />
                  无限次
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  剩余 {remainingQuota === Infinity ? "∞" : remainingQuota} 次
                </span>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
