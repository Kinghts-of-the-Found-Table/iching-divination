"use client";

/**
 * 占卜流程页面 — 核心交互
 *
 * 管理完整占卜状态机：
 *   IDLE → SHAKING → REVEALING → AWAITING → JUDGMENT → EXPANDED
 *
 * 登录检查、API 调用、错误处理、Mock 降级均在此编排。
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

import QuestionInput from "@/components/divination/QuestionInput";
import TurtleShake from "@/components/divination/TurtleShake";
import HexagramReveal, {
  type RevealLine,
} from "@/components/divination/HexagramReveal";
import JudgmentCard from "@/components/divination/JudgmentCard";
import InterpretationSection, {
  type InterpretationData,
} from "@/components/divination/InterpretationSection";
import {
  mockDivination,
  mockInterpretation,
  isMockMode,
  type MockDivinationResponse,
} from "@/lib/mock";
import { apiPost, apiGet } from "@/lib/api";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 真实 API 返回的解读响应 */
interface RealInterpretationResponse {
  reading_id: string;
  interpretation: string;
  cached: boolean;
}

/** 将真实解读文本解析为三段式 */
function parseInterpretation(text: string): InterpretationData {
  const sections: InterpretationData = {
    directAnswer: "",
    hexagramAnalysis: "",
    practicalAdvice: "",
  };
  const m1 = text.match(/【直接回答】([\s\S]*?)(?=【卦象与变爻分析】|$)/);
  const m2 = text.match(/【卦象与变爻分析】([\s\S]*?)(?=【务实建议】|$)/);
  const m3 = text.match(/【务实建议】([\s\S]*?)$/);
  if (m1) sections.directAnswer = m1[1].trim();
  if (m2) sections.hexagramAnalysis = m2[1].trim();
  if (m3) sections.practicalAdvice = m3[1].trim();
  return sections;
}
type DivinationPhase =
  | "idle"
  | "shaking"
  | "revealing"
  | "awaiting"
  | "judgment"
  | "expanded";

/** 真实 API 返回的占卜响应 */
interface RealDivinationResponse {
  id: string;
  question: string;
  hexagram: {
    original: { name: string; lines: number[]; trigram_upper: string; trigram_lower: string };
    changing_lines: number[];
    transformed: { name: string } | null;
    mutual: { name: string };
    rarity: string;
  };
  judgment_cn: string | null;
  created_at: string;
}

