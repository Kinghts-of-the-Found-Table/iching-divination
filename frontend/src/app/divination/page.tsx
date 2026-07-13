"use client";

/**
 * 占卜流程页面 — 核心交互（v1.2 逐爻摇卦版）
 *
 * 状态机：IDLE → SHAKING → JUDGMENT → EXPANDED
 *
 * SHAKING 阶段用户点击龟壳 6 次，每爻结果即时显示。
 * 第 6 次完成后发起 API 获取判词，进入 JUDGMENT。
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

import QuestionInput from "@/components/divination/QuestionInput";
import TurtleShake, { type LineResult } from "@/components/divination/TurtleShake";
import JudgmentCard from "@/components/divination/JudgmentCard";
import InterpretationSection, { type InterpretationData } from "@/components/divination/InterpretationSection";
import {
  mockDivination, mockInterpretation, isMockMode, type MockDivinationResponse,
} from "@/lib/mock";
import { apiPost, apiGet } from "@/lib/api";
import { HEXAGRAM_DATA } from "@/lib/constants";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

type DivinationPhase = "idle" | "shaking" | "judgment" | "expanded";

interface RealDivinationResponse {
  id: string;
  question: string;
  hexagram: { original: { name: string; lines: number[]; trigram_upper: string; trigram_lower: string }; changing_lines: number[]; transformed: { name: string } | null; mutual: { name: string }; rarity: string };
  judgment_cn: string | null;
  created_at: string;
}

interface RealInterpretationResponse { reading_id: string; interpretation: string; cached: boolean; }

function parseInterpretation(text: string): InterpretationData {
  const s: InterpretationData = { directAnswer: "", hexagramAnalysis: "", practicalAdvice: "" };
  const m1 = text.match(/【直接回答】([\s\S]*?)(?=【卦象与变爻分析】|$)/);
  const m2 = text.match(/【卦象与变爻分析】([\s\S]*?)(?=【务实建议】|$)/);
  const m3 = text.match(/【务实建议】([\s\S]*?)$/);
  if (m1) s.directAnswer = m1[1].trim();
  if (m2) s.hexagramAnalysis = m2[1].trim();
  if (m3) s.practicalAdvice = m3[1].trim();
  return s;
}

function normalizeResponse(data: RealDivinationResponse): MockDivinationResponse {
  const h = data.hexagram;
  const set_ = new Set(h.changing_lines);
  return {
    id: data.id,
    hexagram: {
      name: h.original.name,
      changedName: h.transformed?.name,
      lines: h.original.lines.map((v, i) => ({
        position: i + 1,
        type: (v === 7 || v === 9 ? "yang" : "yin") as "yang" | "yin",
        changing: set_.has(i),
      })),
      rarity: (h.rarity || "中平") as MockDivinationResponse["hexagram"]["rarity"],
    },
    judgment: data.judgment_cn || "",
  };
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

export default function DivinationPage() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [phase, setPhase] = useState<DivinationPhase>("idle");
  const [question, setQuestion] = useState("");
  const [lineCount, setLineCount] = useState(0);
  const [collectedLines, setCollectedLines] = useState<LineResult[]>([]);
  const [result, setResult] = useState<MockDivinationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingJudgment, setAwaitingJudgment] = useState(false);

  const [interpretation, setInterpretation] = useState<InterpretationData | null>(null);
  const [loadingInterpretation, setLoadingInterpretation] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  /* ── 每爻回调 ── */
  const handleLineRevealed = useCallback((line: LineResult) => {
    setCollectedLines((prev) => [...prev, line]);
    setLineCount((prev) => prev + 1);
  }, []);

  /* ── 六爻完成 → 发起 API ── */
  const handleShakeComplete = useCallback(async () => {
    setAwaitingJudgment(true);
    try {
      const data = isMockMode()
        ? await mockDivination(question)
        : await apiPost<RealDivinationResponse>("/api/divination", { question }).then(normalizeResponse);
      setResult(data);
      setPhase("judgment");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "网络异常，请稍后重试";
      setError(msg);
    } finally {
      setAwaitingJudgment(false);
    }
  }, [question]);

  /* ── 展开解卦 ── */
  const handleExpand = useCallback(async () => {
    if (!result) return;
    setPhase("expanded");
    setLoadingInterpretation(true);
    setInterpretationError(null);
    try {
      const data = isMockMode()
        ? await mockInterpretation(result.hexagram.name)
        : await apiGet<RealInterpretationResponse>(`/api/divination/${result.id}/interpretation`)
            .then((r) => parseInterpretation(r.interpretation));
      setInterpretation(data);
    } catch (e) {
      setInterpretationError(e instanceof Error ? e.message : "解读加载失败");
    } finally {
      setLoadingInterpretation(false);
    }
  }, [result]);

  /* ── 重新占卜 ── */
  const handleRetry = useCallback(() => {
    setPhase("idle"); setQuestion(""); setLineCount(0); setCollectedLines([]);
    setResult(null); setError(null); setInterpretation(null); setInterpretationError(null);
    setAwaitingJudgment(false);
  }, []);

  /* ── 渲染 ── */

  if (authLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-warning">加载中...</p></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-ink-light">请先登录后开始占卜</p>
        <Link href="/login" className="rounded border border-gold px-6 py-2 font-[family-name:var(--font-noto-serif)] text-ink transition-colors hover:bg-gold hover:text-ivory">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center py-8 sm:py-12">
      {/* 标题 */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.h1 className="mb-2 font-[family-name:var(--font-noto-serif)] text-2xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            摇卦占卜
          </motion.h1>
        )}
      </AnimatePresence>

      {/* IDLE */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="w-full flex justify-center">
            <QuestionInput question={question} onQuestionChange={setQuestion} onSubmit={() => { if (question.trim()) setPhase("shaking"); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHAKING */}
      <AnimatePresence>
        {phase === "shaking" && (
          <motion.div key="shaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center gap-4">
            {/* 进度 + 已收集的爻 */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-gold-light/60 font-[family-name:var(--font-body)]">第 {lineCount}/6 爻</p>
              <div className="flex gap-3 flex-wrap justify-center">
                {collectedLines.map((l) => (
                  <span key={l.position} className={`text-xs font-[family-name:var(--font-body)] ${l.changing ? "text-gold-light" : "text-gold-light/50"}`}>
                    {l.positionName} {l.typeName}
                  </span>
                ))}
              </div>
            </div>
            <TurtleShake onLineRevealed={handleLineRevealed} onComplete={handleShakeComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AWAITING API */}
      <AnimatePresence>
        {awaitingJudgment && (
          <motion.div key="awaiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-16">
            <p className="font-[family-name:var(--font-noto-serif)] text-lg">推演天机...</p>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="inline-block w-2 h-2 rounded-full bg-gold" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6 }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JUDGMENT + EXPANDED */}
      <AnimatePresence>
        {(phase === "judgment" || phase === "expanded") && (
          <motion.div key="judgment-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center gap-4">
            {error && (
              <div className="w-full max-w-lg mx-auto rounded bg-diviner p-6 text-center">
                <p className="text-warning mb-4">{error}</p>
                <button onClick={handleRetry} className="rounded border border-gold px-6 py-2 font-[family-name:var(--font-noto-serif)] text-gold hover:bg-gold hover:text-ivory transition-colors cursor-pointer">重新占卜</button>
              </div>
            )}

            {!error && result && (
              <>
                <JudgmentCard
                  phase={phase === "judgment" ? "judgment" : "judgment"}
                  hexagramName={result.hexagram.name}
                  rarity={result.hexagram.rarity}
                  judgment={result.judgment}
                  onExpand={handleExpand}
                  onRetry={handleRetry}
                  canExpand={true}
                />

                <AnimatePresence>
                  {phase === "expanded" && (
                    <motion.div key="interpretation" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full overflow-hidden">
                      <InterpretationSection data={interpretation} loading={loadingInterpretation} error={interpretationError} />
                      {interpretation && (
                        <div className="flex justify-center pb-4">
                          <button onClick={() => setPhase("judgment")} className="text-sm text-warning hover:text-ink-light transition-colors cursor-pointer font-[family-name:var(--font-body)]">[收起]</button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isMockMode() && <div className="mt-auto pt-8"><span className="text-[10px] text-warning/50">MOCK 模式</span></div>}
    </div>
  );
}
