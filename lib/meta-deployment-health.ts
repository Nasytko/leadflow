import { getAppUrl, getRedirectUri, getWebhookUrl } from "@/lib/env";
import { getPlatformLoginConfigStatus } from "@/services/integration-settings.service";
import type { MetaHealthCheck } from "@/lib/meta-health-types";
import type { HealthLevel } from "@/lib/dashboard-health";

function check(
  id: string,
  ok: boolean,
  warn = false
): { status: HealthLevel; check: Omit<MetaHealthCheck, "lastCheckedAt"> & { lastCheckedAt?: string } } {
  const status: HealthLevel = ok ? "ok" : warn ? "warning" : "error";
  return {
    status,
    check: {
      id,
      status,
      titleKey: `health.deployment.${id}.title`,
      meaningKey: `health.deployment.${id}.meaning`,
      actionKey: ok ? `health.deployment.${id}.ok` : `health.deployment.${id}.action`,
      critical: !ok && !warn,
    },
  };
}

export function runDeploymentHealthChecks(): {
  status: HealthLevel;
  checks: MetaHealthCheck[];
} {
  const now = new Date().toISOString();
  const platformConfig = getPlatformLoginConfigStatus();

  let nextAuthOk = false;
  let nextAuthUrl = "";
  try {
    nextAuthUrl = getAppUrl();
    nextAuthOk = !!nextAuthUrl && !nextAuthUrl.includes("localhost");
  } catch {
    nextAuthOk = false;
  }

  const redirectUri = getRedirectUri();
  const webhookUrl = getWebhookUrl();

  const items = [
    check("nextAuthUrl", !!process.env.NEXTAUTH_URL?.trim() || nextAuthOk, !process.env.NEXTAUTH_URL?.trim()),
    check("redirectUri", !!redirectUri),
    check("metaAppId", !!(process.env.META_APP_ID?.trim())),
    check("metaAppSecret", !!(process.env.META_APP_SECRET?.trim())),
    check(
      "metaLoginConfigId",
      platformConfig.configIdPresent && platformConfig.configIdValid,
      platformConfig.configIdPresent && !platformConfig.configIdValid
    ),
    check("metaWebhookVerifyToken", !!(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim())),
  ];

  const checks: MetaHealthCheck[] = items.map(({ check: c }) => ({
    ...c,
    detail:
      c.id === "nextAuthUrl"
        ? nextAuthUrl || null
        : c.id === "redirectUri"
        ? redirectUri
        : c.id === "metaLoginConfigId"
        ? platformConfig.configId
        : null,
    lastCheckedAt: now,
  }));

  let status: HealthLevel = "ok";
  for (const item of items) {
    if (item.status === "error") status = "error";
    else if (item.status === "warning" && status !== "error") status = "warning";
  }

  return { status, checks };
}

export function getDeploymentUrls() {
  return {
    nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
    redirectUri: getRedirectUri(),
    webhookUrl: getWebhookUrl(),
  };
}
