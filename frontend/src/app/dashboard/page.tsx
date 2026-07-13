"use client";

/**
 * 仪表盘页面
 *
 * 用户登录后的个人中心，展示：
 * - 问候语 + 退出登录
 * - 今日剩余次数 / 累计占卜次数 统计卡片
 * - "开始占卜"按钮
 * - 最近 5 条占卜记录
 *
 * 未登录自动跳转 /login。
 *
 * TASK-009 完整实现。
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 配额 API 响应 */
interface QuotaData {
  remaining: number;
  limit: number;
  is_premium: boolean;
}

/** 占卜历史条目 */
interface HistoryItem {
  id: string;
  question: string;
  hexagram: {
    original?: { name?: string };
    transformed?: { name?: string } | null;
    rarity?: string;
  };
  judgment_cn: string | null;
  created_at: string;
}

/** 占卜历史列表 API 响应 */
interface HistoryData {
  items: HistoryItem[];
  total: number;
  page: number;
  limit: number;
}

/* =========================================================================
 * 工具函数
 * ========================================================================= */

/**
 * 将 ISO 时间戳转换为中文相对时间。
 *
 * @param isoString - ISO 8601 格式的时间字符串
 * @returns 中文相对时间描述（如 "2小时前"）
 */
function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  return `${months}个月前`;
}

/**
 * 截断文本至指定长度，超出部分用 "..." 替代。
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/**
 * 从 hexagram 数据中提取本卦和之卦名称。
 */
function getHexagramNames(hexagram: HistoryItem["hexagram"]): {
  original: string;
  changed: string | null;
} {
  return {
    original: hexagram?.original?.name ?? "未知",
    changed: hexagram?.transformed?.name ?? null,
  };
}

/* =========================================================================
 * 稀有度标签配置
 * ========================================================================= */

const RARITY_CONFIG: Record<string, { label: string; className: string }> = {
  N: { label: "N", className: "text-ink-light/60 border-ink-light/30" },
  R: { label: "R", className: "text-blue-600 border-blue-400/50" },
  SR: { label: "SR", className: "text-purple-600 border-purple-400/50" },
  SSR: { label: "SSR", className: "text-gold border-gold/60" },
};

/* =========================================================================
 * 加载骨架
 * ========================================================================= */

