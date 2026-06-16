import Redis from "ioredis";
import { getRedisUrl } from "./env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient();
  }
  return globalForRedis.redis;
}

export function getRedisConnectionOptions() {
  const url = new URL(getRedisUrl());
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379", 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

export function createRedisConnection(): Redis {
  return createRedisClient();
}
