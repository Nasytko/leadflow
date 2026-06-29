import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { getMissingScopes } from "@/lib/facebook-diagnosis";
import { getLastOAuthError } from "@/lib/facebook-oauth-status";
import { runDeploymentHealthChecks, getDeploymentUrls } from "@/lib/meta-deployment-health";
import {
  isMetaConfiguredForUser,
  getIntegrationSettingsPublic,
  getAdminPlatformMetaStatus,
} from "@/services/integration-settings.service";
import { buildOAuthUrlPreview, FB_OAUTH_SCOPES } from "@/services/facebook-auth.service";
import { getDecryptedUserToken } from "@/services/facebook.service";
import { getRedirectUri } from "@/lib/env";
import { showAdvancedMetaSettings } from "@/lib/deployment";
import { META_GRAPH_API_BASE } from "@/lib/facebook-graph-config";
import type {
  MetaHealthCheck,
  MetaHealthSection,
  MetaHealthReport,
  MetaOverallStatus,
  MetaHealthAction,
} from "@/lib/meta-health-types";
import type { HealthLevel } from "@/lib/dashboard-health";

const SCOPE_KEYS = FB_OAUTH_SCOPES as readonly string[];

function nowIso() {
  return new Date().toISOString();
}

function sectionStatus(checks: MetaHealthCheck[]): HealthLevel {
  if (checks.some((c) => c.status === "error")) return "error";
  if (checks.some((c) => c.status === "warning")) return "warning";
  if (checks.every((c) => c.status === "unknown")) return "unknown";
  return "ok";
}

function mkCheck(
  id: string,
  ok: boolean | HealthLevel,
  prefix: string,
  detail?: string | null,
  fix?: { href: string; labelKey: string },
  critical = false,
  warnIfFalse = false
): MetaHealthCheck {
  let status: HealthLevel;
  if (typeof ok === "string") {
    status = ok;
  } else {
    status = ok ? "ok" : warnIfFalse ? "warning" : "error";
  }
  return {
    id,
    status,
    titleKey: `${prefix}.${id}.title`,
    meaningKey: `${prefix}.${id}.meaning`,
    actionKey:
      status === "ok"
        ? `${prefix}.${id}.ok`
        : status === "warning"
        ? `${prefix}.${id}.warning`
        : `${prefix}.${id}.action`,
    detail: detail ?? null,
    lastCheckedAt: nowIso(),
    fixHref: fix?.href,
    fixLabelKey: fix?.labelKey,
    critical,
  };
}

async function fetchGraph(
  path: string,
  token: string,
  live: boolean
): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!live) return { ok: false, status: 0, body: { skipped: true } };
  try {
    const res = await fetch(`${META_GRAPH_API_BASE}${path}&access_token=${token}`);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e instanceof Error ? e.message : "failed" } };
  }
}

function computeOverall(sections: MetaHealthSection[], deploymentStatus: HealthLevel): MetaOverallStatus {
  const checks = sections.flatMap((s) => s.checks);
  if (
    deploymentStatus === "error" ||
    checks.some((c) => c.status === "error" && c.critical)
  ) {
    return "critical";
  }
  if (checks.some((c) => c.status === "error") || deploymentStatus === "warning") {
    return "needs_attention";
  }
  if (checks.some((c) => c.status === "warning")) {
    return "needs_attention";
  }
  return "healthy";
}

