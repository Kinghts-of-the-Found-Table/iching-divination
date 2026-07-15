import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider, ThemeScript } from "@/hooks/useTheme";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DisclaimerModal from "@/components/layout/DisclaimerModal";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ConditionalMysticBackground from "@/components/layout/ConditionalMysticBackground";
import "./globals.css";

/**
 * 加载 Noto Serif SC（思源宋体）作为标题字体。
 * 使用 CSS 变量 --font-noto-serif 传递给 Tailwind 主题。
 */
const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: "六爻 — 以铜钱问天，以卦象观心",
  description:
    "六爻占卜，源于《周易》。以三枚铜钱抛掷六次成卦，古诗判词解读，供您品味咀嚼。传统文化体验平台。",
};

/**
 * 根布局
 *
 * 所有页面共享的 HTML 骨架：
 * - 固定 Header（56px 高度）
 * - 主内容区（flex-1 填满）
 * - Footer 始终在底部
 * - 首次访问弹出免责 Modal
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerifSC.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <ThemeProvider>
          <AuthProvider>
            <ThemeToggle />
            <Header />
            {/* 主内容：留出 Header 高度（56px）的顶部间距 */}
            <main className="relative flex-1 pt-14" style={{ zIndex: 1 }}>
              <ConditionalMysticBackground>{children}</ConditionalMysticBackground>
            </main>
            <Footer />
            <DisclaimerModal />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
