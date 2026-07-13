"use client";

/**
 * 注册页面
 *
 * 与登录页结构相同，多一个"确认密码"字段。
 * 注册成功 → 自动登录 → 跳转 /dashboard。
 *
 * TASK-009 完整实现。
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

/** 简单邮箱正则 */
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 表单校验 */
  function validate(): string | null {
    if (!email.trim()) return "请输入邮箱";
    if (!EMAIL_RE.test(email.trim())) return "邮箱格式不正确";
    if (!password) return "请输入密码";
    if (password.length < 6) return "密码长度至少 6 位";
    if (password !== confirmPassword) return "两次输入的密码不一致";
    return null;
  }

  /** 提交注册 */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "注册失败，请稍后重试";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        className="w-full max-w-[400px] rounded bg-diviner px-10 py-12 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* 标题 */}
        <h1 className="mb-1 text-center font-[family-name:var(--font-noto-serif)] text-[36px] leading-tight text-ink">
          六爻
        </h1>
        <p className="mb-8 text-center font-[family-name:var(--font-body)] text-[18px] text-ink-light">
          注册
        </p>

        {/* 错误信息 */}
        {error && (
          <motion.p
            className="mb-4 rounded border border-red-300/50 bg-red-50/50 px-4 py-2 text-center text-sm text-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 邮箱 */}
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              disabled={isSubmitting}
              autoComplete="email"
              className="w-full bg-transparent px-2 py-3 font-[family-name:var(--font-body)] text-ink
                border-b border-ink-light/30
                placeholder:text-warning
                focus:border-gold focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-300"
            />
          </div>

          {/* 密码 */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码（至少 6 位）"
              disabled={isSubmitting}
              autoComplete="new-password"
              className="w-full bg-transparent px-2 py-3 pr-10 font-[family-name:var(--font-body)] text-ink
                border-b border-ink-light/30
                placeholder:text-warning
                focus:border-gold focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={isSubmitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-warning hover:text-ink-light
                transition-colors cursor-pointer disabled:opacity-50"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 确认密码 */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              disabled={isSubmitting}
              autoComplete="new-password"
              className="w-full bg-transparent px-2 py-3 pr-10 font-[family-name:var(--font-body)] text-ink
                border-b border-ink-light/30
                placeholder:text-warning
                focus:border-gold focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-300"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              disabled={isSubmitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-warning hover:text-ink-light
                transition-colors cursor-pointer disabled:opacity-50"
              aria-label={showConfirm ? "隐藏确认密码" : "显示确认密码"}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 注册按钮 */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={isSubmitting ? {} : { scale: 1.02 }}
            whileTap={isSubmitting ? {} : { scale: 0.98 }}
            className="mt-2 w-full rounded border border-gold py-3
              font-[family-name:var(--font-noto-serif)] text-base text-gold
              transition-all duration-300
              hover:bg-gold hover:text-ivory
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer"
          >
            {isSubmitting ? "注册中..." : "注 册"}
          </motion.button>
        </form>

        {/* 去登录 */}
        <p className="mt-6 text-center text-sm text-warning">
          已有账号？
          <Link
            href="/login"
            className="ml-1 text-ink-light underline underline-offset-2 transition-colors hover:text-gold"
          >
            去登录 →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
