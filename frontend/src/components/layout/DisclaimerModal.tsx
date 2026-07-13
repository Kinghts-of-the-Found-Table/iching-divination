"use client";

/**
 * 首次访问免责声明弹窗
 *
 * 用户首次访问时弹出 Modal，告知占卜仅供娱乐参考。
 * 点击"已知晓"后写入 localStorage，同浏览器不再出现。
 */

import { useState, useEffect } from "react";
import { DISCLAIMER, DISCLAIMER_KEY } from "@/lib/constants";

export default function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(DISCLAIMER_KEY);
    if (!acknowledged) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-md rounded bg-ivory p-8 shadow-lg sm:p-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        <h2
          id="disclaimer-title"
          className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink"
        >
          温馨提示
        </h2>
        <p className="mb-8 leading-relaxed text-ink-light">
          {DISCLAIMER}
        </p>
        <button
          onClick={handleDismiss}
          className="w-full rounded border border-gold bg-transparent px-6 py-3 font-[family-name:var(--font-noto-serif)] text-ink transition-colors hover:bg-gold hover:text-ivory"
        >
          已知晓
        </button>
      </div>
    </div>
  );
}
