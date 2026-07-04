export type FacebookHealthCheckStatus = "ok" | "warning" | "error";

export type FacebookHealthCheck = {
  id: string;
  status: FacebookHealthCheckStatus;
  messageKey: string;
  messageParams?: Record<string, string | number>;
};

export type FacebookHealthStatus = "healthy" | "attention" | "critical";

export type FacebookHealthResult = {
  score: number;
  status: FacebookHealthStatus;
  checks: FacebookHealthCheck[];
};

export type FacebookHealthInput = {
  connected: boolean;
  tokenInvalid: boolean;
  tokenExpired: boolean;
  connectedPagesCount: number;
  totalPagesCount: number;
  activeFormsCount: number;
  webhookVerified: boolean;
  formsWithoutLeads: number;
  pagesWithWebhookIssues: number;
  hasConnectionError?: boolean;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolveStatus(score: number): FacebookHealthStatus {
  if (score >= 80) return "healthy";
  if (score >= 50) return "attention";
  return "critical";
}

export function computeFacebookHealth(input: FacebookHealthInput): FacebookHealthResult {
  const checks: FacebookHealthCheck[] = [];
  let score = 100;

  if (!input.connected) {
    checks.push({ id: "connection", status: "error", messageKey: "checks.notConnected" });
    return { score: 0, status: "critical", checks };
  }

  if (input.tokenExpired || input.tokenInvalid) {
    checks.push({
      id: "token",
      status: "error",
      messageKey: input.tokenExpired ? "checks.tokenExpired" : "checks.tokenInvalid",
    });
    score -= 40;
  } else {
    checks.push({ id: "token", status: "ok", messageKey: "checks.tokenValid" });
  }

  if (input.connectedPagesCount === 0) {
    checks.push({ id: "pages", status: "error", messageKey: "checks.noPagesConnected" });
    score -= 25;
  } else {
    checks.push({
      id: "pages",
      status: "ok",
      messageKey: "checks.pagesConnected",
      messageParams: { count: input.connectedPagesCount },
    });
  }

  if (input.activeFormsCount === 0) {
    checks.push({ id: "forms", status: input.totalPagesCount > 0 ? "warning" : "error", messageKey: "checks.noActiveForms" });
    score -= input.totalPagesCount > 0 ? 15 : 10;
  } else {
    checks.push({
      id: "forms",
      status: "ok",
      messageKey: "checks.formsSynced",
      messageParams: { count: input.activeFormsCount },
    });
  }

  if (!input.webhookVerified) {
    checks.push({ id: "webhook", status: "error", messageKey: "checks.webhookMissing" });
    score -= 20;
  } else {
    checks.push({ id: "webhook", status: "ok", messageKey: "checks.webhookActive" });
  }

  if (input.pagesWithWebhookIssues > 0) {
    checks.push({
      id: "pageWebhooks",
      status: "warning",
      messageKey: "checks.pageWebhookIssues",
      messageParams: { count: input.pagesWithWebhookIssues },
    });
    score -= Math.min(15, input.pagesWithWebhookIssues * 5);
  }

  if (input.formsWithoutLeads > 0) {
    checks.push({
      id: "formsNoLeads",
      status: "warning",
      messageKey: "checks.formsNoLeads",
      messageParams: { count: input.formsWithoutLeads },
    });
    score -= Math.min(10, input.formsWithoutLeads * 5);
  }

  if (input.hasConnectionError) {
    checks.push({ id: "connectionError", status: "warning", messageKey: "checks.connectionError" });
    score -= 10;
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    status: resolveStatus(finalScore),
    checks,
  };
}

export function isTokenExpired(tokenExpiresAt?: Date | string | null): boolean {
  if (!tokenExpiresAt) return false;
  const expires = tokenExpiresAt instanceof Date ? tokenExpiresAt : new Date(tokenExpiresAt);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() <= Date.now();
}

export function tokenExpiresInDays(tokenExpiresAt?: Date | string | null): number | null {
  if (!tokenExpiresAt) return null;
  const expires = tokenExpiresAt instanceof Date ? tokenExpiresAt : new Date(tokenExpiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  return Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