/** Dashboard 加载骨架 — 避免 SSR/认证检查时的闪烁 */
function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 animate-pulse">
      {/* 顶栏骨架 */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-6 w-20 bg-diviner rounded" />
        <div className="h-5 w-16 bg-diviner rounded" />
      </div>
      {/* 卡片骨架 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="h-24 bg-diviner rounded" />
        <div className="h-24 bg-diviner rounded" />
      </div>
      {/* 按钮骨架 */}
      <div className="h-12 w-full bg-diviner rounded mb-8" />
      {/* 列表骨架 */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-diviner rounded" />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user, logout } = useAuth();

  /* ── 数据状态 ── */
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  /* ── 认证守卫 ── */
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  /* ── 加载数据 ── */
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      setDataError(null);

      try {
        const [quotaData, historyData] = await Promise.all([
          apiGet<QuotaData>("/api/user/quota"),
          apiGet<HistoryData>("/api/divination?page=1&limit=5"),
        ]);

        if (!cancelled) {
          setQuota(quotaData);
          setHistory(historyData);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "数据加载失败";
          setDataError(message);
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  /* ── 退出登录 ── */
  function handleLogout() {
    logout();
    router.push("/");
  }

  /* ── 加载态 ── */
  if (authLoading || !isLoggedIn) {
    return <DashboardSkeleton />;
  }

  /* ── 渲染 ── */
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* ── 顶栏：问候 + 退出 ── */}
      <motion.div
        className="mb-8 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-[family-name:var(--font-noto-serif)] text-2xl text-ink">
          你好
        </h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-warning hover:text-ink-light
            transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          退出登录
        </button>
      </motion.div>

      {/* ── 统计卡片 ── */}
      <motion.div
        className="mb-8 grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* 今日剩余 */}
        <div className="rounded bg-diviner px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs text-warning">今日剩余</p>
          {quota ? (
            quota.is_premium ? (
              <p className="flex items-center gap-1 font-[family-name:var(--font-noto-serif)] text-2xl text-gold">
                <Crown className="h-5 w-5" />
                无限次
              </p>
            ) : (
              <p className="font-[family-name:var(--font-noto-serif)] text-2xl text-ink">
                {quota.remaining}
                <span className="ml-1 text-sm text-warning">
                  / {quota.limit} 次
                </span>
              </p>
            )
          ) : (
            <p className="font-[family-name:var(--font-noto-serif)] text-2xl text-warning">
              ...
            </p>
          )}
        </div>

        {/* 累计占卜 */}
        <div className="rounded bg-diviner px-5 py-4 shadow-sm">
          <p className="mb-1 text-xs text-warning">累计占卜</p>
          {history ? (
            <p className="font-[family-name:var(--font-noto-serif)] text-2xl text-ink">
              {history.total}
              <span className="ml-1 text-sm text-warning">次</span>
            </p>
          ) : (
            <p className="font-[family-name:var(--font-noto-serif)] text-2xl text-warning">
              ...
            </p>
          )}
        </div>
      </motion.div>

      {/* ── 开始占卜 ── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Link
          href="/divination"
          className="block w-full rounded border border-gold py-3 text-center
            font-[family-name:var(--font-noto-serif)] text-lg text-gold
            transition-all duration-300
            hover:bg-gold hover:text-ivory"
        >
          开始占卜
        </Link>
      </motion.div>

      {/* ── 最近占卜 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink">
          最近占卜
        </h2>

        {/* 加载中 */}
        {dataLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded bg-diviner animate-pulse"
              />
            ))}
          </div>
        )}

        {/* 加载失败 */}
        {dataError && (
          <div className="rounded bg-diviner px-5 py-8 text-center">
            <p className="text-sm text-warning">{dataError}</p>
          </div>
        )}

        {/* 空状态 */}
        {!dataLoading && !dataError && history && history.items.length === 0 && (
          <div className="rounded bg-diviner px-5 py-8 text-center">
            <p className="text-sm text-warning">还没有占卜记录</p>
            <p className="mt-1 text-xs text-warning/70">
              开始你的第一次占卜吧
            </p>
          </div>
        )}

        {/* 占卜列表 */}
        {!dataLoading && !dataError && history && history.items.length > 0 && (
          <div className="space-y-3">
            {history.items.map((item) => {
              const { original, changed } = getHexagramNames(item.hexagram);
              const rarity = item.hexagram?.rarity ?? "N";
              const rarityCfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.N;
              const snippet = item.judgment_cn
                ? truncate(item.judgment_cn, 20)
                : "判词生成中...";

              return (
                <motion.div
                  key={item.id}
                  className="flex items-center gap-4 rounded bg-diviner px-5 py-4 shadow-sm"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* 卦名 + 判词 */}
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-noto-serif)] text-ink">
                      {original}
                      {changed ? ` → ${changed}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-light">
                      &ldquo;{snippet}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-warning">
                      {relativeTime(item.created_at)}
                    </p>
                  </div>

                  {/* 稀有度标签 */}
                  <span
                    className={`flex-shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${rarityCfg.className}`}
                  >
                    {rarityCfg.label}
                  </span>

                  {/* 查看按钮 */}
                  <button
                    onClick={() =>
                      alert(
                        `占卜详情（ID: ${item.id}）\n\n` +
                          `问题：${item.question}\n` +
                          `卦象：${original}${changed ? " → " + changed : ""}\n` +
                          `判词：${item.judgment_cn ?? "暂无"}`
                      )
                    }
                    className="flex-shrink-0 text-xs text-warning underline underline-offset-2
                      hover:text-ink-light transition-colors cursor-pointer"
                  >
                    查看
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 查看全部历史 */}
        {!dataLoading && !dataError && history && history.total > 5 && (
          <p className="mt-4 text-center">
            <Link
              href="/divination"
              className="text-sm text-warning underline underline-offset-2 transition-colors hover:text-ink-light"
            >
              查看全部历史 →
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
