import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { writeSystemLog } from "@/lib/system-log";
import { getClientIp } from "@/lib/utils";

export type AuthRateLimitAction =
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password"
  | "resend_verification"
  | "verify_email";

const LIMITS: Record<
  AuthRateLimitAction,
  { limit: number; windowSeconds: number; compositeEmail?: boolean }
> = {
  login: { limit: 5, windowSeconds: 15 * 60, compositeEmail: true },
  register: { limit: 3, windowSeconds: 60 * 60 },
  forgot_password: { limit: 3, windowSeconds: 60 * 60, compositeEmail: true },
  reset_password: { limit: 5, windowSeconds: 60 * 60 },
  resend_verification: { limit: 3, windowSeconds: 60 * 60, compositeEmail: true },
  verify_email: { limit: 10, windowSeconds: 60 * 60 },
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildKey(
  action: AuthRateLimitAction,
  ip: string,
  email?: string | null
): string {
  const config = LIMITS[action];
  if (config.compositeEmail && email) {
    return `auth:${action}:${normalizeEmail(email)}:${ip}`;
  }
  if (email) {
    return `auth:${action}:${normalizeEmail(email)}`;
  }
  return `auth:${action}:ip:${ip}`;
}

export async function checkAuthRateLimit(params: {
  action: AuthRateLimitAction;
  request: Request;
  email?: string | null;
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const ip = getClientIp(params.request);
  const config = LIMITS[params.action];
  const key = buildKey(params.action, ip, params.email);
  const result = await rateLimit(key, config.limit, config.windowSeconds);

  if (result.success) {
    return { allowed: true };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  await writeSystemLog({
    level: "warn",
    source: "system",
    action: "security.rate_limit",
    message: `Rate limit exceeded: ${params.action}`,
    metadata: {
      action: params.action,
      ipAddress: ip,
      email: params.email ? normalizeEmail(params.email) : undefined,
      retryAfterSeconds,
    },
  });

  return { allowed: false, retryAfterSeconds };
}

export function rateLimitedResponse(retryAfterSeconds?: number) {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds,
      },
    },
    {
      status: 429,
      headers: retryAfterSeconds
        ? { "Retry-After": String(retryAfterSeconds) }
        : undefined,
    }
  );
}

export async function parseCredentialsEmail(
  request: Request
): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.clone().json()) as { email?: string };
      return body.email ?? null;
    }
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.clone().formData();
      const email = form.get("email");
      return typeof email === "string" ? email : null;
    }
    const text = await request.clone().text();
    if (text.includes("email=")) {
      const params = new URLSearchParams(text);
      return params.get("email");
    }
  } catch {
    return null;
  }
  return null;
}
