"use client";

/**
 * 解卦展开区域
 *
 * 点击"查看详细解读"后展开，三段式解读：
 * - 【直接回答】
 * - 【卦象与变爻分析】
 * - 【务实建议】
 *
 * 爻辞原文用金色高亮（《爻辞》格式）。
 * 支持展开/收起动画。
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 解卦响应数据 */
export interface InterpretationData {
  /** 直接回答用户的问题 */
  directAnswer: string;
  /** 卦象与变爻分析 */
  hexagramAnalysis: string;
  /** 务实建议 */
  practicalAdvice: string;
}

/** InterpretationSection 组件属性 */
export interface InterpretationSectionProps {
  /** 解卦数据（已加载时传入） */
  data?: InterpretationData | null;
  /** 是否正在加载解卦数据 */
  loading?: boolean;
  /** 加载错误信息 */
  error?: string | null;
}

/* =========================================================================
 * 子组件：单段解读
 * ========================================================================= */

/** 单段解读区块 */
function InterpretationBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* 段标题 — serif + ink */}
      <h4 className="mb-3 font-[family-name:var(--font-noto-serif)] text-base text-ink">
        {title}
      </h4>

      {/* 段正文 — 处理《爻辞》金色高亮 */}
      <div className="font-[family-name:var(--font-body)] text-sm sm:text-base text-ink-light leading-[1.9] whitespace-pre-line">
        {renderContent(content)}
      </div>
    </motion.div>
  );
}

/**
 * 渲染正文内容，将《爻辞》格式的引用高亮为金色。
 *
 * 匹配模式：《...》→ 金色文字
 */
function renderContent(text: string): React.ReactNode {
  // 按《...》分割文本，交替渲染
  const parts = text.split(/《([^》]+)》/);
  return parts.map((part, index) => {
    // 奇数下标为《》内的爻辞内容
    if (index % 2 === 1) {
      return (
        <span key={index} className="text-gold-light font-[family-name:var(--font-noto-serif)]">
          《{part}》
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/* =========================================================================
 * 主组件
 * ========================================================================= */

/**
 * 解卦展开区域。
 *
 * 加载中显示"解读中..."，加载完成后分三段渲染。
 * 每段使用 motion 渐入动画。
 */
export default function InterpretationSection({
  data,
  loading = false,
  error = null,
}: InterpretationSectionProps) {
  return (
    <div className="w-full max-w-lg mx-auto px-6 pb-4">
      <AnimatePresence mode="wait">
        {/* 加载中 */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-8"
          >
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-gold"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-gold"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
            <motion.span
              className="inline-block w-2 h-2 rounded-full bg-gold"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
            />
            <span className="ml-2 text-sm text-warning font-[family-name:var(--font-body)]">
              解读中...
            </span>
          </motion.div>
        )}

        {/* 错误 */}
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 text-center"
          >
            <p className="text-sm text-warning font-[family-name:var(--font-body)]">
              {error}
            </p>
          </motion.div>
        )}

        {/* 解卦内容 */}
        {data && !loading && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* 分隔线 */}
            <div className="mb-6 border-t border-gold/15" />

            <InterpretationBlock title="【直接回答】" content={data.directAnswer} />
            <InterpretationBlock
              title="【卦象与变爻分析】"
              content={data.hexagramAnalysis}
            />
            <InterpretationBlock title="【务实建议】" content={data.practicalAdvice} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
