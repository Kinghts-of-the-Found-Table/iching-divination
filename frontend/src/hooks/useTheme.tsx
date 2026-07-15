"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Theme = "swiss" | "anime";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "swiss",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "iching-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "swiss";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "swiss" || stored === "anime") return stored;
  } catch {}
  return "swiss";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("swiss");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getInitialTheme());
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "swiss" ? "anime" : "swiss");
  }, [theme, setTheme]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** 内联 script，插入 <head> 防止 SSR 闪烁 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{var t=localStorage.getItem("iching-theme");if(t==="swiss"||t==="anime")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
      }}
    />
  );
}
