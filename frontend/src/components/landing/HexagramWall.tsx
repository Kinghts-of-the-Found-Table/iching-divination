"use client";

/**
 * 六十四卦展示墙
 *
 * 8×8 网格展示全部卦名，静态排列。
 * 鼠标悬停显示卦象释义（tooltip）。
 * 传达"古老体系中有 64 种可能性"的厚重感。
 */

import { useState } from "react";
import { HEXAGRAM_DATA } from "@/lib/constants";

/** 按 8×8 网格排列的卦名列表 */
const HEXAGRAM_NAMES = Object.keys(HEXAGRAM_DATA);

export default function HexagramWall() {
  return (
    <section className="bg-diviner px-4 py-24">
      <div className="mx-auto max-w-[720px]">
        <h2 className="mb-12 text-center font-[family-name:var(--font-noto-serif)] text-2xl text-ink">
          六十四卦
        </h2>

        {/* 8×8 网格 */}
        <div className="grid grid-cols-8 gap-2 sm:gap-3">
          {HEXAGRAM_NAMES.map((name) => (
            <HexagramTag key={name} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** 单个卦名标签（含 hover tooltip） */
function HexagramTag({ name }: { name: string }) {
  const [hovered, setHovered] = useState(false);
  const description = HEXAGRAM_DATA[name] || "";

  return (
    <div
      className="relative flex cursor-default items-center justify-center rounded bg-ivory/80 p-2 text-center text-xs text-ink-light transition-colors hover:bg-ivory hover:text-ink sm:text-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="font-[family-name:var(--font-noto-serif)]">
        {name}
      </span>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-3 py-2 text-xs text-ivory shadow-lg">
          {description}
          {/* 三角形箭头 */}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink" />
        </div>
      )}
    </div>
  );
}
