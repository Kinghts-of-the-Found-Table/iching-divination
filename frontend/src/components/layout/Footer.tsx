/**
 * 底部信息栏
 *
 * 居中展示免责声明与版权信息。
 * 色调使用 warning 色，视觉上低调不抢主内容注意力。
 */

import { DISCLAIMER } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-gold/10 bg-ivory py-12">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="mb-3 text-sm leading-relaxed text-warning">
          {DISCLAIMER}
        </p>
        <p className="text-xs text-warning/70">
          &copy; 2026 六爻占卜 &middot; 传统文化体验平台
        </p>
      </div>
    </footer>
  );
}
