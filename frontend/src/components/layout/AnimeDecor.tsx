"use client";

/**
 * 二次元皮肤装饰组件
 *
 * 仅在 anime 主题下显示 chibi 角色和装饰元素。
 * 通过 MutationObserver 监听 data-theme 变化。
 */

import { useEffect, useState } from "react";
import Image from "next/image";

export default function AnimeDecor() {
  const [theme, setTheme] = useState("swiss");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme") || "swiss";
    setTheme(current);
    const obs = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme") || "swiss";
      setTheme(t);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  if (!mounted || theme !== "anime") return null;

  return (
    <>
      {/* 右下角 chibi 占卜师 */}
      <div
        className="fixed bottom-20 right-20 z-40 pointer-events-none select-none hidden sm:block"
        style={{ animation: "float 3s ease-in-out infinite" }}
      >
        <Image
          src="/images/anime/chibi-oracle.webp"
          alt="占卜师"
          width={120}
          height={160}
          className="object-contain"
          priority
        />
      </div>

      {/* 左下角黑猫 */}
      <div
        className="fixed bottom-16 left-8 z-40 pointer-events-none select-none hidden sm:block"
        style={{ animation: "float 4s ease-in-out infinite 0.5s" }}
      >
        <Image
          src="/images/anime/black-cat.webp"
          alt="黑猫"
          width={80}
          height={80}
          className="object-contain"
        />
      </div>

      {/* 星星粒子 */}
      <div className="fixed inset-0 z-30 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute inline-block w-1 h-1 rounded-full opacity-60"
            style={{
              background: "var(--color-accent)",
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </>
  );
}