export async function runMetaHealthReport(
  userId: string,
  options: { isAdmin: boolean; liveTest?: boolean } = { isAdmin: false, liveTest: false }
): Promise<MetaHealthReport> {
  const start = Date.now();
  const live = options.liveTest === true;
  const showAdmin = options.isAdmin || showAdvancedMetaSettings();
  const deployment = runDeploymentHealthChecks();

  const [
    connection,
    businesses,
    pages,
    forms,
    adAccounts,
    campaignsCount,
    lastCampaignSync,
    telegram,
    lastVerification,
    lastWebhook,
    failedWebhooks,
    lastLead,
    lastDelivery,
    lastPageSync,
    lastPageError,
    lastFormSync,
    integrationSettings,
    lastOAuthError,
    lastOAuthSuccess,
    oauthPreview,
    credStatus,
    recentLogs,
  ] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookBusiness.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.facebookPage.findMany({ where: { userId } }),
    prisma.facebookForm.findMany({ where: { page: { userId } } }),
    prisma.metaAdAccount.findMany({ where: { userId }, include: { _count: { select: { campaigns: true } } } }),
    prisma.metaCampaign.count({ where: { userId } }),
    prisma.metaCampaign.findFirst({ where: { userId }, orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.webhookVerificationLog.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhookEvent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEvent.count({ where: { userId, status: "failed" } }),
    prisma.lead.findFirst({ where: { userId }, orderBy: { createdTime: "desc" } }),
    prisma.deliveryLog.findFirst({ where: { userId, type: "telegram" }, orderBy: { createdAt: "desc" } }),
    prisma.facebookPage.findFirst({
      where: { userId },
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    }),
    prisma.facebookPage.findFirst({
      where: { userId, lastError: { not: null } },
      orderBy: { lastErrorAt: "desc" },
      select: { lastError: true, pageName: true },
    }),
    prisma.facebookForm.findFirst({
      where: { page: { userId } },
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
    getIntegrationSettingsPublic(userId),
    getLastOAuthError(userId),
    prisma.systemLog.findFirst({
      where: { userId, source: "facebook", action: "facebook.oauth.connection_saved" },
      orderBy: { createdAt: "desc" },
    }),
    buildOAuthUrlPreview(userId),
    getAdminPlatformMetaStatus(userId),
    showAdmin
      ? prisma.systemLog.findMany({
          where: { userId, source: "facebook" },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: { id: true, level: true, action: true, message: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  let redisOk = false;
  try {
    await getRedis().ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  const metaConfigured = await isMetaConfiguredForUser(userId);
  const grantedScopes = Array.isArray(connection?.grantedScopes)
    ? (connection.grantedScopes as string[])
    : [];
  const missingScopes = getMissingScopes(grantedScopes);
  const connectedPages = pages.filter((p) => p.connected);
  const enabledForms = forms.filter((f) => f.enabled);
  const activeForms = forms.filter((f) => f.status === "active" || f.status === "ACTIVE");

  const primaryBusiness =
    businesses.find((b) => b.businessId === connection?.primaryBusinessId) ?? businesses[0] ?? null;
  const primaryAdAccount = adAccounts[0] ?? null;

  const token = await getDecryptedUserToken(userId);
  const graphResponses: Record<string, unknown> = {};

  const graphChecks: MetaHealthCheck[] = [];
  if (!token) {
    graphChecks.push(
      mkCheck("me", "unknown", "health.api", "Not connected", { href: "/meta/connect", labelKey: "health.actions.connect" })
    );
    for (const ep of ["accounts", "businesses", "adaccounts"]) {
      graphChecks.push(mkCheck(ep, "unknown", "health.api"));
    }
  } else if (live) {
    for (const [id, path] of [
      ["me", "/me?fields=id,name"],
      ["accounts", "/me/accounts?limit=3&fields=id,name"],
      ["businesses", "/me/businesses?limit=3&fields=id,name"],
      ["adaccounts", "/me/adaccounts?limit=3&fields=id,name,account_status"],
    ] as const) {
      const result = await fetchGraph(path, token, true);
      if (showAdmin) graphResponses[id] = result.body;
      graphChecks.push(
        mkCheck(
          id,
          result.ok ? "ok" : "error",
          "health.api",
          result.ok ? String((result.body as { name?: string })?.name ?? id) : `HTTP ${result.status}`,
          result.ok ? undefined : { href: "/meta/connect", labelKey: "health.actions.reconnect" }
        )
      );
    }
  } else {
    const hasConnection = !!connection?.facebookUserId;
    for (const id of ["me", "accounts", "businesses", "adaccounts"]) {
      graphChecks.push(
        mkCheck(
          id,
          hasConnection ? "ok" : "unknown",
          "health.api",
          hasConnection ? connection?.facebookUserName ?? null : null
        )
      );
    }
  }

  const platformConfig = {
    configId: credStatus.metaLoginConfigId,
    configIdPresent: !!credStatus.metaLoginConfigId,
    configIdValid: credStatus.metaLoginConfigIdValid,
    source: credStatus.metaLoginConfigIdSource,
  };

  const oauthChecks: MetaHealthCheck[] = [
    mkCheck(
      "metaApp",
      metaConfigured,
      "health.oauth",
      showAdmin
        ? `${credStatus.metaAppId} (${credStatus.metaAppIdSource})`
        : metaConfigured
        ? "configured"
        : null,
      !metaConfigured ? { href: "/admin/platform", labelKey: "health.actions.adminSettings" } : undefined,
      !metaConfigured
    ),
    mkCheck(
      "appSecret",
      !!credStatus.metaAppSecretConfigured,
      "health.oauth",
      showAdmin
        ? `source: ${credStatus.metaAppSecretSource}${credStatus.metaAppSecretDbIgnoredInSaas ? " · DB ignored" : ""}`
        : credStatus.metaAppSecretConfigured
        ? "configured"
        : "missing",
      undefined,
      !credStatus.metaAppSecretConfigured
    ),
    mkCheck(
      "loginConfig",
      credStatus.metaLoginConfigIdValid,
      "health.oauth",
      showAdmin
        ? `${credStatus.metaLoginConfigId ?? "—"} (${credStatus.metaLoginConfigIdSource})${
            credStatus.metaLoginConfigIdIgnoredLegacy
              ? ` · legacy ignored: ${credStatus.metaLoginConfigIdIgnoredLegacy}`
              : ""
          }`
        : credStatus.metaLoginConfigIdValid
        ? "valid"
        : "invalid",
      { href: "/admin/platform", labelKey: "health.actions.adminSettings" },
      !credStatus.metaLoginConfigIdValid
    ),
    mkCheck("redirectUri", !!getRedirectUri(), "health.oauth", showAdmin ? getRedirectUri() : null),
    mkCheck(
      "oauthUrl",
      !!oauthPreview?.oauthUrl,
      "health.oauth",
      null,
      !oauthPreview?.oauthUrl ? { href: "/meta/connect", labelKey: "health.actions.connect" } : undefined
    ),
    mkCheck(
      "callback",
      true,
      "health.oauth",
      showAdmin ? `${getRedirectUri()} (route active)` : null
    ),
    mkCheck(
      "lastSuccess",
      !!lastOAuthSuccess || !!connection?.connectedAt,
      "health.oauth",
      lastOAuthSuccess?.createdAt.toISOString() ?? connection?.connectedAt?.toISOString() ?? null
    ),
    mkCheck(
      "lastError",
      !lastOAuthError,
      "health.oauth",
      lastOAuthError
        ? showAdmin
          ? `${lastOAuthError.reason}: ${lastOAuthError.safeMessage}`
          : lastOAuthError.reason
        : null,
      lastOAuthError ? { href: "/meta/connect", labelKey: "health.actions.reconnect" } : undefined,
      !!lastOAuthError
    ),
  ];

  if (credStatus.legacyDbOverridesInSaas) {
    oauthChecks.push(
      mkCheck(
        "legacyDbOverride",
        false,
        "health.oauth",
        "Legacy DB secret/config ignored — use env or run cleanup",
        { href: "/admin/platform", labelKey: "health.actions.adminSettings" },
        false,
        true
      )
    );
  }

  const permissionChecks: MetaHealthCheck[] = SCOPE_KEYS.map((scope) => {
    const granted = grantedScopes.map((s) => s.toLowerCase()).includes(scope.toLowerCase());
    return mkCheck(
      scope,
      !connection ? "unknown" : granted ? "ok" : "warning",
      "health.permissions",
      granted ? "granted" : "missing",
      !granted ? { href: "/meta/connect", labelKey: "health.actions.reconnect" } : undefined,
      scope === "leads_retrieval" || scope === "pages_show_list"
    );
  });

  const businessChecks: MetaHealthCheck[] = [
    mkCheck(
      "count",
      businesses.length > 0,
      "health.business",
      String(businesses.length),
      businesses.length === 0 ? { href: "/meta/businesses", labelKey: "health.actions.syncBusinesses" } : undefined
    ),
    mkCheck(
      "primary",
      !!primaryBusiness,
      "health.business",
      primaryBusiness ? `${primaryBusiness.name} (${primaryBusiness.verificationStatus ?? "—"})` : null
    ),
  ];

  const pagesChecks: MetaHealthCheck[] = [
    mkCheck("count", pages.length > 0, "health.pages", String(pages.length), { href: "/meta/pages", labelKey: "health.actions.syncPages" }),
    mkCheck("connected", connectedPages.length > 0, "health.pages", `${connectedPages.length}/${pages.length}`, { href: "/meta/pages", labelKey: "health.actions.connectPages" }),
    mkCheck("lastSync", !!lastPageSync?.lastSyncedAt, "health.pages", lastPageSync?.lastSyncedAt?.toISOString() ?? null),
    mkCheck("lastError", !lastPageError?.lastError, "health.pages", lastPageError ? `${lastPageError.pageName}: ${lastPageError.lastError}` : null, { href: "/meta/pages", labelKey: "health.actions.syncPages" }),
  ];

  const formsChecks: MetaHealthCheck[] = [
    mkCheck("count", forms.length > 0, "health.forms", String(forms.length), { href: "/meta/forms", labelKey: "health.actions.syncForms" }),
    mkCheck("active", activeForms.length > 0, "health.forms", String(activeForms.length)),
    mkCheck("enabled", enabledForms.length > 0, "health.forms", `${enabledForms.length}/${forms.length}`, { href: "/meta/forms", labelKey: "health.actions.enableForms" }),
    mkCheck("lastSync", !!lastFormSync?.lastSyncAt, "health.forms", lastFormSync?.lastSyncAt?.toISOString() ?? null),
    mkCheck("lastLead", !!lastLead, "health.forms", lastLead?.createdTime?.toISOString() ?? null),
  ];

  const adAccountChecks: MetaHealthCheck[] = [
    mkCheck("count", adAccounts.length > 0, "health.adAccounts", String(adAccounts.length), { href: "/meta/ad-accounts", labelKey: "health.actions.syncAdAccounts" }),
    mkCheck(
      "primary",
      !!primaryAdAccount,
      "health.adAccounts",
      primaryAdAccount
        ? `${primaryAdAccount.name} · ${primaryAdAccount.currency ?? "—"} · ${primaryAdAccount.timezoneName ?? "—"}`
        : null
    ),
    mkCheck(
      "campaigns",
      campaignsCount > 0,
      "health.adAccounts",
      String(campaignsCount),
      { href: "/meta/ad-accounts", labelKey: "health.actions.syncCampaigns" }
    ),
  ];

  const campaignChecks: MetaHealthCheck[] = [
    mkCheck("count", campaignsCount > 0, "health.campaigns", String(campaignsCount)),
    mkCheck("lastSync", !!lastCampaignSync?.lastSyncedAt, "health.campaigns", lastCampaignSync?.lastSyncedAt?.toISOString() ?? null, { href: "/meta/ad-accounts", labelKey: "health.actions.syncCampaigns" }),
  ];

  const webhookChecks: MetaHealthCheck[] = [
    mkCheck("verified", !!lastVerification, "health.webhook", lastVerification?.createdAt.toISOString() ?? null, { href: "/meta/webhook", labelKey: "health.actions.checkWebhook" }, !lastVerification && connectedPages.length > 0),
    mkCheck("verifyToken", integrationSettings.hasWebhookToken || !!(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()), "health.webhook", null, { href: "/admin/platform", labelKey: "health.actions.adminSettings" }),
    mkCheck("signature", process.env.META_WEBHOOK_SIGNATURE_REQUIRED !== "false", "health.webhook", "enabled"),
    mkCheck("lastEvent", !!lastWebhook, "health.webhook", lastWebhook?.createdAt.toISOString() ?? null),
    mkCheck("lastLeadgen", !!lastWebhook?.leadgenId, "health.webhook", lastWebhook?.leadgenId ?? null),
    mkCheck("errors", failedWebhooks === 0, "health.webhook", String(failedWebhooks), failedWebhooks > 0 ? { href: "/meta/webhook", labelKey: "health.actions.checkWebhook" } : undefined, failedWebhooks > 5),
  ];

  const workerChecks: MetaHealthCheck[] = [
    mkCheck("redis", redisOk, "health.worker", null, undefined, !redisOk),
    mkCheck("queue", redisOk, "health.worker", redisOk ? "ready" : "unavailable", undefined, !redisOk),
    mkCheck("lastJob", !!lastLead, "health.worker", lastLead?.createdTime?.toISOString() ?? null),
    mkCheck("errors", failedWebhooks === 0, "health.worker", String(failedWebhooks)),
  ];

  const telegramChecks: MetaHealthCheck[] = [
    mkCheck(
      "connected",
      telegram?.status === "connected",
      "health.telegram",
      telegram?.status ?? "disconnected",
      { href: "/meta/telegram", labelKey: "health.actions.connectTelegram" },
      enabledForms.length > 0 && telegram?.status !== "connected"
    ),
    mkCheck("lastMessage", lastDelivery?.status === "success", "health.telegram", lastDelivery?.createdAt.toISOString() ?? null),
    mkCheck("lastError", !telegram?.lastError, "health.telegram", telegram?.lastError ?? null, { href: "/meta/telegram", labelKey: "health.actions.testTelegram" }),
  ];

  const sections: MetaHealthSection[] = [
    { id: "oauth", titleKey: "health.sections.oauth", status: sectionStatus(oauthChecks), checks: oauthChecks },
    { id: "permissions", titleKey: "health.sections.permissions", status: sectionStatus(permissionChecks), checks: permissionChecks, summary: missingScopes.length ? missingScopes.join(", ") : null },
    { id: "api", titleKey: "health.sections.api", status: sectionStatus(graphChecks), checks: graphChecks },
    { id: "business", titleKey: "health.sections.business", status: sectionStatus(businessChecks), checks: businessChecks },
    { id: "pages", titleKey: "health.sections.pages", status: sectionStatus(pagesChecks), checks: pagesChecks },
    { id: "forms", titleKey: "health.sections.forms", status: sectionStatus(formsChecks), checks: formsChecks },
    { id: "adAccounts", titleKey: "health.sections.adAccounts", status: sectionStatus(adAccountChecks), checks: adAccountChecks },
    { id: "campaigns", titleKey: "health.sections.campaigns", status: sectionStatus(campaignChecks), checks: campaignChecks },
    { id: "webhook", titleKey: "health.sections.webhook", status: sectionStatus(webhookChecks), checks: webhookChecks },
    { id: "worker", titleKey: "health.sections.worker", status: sectionStatus(workerChecks), checks: workerChecks },
    { id: "telegram", titleKey: "health.sections.telegram", status: sectionStatus(telegramChecks), checks: telegramChecks },
  ];

  const overallStatus = computeOverall(sections, showAdmin ? deployment.status : "ok");
  const overallTitleKey =
    overallStatus === "healthy"
      ? "health.overall.healthy"
      : overallStatus === "needs_attention"
      ? "health.overall.needsAttention"
      : "health.overall.critical";
  const overallDescriptionKey = `health.overall.${overallStatus}Desc`;

  const actions: MetaHealthAction[] = [
    { id: "connect", labelKey: "health.actions.connect", href: "/meta/connect" },
    { id: "reconnect", labelKey: "health.actions.reconnect", apiAction: "reconnect" },
    { id: "syncPages", labelKey: "health.actions.syncPages", apiAction: "sync_pages" },
    { id: "syncForms", labelKey: "health.actions.syncForms", apiAction: "sync_forms" },
    { id: "syncAdAccounts", labelKey: "health.actions.syncAdAccounts", apiAction: "sync_ad_accounts" },
    { id: "checkWebhook", labelKey: "health.actions.checkWebhook", href: "/meta/webhook" },
    { id: "testLead", labelKey: "health.actions.testLead", href: "/meta/webhook" },
    { id: "testTelegram", labelKey: "health.actions.testTelegram", apiAction: "test_telegram" },
    { id: "rerun", labelKey: "health.actions.rerun", apiAction: "full_test", variant: "default" },
  ];

  const urls = getDeploymentUrls();

  return {
    overallStatus,
    overallTitleKey,
    overallDescriptionKey,
    checkedAt: nowIso(),
    isAdmin: options.isAdmin,
    showAdminDetails: showAdmin,
    sections,
    actions,
    deployment: showAdmin ? deployment : { status: "ok" as HealthLevel, checks: [] },
    admin: showAdmin
      ? {
          appId: process.env.META_APP_ID ?? integrationSettings.metaAppId ?? null,
          loginConfigId: platformConfig.configId,
          webhookVerifyTokenConfigured: !!(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()),
          oauthUrl: oauthPreview?.oauthUrl ?? null,
          redirectUri: urls.redirectUri,
          webhookUrl: urls.webhookUrl,
          recentSystemLogs: recentLogs.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
          graphResponses: live ? graphResponses : undefined,
        }
      : null,
    selfTestDurationMs: Date.now() - start,
  };
}
