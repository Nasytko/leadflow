export type WebhookStatusLevel = "ready" | "warning" | "error" | "not_configured";

export type WebhookStatusInput = {
  hasVerifyToken: boolean;
  verified: boolean;
  lastLeadgenAt?: string | null;
  lastError?: string | null;
};

export function resolveWebhookStatus(input: WebhookStatusInput): {
  level: WebhookStatusLevel;
  reasonKey: "ready" | "missing_token" | "not_verified" | "no_events" | "error";
} {
  if (!input.hasVerifyToken) {
    return { level: "not_configured", reasonKey: "missing_token" };
  }
  if (input.lastError) {
    return { level: "error", reasonKey: "error" };
  }
  if (!input.verified) {
    return { level: "warning", reasonKey: "not_verified" };
  }
  if (!input.lastLeadgenAt) {
    return { level: "warning", reasonKey: "no_events" };
  }
  return { level: "ready", reasonKey: "ready" };
}

