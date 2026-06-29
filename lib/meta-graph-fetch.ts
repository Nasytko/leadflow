import { parseGraphApiError, GraphApiError } from "@/lib/facebook-errors";

export type MetaGraphErrorCode =
  | "META_TIMEOUT"
  | "META_NETWORK"
  | "META_RATE_LIMIT"
  | "META_PERMISSION"
  | "META_GRAPH"
  | "META_UNKNOWN";

export class MetaGraphError extends GraphApiError {
  readonly metaCode: MetaGraphErrorCode;
  readonly stage?: string;
  readonly timeout: boolean;
  readonly networkError: boolean;
  readonly rateLimited: boolean;
  readonly permissionDenied: boolean;

  constructor(
    message: string,
    metaCode: MetaGraphErrorCode,
    options?: {
      code?: number;
      raw?: unknown;
      stage?: string;
      timeout?: boolean;
      networkError?: boolean;
      rateLimited?: boolean;
      permissionDenied?: boolean;
    }
  ) {
    super(message, options?.code, options?.raw);
    this.name = "MetaGraphError";
    this.metaCode = metaCode;
    this.stage = options?.stage;
    this.timeout = options?.timeout ?? false;
    this.networkError = options?.networkError ?? false;
    this.rateLimited = options?.rateLimited ?? false;
    this.permissionDenied = options?.permissionDenied ?? false;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "ENOTFOUND") {
    return true;
  }
  const msg = error.message.toLowerCase();
  return msg.includes("fetch failed") || msg.includes("network");
}

function classifyGraphError(error: GraphApiError, stage?: string): MetaGraphError {
  const code = error.code;
  const msg = error.message.toLowerCase();

  if (code === 4 || code === 17 || code === 32 || msg.includes("rate limit")) {
    return new MetaGraphError(error.message, "META_RATE_LIMIT", {
      code,
      raw: error.raw,
      stage,
      rateLimited: true,
    });
  }

  if (
    code === 10 ||
    code === 200 ||
    msg.includes("permission") ||
    msg.includes("leads_retrieval")
  ) {
    return new MetaGraphError(error.message, "META_PERMISSION", {
      code,
      raw: error.raw,
      stage,
      permissionDenied: true,
    });
  }

  return new MetaGraphError(error.message, "META_GRAPH", {
    code,
    raw: error.raw,
    stage,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch Meta Graph API with timeout, retries (network only), and normalized errors.
 */
export async function metaGraphFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number; stage?: string }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = init?.retries ?? DEFAULT_RETRIES;
  const stage = init?.stage;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { timeoutMs: _t, retries: _r, stage: _s, ...fetchInit } = init ?? {};
      const res = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      const aborted =
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("aborted"));

      if (aborted) {
        if (attempt < retries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new MetaGraphError(
          "Meta API request timed out",
          "META_TIMEOUT",
          { stage, timeout: true, networkError: true }
        );
      }

      if (isRetryableNetworkError(error) && attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }

      if (isRetryableNetworkError(error)) {
        throw new MetaGraphError(
          error instanceof Error ? error.message : "Network error",
          "META_NETWORK",
          { stage, networkError: true }
        );
      }

      throw new MetaGraphError(
        error instanceof Error ? error.message : "Unknown fetch error",
        "META_UNKNOWN",
        { stage, networkError: true }
      );
    }
  }

  throw new MetaGraphError(
    lastError instanceof Error ? lastError.message : "Meta API request failed",
    "META_UNKNOWN",
    { stage, networkError: true }
  );
}

/** JSON helper: throws MetaGraphError on HTTP / Graph errors. */
export async function metaGraphFetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number; stage?: string }
): Promise<T> {
  const stage = init?.stage;
  const res = await metaGraphFetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw classifyGraphError(parseGraphApiError(text), stage);
  }
  return res.json() as Promise<T>;
}
