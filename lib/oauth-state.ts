import { getRedis } from "./redis";

export type OAuthStatePayload = {
  userId: string;
  locale?: string;
};

export function parseOAuthStateValue(raw: string | null): OAuthStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: string; locale?: string };
    if (parsed?.userId && typeof parsed.userId === "string") {
      return {
        userId: parsed.userId,
        locale: parsed.locale ?? "ru",
      };
    }
  } catch {
    // legacy: value is plain userId
  }
  return { userId: raw, locale: "ru" };
}

export async function saveOAuthState(
  key: string,
  value: string | OAuthStatePayload,
  ttlSeconds = 600
): Promise<void> {
  const redis = getRedis();
  const payload =
    typeof value === "string" ? value : JSON.stringify(value);
  await redis.setex(key, ttlSeconds, payload);
}

export async function getOAuthState(key: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(key);
}

export async function deleteOAuthState(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}
