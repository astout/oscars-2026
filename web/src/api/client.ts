import { getCurrentSession } from "../auth/cognito.js";

const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api/v1`;
const PUBLIC_API_BASE = `${import.meta.env.VITE_API_URL || ""}/api/public/v1`;

async function request<T>(
  path: string,
  options: RequestInit = {},
  base: string = API_BASE
): Promise<T> {
  const token = localStorage.getItem("idToken");

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && base !== PUBLIC_API_BASE) {
    // Token expired — refresh via Cognito SDK and retry once
    const tokens = await getCurrentSession();
    if (!tokens) throw new Error("Session expired");

    const retry = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.idToken}`,
        ...options.headers,
      },
    });

    if (!retry.ok) {
      const body = await retry.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${retry.status}`);
    }
    return retry.json();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const publicApi = {
  get: <T>(path: string) => request<T>(path, {}, PUBLIC_API_BASE),
};