/** 将真实 API 响应标准化为组件统一使用的格式 */
function normalizeResponse(data: RealDivinationResponse): MockDivinationResponse {
  const h = data.hexagram;
  const changingSet = new Set(h.changing_lines);
  return {
    id: data.id,
    hexagram: {
      name: h.original.name,
      changedName: h.transformed?.name,
      lines: h.original.lines.map((val, i) => {
        const pos = i; // 0=初爻, 5=上爻
        return {
          position: pos + 1,
          type: (val === 7 || val === 9) ? "yang" as const : "yin" as const,
          changing: changingSet.has(pos),
        };
      }),
      rarity: (h.rarity as MockDivinationResponse["hexagram"]["rarity"]) || "R",
    },
    judgment: data.judgment_cn || "",
  };
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

export default function DivinationPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  /* ── 状态机 ── */
  const [phase, setPhase] = useState<DivinationPhase>("idle");

  /* ── 用户输入 ── */
  const [question, setQuestion] = useState("");

  /* ── 占卜结果 ── */
  const [result, setResult] = useState<MockDivinationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── 解卦 ── */
  const [interpretation, setInterpretation] =
    useState<InterpretationData | null>(null);
  const [loadingInterpretation, setLoadingInterpretation] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(
    null
  );

  /* ── 引用 ── */
  /** 暂存提前完成的 API 响应 */
  const pendingResultRef = useRef<MockDivinationResponse | null>(null);
  /** POST 是否已发起 */
  const postFiredRef = useRef(false);
  /** POST 是否已完成 */
  const postDoneRef = useRef(false);
  /** 当 REVEALING 无数据时，轮询检查的定时器 */
  const revealPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* =======================================================================
   * 副作用
   * ======================================================================= */

  /** 占卜中禁用浏览器后退 */
  useEffect(() => {
    if (phase === "idle") return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  /** 进入 REVEALING 但无数据时：轮询等待 result 就绪，就绪后自动展示 */
  useEffect(() => {
    if (phase !== "revealing" || result) return;

    revealPollRef.current = setInterval(() => {
      if (pendingResultRef.current) {
        setResult(pendingResultRef.current);
        pendingResultRef.current = null;
        if (revealPollRef.current) clearInterval(revealPollRef.current);
      }
    }, 200);

    return () => {
      if (revealPollRef.current) clearInterval(revealPollRef.current);
    };
  }, [phase, result]);

  /** AWAITING 阶段轮询：POST 返回后自动跳到 JUDGMENT */
  useEffect(() => {
    if (phase !== "awaiting") return;

    const interval = setInterval(() => {
      if (pendingResultRef.current) {
        setResult(pendingResultRef.current);
        pendingResultRef.current = null;
        setPhase("judgment");
        clearInterval(interval);
      } else if (postDoneRef.current && !pendingResultRef.current) {
        setError("天机未明，请稍后再试");
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [phase]);

  /* =======================================================================
   * 事件处理
   * ======================================================================= */

  /** IDLE → SHAKING：开始占卜 */
  const handleSubmit = useCallback(() => {
    if (!question.trim()) return;

    setPhase("shaking");
    setError(null);
    setResult(null);
    setInterpretation(null);
    setInterpretationError(null);
    pendingResultRef.current = null;
    postFiredRef.current = false;
    postDoneRef.current = false;

    // 龟壳摇晃后期（铜钱落下时 ~2.5s）发起 POST，不阻塞动画
    const postTimeout = setTimeout(async () => {
      postFiredRef.current = true;
      try {
        const data = isMockMode()
          ? await mockDivination(question)
          : await apiPost<RealDivinationResponse>("/api/divination", {
              question,
            }).then(normalizeResponse);
        pendingResultRef.current = data;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "网络连接异常，请稍后重试";
        setError(msg);
        // 如果在 REVEALING 阶段出错，把 result 保留（卦象已显示）
        if (phase !== "revealing") {
          pendingResultRef.current = null;
        }
      } finally {
        postDoneRef.current = true;
      }
    }, 2500);

    return () => clearTimeout(postTimeout);
  }, [question]);

  /** SHAKING → REVEALING：龟壳动画完成 */
  const handleShakeComplete = useCallback(() => {
    // 如果 result 已就绪（POST 在 SHAKING 期间返回），直接使用
    if (pendingResultRef.current) {
      setResult(pendingResultRef.current);
      pendingResultRef.current = null;
    }
    setPhase("revealing");
  }, []);

  /** REVEALING → JUDGMENT / AWAITING：卦象揭示完成 */
  const handleRevealComplete = useCallback(() => {
    // result 已在 state 中（POST 在 SHAKING/REVEALING 期间完成）→ 直接展示判词
    if (result) {
      setPhase("judgment");
      return;
    }
    // ref 中还有未消费的结果
    if (pendingResultRef.current) {
      setResult(pendingResultRef.current);
      pendingResultRef.current = null;
      setPhase("judgment");
    } else if (error) {
      // POST 已失败
    } else if (postDoneRef.current) {
      // POST 完成但无结果
      setError("天机未明，请稍后再试");
    } else {
      // POST 尚未完成
      setPhase("awaiting");
    }
  }, [result, error]);

  /** JUDGMENT → EXPANDED：加载详细解读 */
  const handleExpand = useCallback(async () => {
    if (!result) return;

    setPhase("expanded");
    setLoadingInterpretation(true);
    setInterpretationError(null);

    try {
      const data = isMockMode()
        ? await mockInterpretation(result.hexagram.name)
        : await apiGet<RealInterpretationResponse>(
            `/api/divination/${result.id}/interpretation`
          ).then((r) => parseInterpretation(r.interpretation));
      setInterpretation(data);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "解读加载失败，请稍后重试";
      setInterpretationError(msg);
    } finally {
      setLoadingInterpretation(false);
    }
  }, [result]);

  /** 任何阶段 → IDLE：再次占卜 */
  const handleRetry = useCallback(() => {
    setPhase("idle");
    setQuestion("");
    setResult(null);
    setInterpretation(null);
    setError(null);
    setInterpretationError(null);
    pendingResultRef.current = null;
    postFiredRef.current = false;
    postDoneRef.current = false;
  }, []);

  /* =======================================================================
   * 辅助数据
   * ======================================================================= */

  const revealLines: RevealLine[] = result
    ? result.hexagram.lines.map((l) => ({
        position: l.position,
        type: l.type,
        changing: l.changing,
      }))
    : [];

  /* =======================================================================
   * 渲染
   * ======================================================================= */

  /* 认证状态加载中 */
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-warning">加载中...</p>
      </div>
    );
  }

  /* 未登录 */
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-ink-light">请先登录后开始占卜</p>
        <Link
          href="/login"
          className="rounded border border-gold px-6 py-2 font-[family-name:var(--font-noto-serif)] text-ink transition-colors hover:bg-gold hover:text-ivory"
        >
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center py-8 sm:py-12">
      {/* 页面标题（仅在 IDLE 时显示） */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.h1
            className="mb-2 font-[family-name:var(--font-noto-serif)] text-2xl text-ink"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            摇卦占卜
          </motion.h1>
        )}
      </AnimatePresence>

      {/* ── IDLE：问题输入 ── */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <QuestionInput
              question={question}
              onQuestionChange={setQuestion}
              onSubmit={handleSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHAKING：龟壳摇卦动画 ── */}
      <AnimatePresence>
        {phase === "shaking" && (
          <motion.div
            key="shaking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <TurtleShake onComplete={handleShakeComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REVEALING：卦象逐行揭示 ── */}
      <AnimatePresence mode="wait">
        {phase === "revealing" && result && (
          <motion.div
            key={`revealing-${result.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <HexagramReveal
              lines={revealLines}
              originalName={result.hexagram.name}
              changedName={result.hexagram.changedName}
              onComplete={handleRevealComplete}
            />
          </motion.div>
        )}

        {/* REVEALING 无数据：等待 POST 返回，数据就绪后自动切换到 HexagramReveal */}
        {phase === "revealing" && !result && !error && (
          <motion.div
            key="revealing-wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <p className="font-[family-name:var(--font-noto-serif)] text-lg text-ink">
              卦象
            </p>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="inline-block w-2 h-2 rounded-full bg-gold"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-warning">排盘中...</p>
          </motion.div>
        )}

        {/* REVEALING 出错：显示错误 + 重试 */}
        {phase === "revealing" && !result && error && (
          <motion.div
            key="revealing-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 py-16"
          >
            <p className="text-warning">{error}</p>
            <button
              onClick={handleRetry}
              className="rounded border border-gold px-6 py-2 font-[family-name:var(--font-noto-serif)] text-gold hover:bg-gold hover:text-ivory transition-colors cursor-pointer"
            >
              重新占卜
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AWAITING / JUDGMENT / EXPANDED：判词 + 解卦 ── */}
      <AnimatePresence>
        {(phase === "awaiting" ||
          phase === "judgment" ||
          phase === "expanded") && (
          <motion.div
            key="judgment-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* 卦象回顾（缩略） */}
            {result && (
              <div className="opacity-60 scale-90 mb-2">
                <span className="text-xs text-warning font-[family-name:var(--font-body)]">
                  {result.hexagram.name}
                  {result.hexagram.changedName
                    ? ` → ${result.hexagram.changedName}`
                    : ""}
                </span>
              </div>
            )}

            {/* 网络错误 */}
            {error && error !== "天机未明，请稍后再试" && (
              <motion.div
                className="w-full max-w-lg mx-auto rounded bg-diviner p-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-warning mb-4">{error}</p>
                <button
                  onClick={handleRetry}
                  className="rounded border border-gold px-6 py-2 font-[family-name:var(--font-noto-serif)] text-gold hover:bg-gold hover:text-ivory transition-colors cursor-pointer"
                >
                  重新占卜
                </button>
              </motion.div>
            )}

            {/* LLM 失败：卦象正常，判词降级 */}
            {error === "天机未明，请稍后再试" && result && (
              <motion.div
                className="w-full max-w-lg mx-auto rounded bg-diviner p-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="font-[family-name:var(--font-noto-serif)] text-ink mb-3">
                  {result.hexagram.name}
                </p>
                <p className="text-warning mb-4">天机未明，请稍后再试</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleExpand}
                    className="rounded border border-gold px-5 py-2 font-[family-name:var(--font-noto-serif)] text-sm text-gold hover:bg-gold hover:text-ivory transition-colors cursor-pointer"
                  >
                    查看解读
                  </button>
                  <button
                    onClick={handleRetry}
                    className="rounded border border-ink-light/30 px-5 py-2 font-[family-name:var(--font-noto-serif)] text-sm text-ink-light hover:text-ink transition-colors cursor-pointer"
                  >
                    再次占卜
                  </button>
                </div>
              </motion.div>
            )}

            {/* 正常判词卡片 */}
            {!error && result && (
              <>
                <JudgmentCard
                  phase={
                    phase === "awaiting"
                      ? "awaiting"
                      : "judgment"
                  }
                  hexagramName={result.hexagram.name}
                  rarity={result.hexagram.rarity}
                  judgment={result.judgment}
                  onExpand={handleExpand}
                  onRetry={handleRetry}
                  canExpand={true}
                />

                {/* 解卦展开 */}
                <AnimatePresence>
                  {phase === "expanded" && (
                    <motion.div
                      key="interpretation"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3 },
                        opacity: { duration: 0.3 },
                      }}
                      className="w-full overflow-hidden"
                    >
                      <InterpretationSection
                        data={interpretation}
                        loading={loadingInterpretation}
                        error={interpretationError}
                      />

                      {/* 收起按钮 */}
                      {interpretation && (
                        <motion.div
                          className="flex justify-center pb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <button
                            onClick={() => setPhase("judgment")}
                            className="text-sm text-warning hover:text-ink-light transition-colors cursor-pointer font-[family-name:var(--font-body)]"
                          >
                            [收起]
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mock 模式提示 */}
      {isMockMode() && (
        <div className="mt-auto pt-8">
          <span className="text-[10px] text-warning/50">MOCK 模式</span>
        </div>
      )}
    </div>
  );
}
