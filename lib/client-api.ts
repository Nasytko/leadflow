import { CSRF_HEADER } from "@/lib/csrf-constants";

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

export async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = fetch("/api/csrf")
      .then((res) => res.json())
      .then((data) => {
        csrfToken = data.data?.token ?? null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

export function clearCsrfToken() {
  csrfToken = null;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Fetch wrapper that attaches CSRF header for mutating dashboard API calls. */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);

  if (MUTATING_METHODS.has(method)) {
    const url = typeof input === "string" ? input : input.toString();
    const skipCsrf =
      url.includes("/api/auth/") ||
      url.includes("/api/webhooks/") ||
      url.includes("/api/facebook/callback");

    if (!skipCsrf) {
      const token = await ensureCsrfToken();
      if (!token) {
        throw new Error("CSRF token unavailable");
      }
      headers.set(CSRF_HEADER, token);
    }
  }

  return fetch(input, { ...init, headers });
}
