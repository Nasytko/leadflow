import { getRedis } from "./redis";

export async function saveOAuthState(
  key: string,
  userId: string,
  ttlSeconds = 600
): Promise<void> {
  const redis = getRedis();
  await redis.setex(key, ttlSeconds, userId);
}

export async function getOAuthState(key: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(key);
}

export async function deleteOAuthState(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(key);
}
