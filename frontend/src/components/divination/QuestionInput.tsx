"use client";

/**
 * 问题输入组件 — 占卜流程的第一步
 *
 * 提供简洁的文字输入区，引导用户静心默念问题。
 * 设计克制：透明底、底部单线边框、聚焦时变金色。
 */

import { motion } from "framer-motion";

/** QuestionInput 组件属性 */
export interface QuestionInputProps {
  /** 用户输入的问题文本 */
  question: string;
  /** 问题文本变更回调 */
  onQuestionChange: (value: string) => void;
  /** 点击"开始摇卦"回调 */
  onSubmit: () => void;
  /** 是否禁用交互（动画播放中） */
  disabled?: boolean;
}

/** 问题最大字符数 */
const MAX_LENGTH = 200;

/**
 * 问题输入区域。
 *
 * 结构：标题 → 输入框 → 字数计数 + 提交按钮。
 * 输入框透明底 + 底部 1px 线，聚焦时线变金色。
 */
export default function QuestionInput({
  question,
  onQuestionChange,
  onSubmit,
  disabled = false,
}: QuestionInputProps) {
  const isOverLimit = question.length > MAX_LENGTH;
  const isSubmitDisabled = disabled || question.trim().length === 0;

  return (
    <motion.div
      className="w-full max-w-md mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* 标题 */}
      <h2 className="mb-8 text-center font-[family-name:var(--font-noto-serif)] text-xl text-ink">
        请默念你所问之事
      </h2>

      {/* 输入框区域 */}
      <div className="relative mb-6">
        <textarea
          value={question}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              onQuestionChange(e.target.value);
            }
          }}
          placeholder="例如：我今年的事业发展如何？"
          disabled={disabled}
          rows={3}
          className="w-full resize-none bg-transparent px-2 py-3 text-ink
            font-[family-name:var(--font-noto-serif)] text-lg leading-relaxed
            border-b border-ink-light/30
            placeholder:text-warning placeholder:font-[family-name:var(--font-body)]
            focus:border-gold focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-300"
        />
      </div>

      {/* 字数计数 + 按钮 */}
      <div className="flex items-center justify-between">
        {/* 字数计数 */}
        <span
          className={`text-xs ${
            isOverLimit ? "text-red-500" : "text-warning"
          } font-[family-name:var(--font-body)]`}
        >
          {question.length}/{MAX_LENGTH}
        </span>

        {/* 开始摇卦按钮 */}
        <motion.button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          whileHover={isSubmitDisabled ? {} : { scale: 1.02 }}
          whileTap={isSubmitDisabled ? {} : { scale: 0.98 }}
          className={`rounded border px-8 py-2 font-[family-name:var(--font-noto-serif)] text-base
            transition-all duration-300
            ${
              isSubmitDisabled
                ? "border-warning/30 text-warning cursor-not-allowed"
                : "border-gold text-gold hover:bg-gold hover:text-ivory cursor-pointer"
            }`}
        >
          开始摇卦
        </motion.button>
      </div>
    </motion.div>
  );
}
