import { getRedis } from "./redis";
import { isProduction } from "./env";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000,
  };
}

export async function rateLimitByIp(
  ip: string,
  limit = 100,
  windowSeconds = 60
): Promise<RateLimitResult> {
  if (ip === "unknown" && isProduction()) {
    return rateLimit("ip:unknown", Math.floor(limit / 2), windowSeconds);
  }
  return rateLimit(`ip:${ip}`, limit, windowSeconds);
}

export async function rateLimitByUser(
  userId: string,
  limit = 200,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, limit, windowSeconds);
}
