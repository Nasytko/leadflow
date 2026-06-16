export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!url) {
    if (isProduction()) {
      throw new Error("NEXTAUTH_URL is required in production");
    }
    return "http://localhost:3000";
  }
  return url;
}

export function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (isProduction()) {
      throw new Error("REDIS_URL is required in production");
    }
    return "redis://localhost:6379";
  }
  return url;
}

export function getRedirectUri(): string {
  return (
    process.env.FACEBOOK_REDIRECT_URI ?? `${getAppUrl()}/api/facebook/callback`
  );
}

export function getWebhookUrl(): string {
  return `${getAppUrl()}/api/webhooks/meta`;
}
