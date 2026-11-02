/**
 * Thin, typed API client. The session lives in an httpOnly cookie (never readable by JS);
 * mutating requests carry the X-FinPilot-Client header for CSRF protection.
 * No secrets or API keys ever live in frontend code.
 */
import type { ApiErrorBody } from "@finpilot/shared";

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-FinPilot-Client": "web" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach FinPilot. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? `Request failed (${res.status})`, err?.fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

/** Download a file from an authenticated endpoint (CSV / JSON export). */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, "DOWNLOAD_FAILED", "Download failed. Please try again.");
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
