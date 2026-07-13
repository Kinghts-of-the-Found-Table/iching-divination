/**
 * API 封装层
 *
 * 基于 fetch 的轻量 HTTP 客户端，自动附带 JWT 令牌并处理 401 响应。
 * 不引入 axios 等外部依赖——浏览器原生 fetch 已满足需求。
 */

import { API_BASE } from "./constants";

/**
 * 从 localStorage 读取 JWT 令牌。
 * 仅在浏览器环境下运行（避免 SSR 时访问 localStorage 导致报错）。
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("iching_token");
}

/**
 * 清除本地认证状态并跳转到登录页。
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("iching_token");
  window.location.href = "/login";
}

/**
 * 通用请求方法。
 * 自动注入 Authorization header，并在 401 时清除令牌并跳转登录页。
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("认证已过期，请重新登录");
  }

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody.detail) {
        message = errorBody.detail;
      }
    } catch {
      // 非 JSON 响应体，使用状态码即可
    }
    throw new Error(message);
  }

  // 204 No Content 不做 JSON 解析
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * GET 请求
 *
 * @param path - API 路径（如 "/api/user/me"）
 * @returns 响应 JSON 反序列化后的对象
 */
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

/**
 * POST 请求
 *
 * @param path - API 路径
 * @param body - 请求体（会被 JSON.stringify）
 * @returns 响应 JSON 反序列化后的对象
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
