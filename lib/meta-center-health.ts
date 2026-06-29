import type { HealthLevel } from "@/lib/dashboard-health";

export type MetaCenterStatusCard = {
  id: string;
  status: HealthLevel;
  titleKey: string;
  detail: string | null;
  explanationKey: string;
  fixHref: string;
  fixLabelKey: string;
  lastCheckedAt: string | null;
  lastError: string | null;
};

export function buildMetaCenterStatusCards(input: {
  connected: boolean;
  facebookUserName: string | null;
  facebookLastError: string | null;
  lastCheckedAt: string | null;
  grantedScopes: string[];
  missingScopes: string[];
  businessesCount: number;
  adAccountsCount: number;
  totalPages: number;
  connectedPages: number;
  totalForms: number;
  enabledForms: number;
  webhookVerified: boolean;
  lastWebhookAt: Date | null;
  lastLeadgenId: string | null;
  telegramConnected: boolean;
  telegramLastError: string | null;
  lastTelegramStatus: string | null;
  workerReady: boolean;
  failedJobs: number;
  lastLeadAt: Date | null;
}): MetaCenterStatusCard[] {
  const now = new Date().toISOString();

  const oauthStatus: HealthLevel = input.connected
    ? "ok"
    : input.facebookLastError
    ? "error"
    : "unknown";

  const permStatus: HealthLevel =
    input.missingScopes.length === 0 && input.grantedScopes.length > 0
      ? "ok"
      : input.connected
      ? "warning"
      : "unknown";

  const bizStatus: HealthLevel =
    input.businessesCount > 0 ? "ok" : input.connected ? "warning" : "unknown";

  const adStatus: HealthLevel =
    input.adAccountsCount > 0 ? "ok" : input.connected ? "warning" : "unknown";

  const pagesStatus: HealthLevel =
    input.connectedPages > 0
      ? "ok"
      : input.totalPages > 0
      ? "warning"
      : input.connected
      ? "error"
      : "unknown";

  const formsStatus: HealthLevel =
    input.enabledForms > 0
      ? "ok"
      : input.totalForms > 0
      ? "warning"
      : input.connectedPages > 0
      ? "warning"
      : "unknown";

  const webhookStatus: HealthLevel = input.webhookVerified
    ? input.lastWebhookAt
      ? "ok"
      : "warning"
    : input.connectedPages > 0
    ? "error"
    : "unknown";

  const telegramStatus: HealthLevel = input.telegramConnected
    ? input.lastTelegramStatus === "failed"
      ? "warning"
      : "ok"
    : input.enabledForms > 0
    ? "warning"
    : "unknown";

  const workerStatus: HealthLevel = !input.workerReady
    ? "error"
    : input.failedJobs > 0
    ? "warning"
    : "ok";

  return [
    {
      id: "oauth",
      titleKey: "statusCards.oauth.title",
      status: oauthStatus,
      detail: input.facebookUserName,
      explanationKey:
        oauthStatus === "ok"
          ? "statusCards.oauth.ok"
          : oauthStatus === "error"
          ? "statusCards.oauth.error"
          : "statusCards.oauth.unknown",
      fixHref: "/meta/connect",
      fixLabelKey: "statusCards.fixConnect",
      lastCheckedAt: input.lastCheckedAt,
      lastError: input.facebookLastError,
    },
    {
      id: "permissions",
      titleKey: "statusCards.permissions.title",
      status: permStatus,
      detail:
        input.missingScopes.length > 0
          ? input.missingScopes.join(", ")
          : String(input.grantedScopes.length),
      explanationKey:
        permStatus === "ok"
          ? "statusCards.permissions.ok"
          : "statusCards.permissions.warning",
      fixHref: "/meta/connect",
      fixLabelKey: "statusCards.fixPermissions",
      lastCheckedAt: input.lastCheckedAt,
      lastError:
        input.missingScopes.length > 0 ? input.missingScopes.join(", ") : null,
    },
    {
      id: "businesses",
      titleKey: "statusCards.businesses.title",
      status: bizStatus,
      detail: String(input.businessesCount),
      explanationKey:
        bizStatus === "ok"
          ? "statusCards.businesses.ok"
          : "statusCards.businesses.warning",
      fixHref: "/meta/businesses",
      fixLabelKey: "statusCards.fixDetails",
      lastCheckedAt: now,
      lastError: null,
    },
    {
      id: "adAccounts",
      titleKey: "statusCards.adAccounts.title",
      status: adStatus,
      detail: String(input.adAccountsCount),
      explanationKey:
        adStatus === "ok"
          ? "statusCards.adAccounts.ok"
          : "statusCards.adAccounts.warning",
      fixHref: "/meta/ad-accounts",
      fixLabelKey: "statusCards.fixDetails",
      lastCheckedAt: now,
      lastError: null,
    },
    {
      id: "pages",
      titleKey: "statusCards.pages.title",
      status: pagesStatus,
      detail: `${input.connectedPages}/${input.totalPages}`,
      explanationKey:
        pagesStatus === "ok"
          ? "statusCards.pages.ok"
          : pagesStatus === "error"
          ? "statusCards.pages.error"
          : "statusCards.pages.warning",
      fixHref: "/meta/pages",
      fixLabelKey: "statusCards.fixPages",
      lastCheckedAt: now,
      lastError: null,
    },
    {
      id: "forms",
      titleKey: "statusCards.forms.title",
      status: formsStatus,
      detail: `${input.enabledForms}/${input.totalForms}`,
      explanationKey:
        formsStatus === "ok"
          ? "statusCards.forms.ok"
          : "statusCards.forms.warning",
      fixHref: "/meta/forms",
      fixLabelKey: "statusCards.fixForms",
      lastCheckedAt: now,
      lastError: null,
    },
    {
      id: "webhook",
      titleKey: "statusCards.webhook.title",
      status: webhookStatus,
      detail: input.lastLeadgenId,
      explanationKey:
        webhookStatus === "ok"
          ? "statusCards.webhook.ok"
          : webhookStatus === "error"
          ? "statusCards.webhook.error"
          : "statusCards.webhook.warning",
      fixHref: "/meta/webhook",
      fixLabelKey: "statusCards.fixWebhook",
      lastCheckedAt: input.lastWebhookAt?.toISOString() ?? null,
      lastError: null,
    },
    {
      id: "telegram",
      titleKey: "statusCards.telegram.title",
      status: telegramStatus,
      detail: input.lastTelegramStatus,
      explanationKey:
        telegramStatus === "ok"
          ? "statusCards.telegram.ok"
          : "statusCards.telegram.warning",
      fixHref: "/meta/telegram",
      fixLabelKey: "statusCards.fixTelegram",
      lastCheckedAt: now,
      lastError: input.telegramLastError,
    },
    {
      id: "worker",
      titleKey: "statusCards.worker.title",
      status: workerStatus,
      detail: input.lastLeadAt?.toISOString() ?? null,
      explanationKey:
        workerStatus === "ok"
          ? "statusCards.worker.ok"
          : workerStatus === "error"
          ? "statusCards.worker.error"
          : "statusCards.worker.warning",
      fixHref: "/meta/health",
      fixLabelKey: "statusCards.fixDiagnostics",
      lastCheckedAt: now,
      lastError:
        input.failedJobs > 0 ? String(input.failedJobs) : null,
    },
  ];
}
