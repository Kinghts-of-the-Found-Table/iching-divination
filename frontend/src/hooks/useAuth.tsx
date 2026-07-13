"use client";

/**
 * 认证状态管理 — Context + Hook
 *
 * 提供全局认证状态，所有组件通过 useAuth() 访问。
 * AuthProvider 在应用初始化时从 localStorage 恢复 token 并验证有效性。
 *
 * TASK-009 完整实现：登录、注册、登出、自动恢复会话。
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { API_BASE } from "@/lib/constants";

/* =========================================================================
 * 类型定义
 * ========================================================================= */

/** 用户信息 */
export interface User {
  email: string;
  subscription: string;
}

/** 认证上下文值（由 useAuth() 返回） */
export interface AuthContextValue {
  /** 当前用户信息，未登录时为 null */
  user: User | null;
  /** JWT access token */
  token: string | null;
  /** 认证状态是否仍在加载中（初始化时检查 token 有效性） */
  isLoading: boolean;
  /** 是否已登录（token 有效 + user 非空） */
  isLoggedIn: boolean;
  /** 是否为付费用户 */
  isPremium: boolean;
  /** 今日剩余占卜次数（-1 或 Infinity 表示无限制） */
  remainingQuota: number;
  /** 登录：成功后将 token 存 localStorage 并拉取用户信息 */
  login: (email: string, password: string) => Promise<void>;
  /** 注册：成功后自动登录 */
  register: (email: string, password: string) => Promise<void>;
  /** 登出：清除 token 和用户状态 */
  logout: () => void;
  /** 页面加载时从 localStorage 恢复 token 并验证有效性 */
  checkAuth: () => Promise<void>;
}

/* =========================================================================
 * Context
 * ========================================================================= */

const AuthContext = createContext<AuthContextValue | null>(null);

/** localStorage 键名 */
const TOKEN_KEY = "iching_token";

/* =========================================================================
 * AuthProvider — 认证状态管理者
 * ========================================================================= */

/**
 * 认证状态 Provider。
 *
 * 在应用根布局中包裹所有组件，提供全局认证上下文。
 * 初始化时尝试从 localStorage 恢复 token 并调用 /api/user/profile 验证。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingQuota, setRemainingQuota] = useState(0);

  const isLoggedIn = !!token && !!user;
  const isPremium = user?.subscription !== "free";

  /* ── checkAuth：从 localStorage 恢复并验证 token ── */

  const checkAuth = useCallback(async () => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

    if (!stored) {
      setToken(null);
      setUser(null);
      setRemainingQuota(0);
      setIsLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        headers: { Authorization: `Bearer ${stored}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        // token 无效或过期 → 清除
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setRemainingQuota(0);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error("获取用户信息失败");
      }

      const data = await res.json();
      setToken(stored);
      setUser({ email: data.email, subscription: data.subscription });
      setRemainingQuota(
        data.daily_remaining === -1 ? Infinity : data.daily_remaining
      );
    } catch {
      // 网络错误等：保留 token 待重试，标记未登录
      setToken(stored);
      setUser(null);
      setRemainingQuota(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ── login：POST /api/auth/login → 存 token → 拉 profile ── */

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ detail: "登录失败，请稍后重试" }));
      throw new Error(errorData.detail || "登录失败");
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);

    // 拉取用户信息
    const profileRes = await fetch(`${API_BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setUser({ email: profile.email, subscription: profile.subscription });
      setRemainingQuota(
        profile.daily_remaining === -1 ? Infinity : profile.daily_remaining
      );
    } else {
      // 刚拿到的 token 却无法拉 profile（极端情况），至少设个基本 user
      setUser({ email, subscription: "free" });
      setRemainingQuota(3);
    }
  }, []);

  /* ── register：POST /api/auth/register → 自动登录 ── */

  const register = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ detail: "注册失败，请稍后重试" }));
      throw new Error(errorData.detail || "注册失败");
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);

    // 拉取用户信息
    const profileRes = await fetch(`${API_BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setUser({ email: profile.email, subscription: profile.subscription });
      setRemainingQuota(
        profile.daily_remaining === -1 ? Infinity : profile.daily_remaining
      );
    } else {
      setUser({ email, subscription: "free" });
      setRemainingQuota(3);
    }
  }, []);

  /* ── logout：清除所有状态 ── */

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setRemainingQuota(0);
  }, []);

  /* ── 初始化：检查认证状态 ── */

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /* ── 提供上下文 ── */

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isLoggedIn,
        isPremium,
        remainingQuota,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================================
 * useAuth hook
 * ========================================================================= */

/**
 * 获取当前认证状态。
 *
 * 必须在 AuthProvider 内部使用，否则抛出错误。
 *
 * @returns 认证上下文值，包含用户信息、登录/注册/登出方法。
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 必须在 <AuthProvider> 内部使用");
  }
  return ctx;
}
