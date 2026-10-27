/**
 * Thin client for the FastAPI backend running on the Raspberry Pi.
 * Base URL is configured via VITE_API_BASE_URL — a Tailscale Funnel HTTPS
 * URL (e.g. https://acpi.tail3f987b.ts.net) or a Cloudflare Tunnel URL that
 * fronts the Pi.
 *
 * Every request attaches the current Supabase access token so the FastAPI
 * backend can verify the caller against Supabase Auth.
 */
import { supabase } from "@/lib/supabase"

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://acpi.tail3f987b.ts.net"

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

// The access token is kept in memory and updated by the auth listener, so a
// request never waits on supabase.auth.getSession() (which can queue behind
// a token refresh) before it can leave the phone.
let cachedToken: string | null = null
let tokenReady: Promise<void> | null = null

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null
})

async function authHeaders(): Promise<HeadersInit> {
  if (cachedToken === null) {
    tokenReady ??= supabase.auth.getSession().then(({ data }) => {
      cachedToken = data.session?.access_token ?? null
    })
    await tokenReady
    tokenReady = null
  }
  return cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {}
}

// A request that hangs (Pi busy, bad signal) must fail in seconds so the UI
// can show "offline" / retry, instead of spinning for the browser's minutes.
const DEFAULT_TIMEOUT_MS = 8_000

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = await authHeaders()

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...init.headers,
      },
    })
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new ApiError("The AC controller took too long to answer", 0, null)
    }
    throw err
  }

  const contentType = res.headers.get("content-type") ?? ""
  const body = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null)

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : undefined) ?? `Request failed with status ${res.status}`
    throw new ApiError(message, res.status, body)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
