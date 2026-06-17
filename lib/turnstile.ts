import { isProduction } from "@/lib/env";

export function isTurnstileEnabled(): boolean {
  const enabled = (process.env.TURNSTILE_ENABLED ?? "").toLowerCase();
  if (!enabled) return false;
  return enabled === "true" || enabled === "1" || enabled === "yes";
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.TURNSTILE_SITE_KEY?.trim();
  return key ? key : null;
}

export async function verifyTurnstileToken(params: {
  token: string;
  ip?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isTurnstileEnabled()) return { ok: true };

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    // In production this is misconfiguration; in dev allow to proceed so local setup isn't blocked.
    if (isProduction()) return { ok: false, error: "TURNSTILE_MISCONFIGURED" };
    return { ok: true };
  }

  const body = new URLSearchParams({
    secret,
    response: params.token,
  });
  if (params.ip) body.set("remoteip", params.ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (data.success) return { ok: true };
  return { ok: false, error: (data["error-codes"] ?? ["invalid"]).join(",") };
}

