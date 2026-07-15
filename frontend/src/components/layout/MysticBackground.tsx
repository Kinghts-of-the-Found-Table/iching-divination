"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function MysticBackground({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("swiss");

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

  return (
    <div className="relative min-h-screen" data-mystic-bg="">
      {mounted && theme === "swiss" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/images/mystic-bg.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            zIndex: 0,
            opacity: 0.9,
          }}
        />
      )}
      {mounted && theme === "anime" && (
        <div
          className="absolute inset-0"
          style={{
            background: "var(--color-bg-dark, #12122a)",
            zIndex: 0,
          }}
        />
      )}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
