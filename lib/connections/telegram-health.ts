export type TelegramHealthCheckStatus = "ok" | "warning" | "error";

export type TelegramHealthCheck = {
  id: string;
  status: TelegramHealthCheckStatus;
  messageKey: string;
};

export type TelegramHealthStatus = "healthy" | "attention" | "critical";

export type TelegramHealthResult = {
  score: number;
  status: TelegramHealthStatus;
  checks: TelegramHealthCheck[];
};

export type TelegramHealthInput = {
  connected: boolean;
  hasChatId: boolean;
  verified: boolean;
  hasError: boolean;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolveStatus(score: number): TelegramHealthStatus {
  if (score >= 80) return "healthy";
  if (score >= 50) return "attention";
  return "critical";
}

export function computeTelegramHealth(input: TelegramHealthInput): TelegramHealthResult {
  const checks: TelegramHealthCheck[] = [];
  let score = 100;

  if (!input.connected && input.hasError) {
    checks.push({ id: "connection", status: "error", messageKey: "error" });
    return { score: 20, status: "critical", checks };
  }

  if (!input.connected) {
    checks.push({ id: "connection", status: "error", messageKey: "notConnected" });
    return { score: 0, status: "critical", checks };
  }

  checks.push({ id: "connection", status: "ok", messageKey: "connected" });

  if (!input.hasChatId) {
    checks.push({ id: "chat", status: "warning", messageKey: "noChatId" });
    score -= 30;
  } else {
    checks.push({ id: "chat", status: "ok", messageKey: "chatConfigured" });
  }

  if (!input.verified) {
    checks.push({ id: "test", status: "warning", messageKey: "notVerified" });
    score -= 25;
  } else {
    checks.push({ id: "test", status: "ok", messageKey: "verified" });
  }

  if (input.hasError) {
    checks.push({ id: "delivery", status: "error", messageKey: "deliveryError" });
    score -= 20;
  }

  const finalScore = clampScore(score);
  return { score: finalScore, status: resolveStatus(finalScore), checks };
}
