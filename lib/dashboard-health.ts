export type HealthLevel = "ok" | "warning" | "error" | "unknown";

export type HealthCard = {
  id: string;
  status: HealthLevel;
  lastCheckedAt: string | null;
  lastError: string | null;
  detail?: string | null;
  href?: string;
};

export function buildDashboardHealthCards(input: {
  facebookStatus: string;
  facebookLastError: string | null;
  facebookUserName: string | null;
  businessesCount: number;
  connectedPages: number;
  totalPages: number;
  activeForms: number;
  totalForms: number;
  failedFormsSync: number;
  webhookVerified: boolean;
  lastWebhookAt: Date | null;
  lastWebhookStatus: string | null;
  lastWebhookError: string | null;
  telegramStatus: string;
  telegramLastError: string | null;
  failedDeliveriesToday: number;
  lastLeadAt: Date | null;
  lastTelegramDeliveryAt: Date | null;
  lastTelegramDeliveryStatus: string | null;
  metaConfigured: boolean;
  queuedWebhooks: number;
}): HealthCard[] {
  const now = new Date().toISOString();

  let facebookLevel: HealthLevel = "unknown";
  let facebookDetail: string | null = null;
  if (input.facebookStatus === "connected" && input.connectedPages > 0) {
    facebookLevel = "ok";
    facebookDetail = input.facebookUserName ?? null;
  } else if (
    input.facebookStatus === "connected" ||
    input.facebookStatus === "pending_pages"
  ) {
    facebookLevel = "warning";
    facebookDetail = "Facebook connected but pages not selected";
  } else if (input.facebookStatus === "disconnected") {
    facebookLevel = "error";
  } else {
    facebookLevel = "warning";
  }

  let businessLevel: HealthLevel = "unknown";
  if (input.businessesCount > 0) {
    businessLevel = "ok";
  } else if (input.facebookStatus === "connected") {
    businessLevel = "warning";
  } else {
    businessLevel = "unknown";
  }

  let pagesLevel: HealthLevel = "unknown";
  if (input.connectedPages > 0) {
    pagesLevel = "ok";
  } else if (input.totalPages > 0) {
    pagesLevel = "warning";
  } else if (input.facebookStatus === "connected") {
    pagesLevel = "error";
  }

  let formsLevel: HealthLevel = "unknown";
  if (input.activeForms > 0 && input.failedFormsSync === 0) {
    formsLevel = "ok";
  } else if (input.activeForms > 0 || input.totalForms > 0) {
    formsLevel = input.failedFormsSync > 0 ? "warning" : "warning";
  } else if (input.connectedPages > 0) {
    formsLevel = "warning";
  }

  let webhookLevel: HealthLevel = "unknown";
  if (input.webhookVerified && input.lastWebhookStatus !== "failed") {
    webhookLevel =
      input.lastWebhookAt &&
      Date.now() - input.lastWebhookAt.getTime() < 7 * 24 * 60 * 60 * 1000
        ? "ok"
        : "warning";
  } else if (input.webhookVerified) {
    webhookLevel = "warning";
  } else if (input.connectedPages > 0) {
    webhookLevel = "error";
  }

  let telegramLevel: HealthLevel = "unknown";
  if (input.telegramStatus === "connected") {
    telegramLevel =
      input.failedDeliveriesToday > 0 ? "warning" : "ok";
  } else if (input.telegramStatus === "error") {
    telegramLevel = "error";
  } else {
    telegramLevel = "unknown";
  }

  let queueLevel: HealthLevel = "unknown";
  if (input.queuedWebhooks > 10) {
    queueLevel = "warning";
  } else if (input.queuedWebhooks > 50) {
    queueLevel = "error";
  } else {
    queueLevel = "ok";
  }

  let lastLeadLevel: HealthLevel = input.lastLeadAt ? "ok" : "unknown";
  if (!input.lastLeadAt && input.activeForms > 0) {
    lastLeadLevel = "warning";
  }

  let lastDeliveryLevel: HealthLevel = "unknown";
  if (input.lastTelegramDeliveryStatus === "sent") {
    lastDeliveryLevel = "ok";
  } else if (input.lastTelegramDeliveryStatus === "failed") {
    lastDeliveryLevel = "error";
  } else if (input.telegramStatus === "connected") {
    lastDeliveryLevel = "warning";
  }

  const securityLevel: HealthLevel = input.metaConfigured ? "ok" : "warning";

  return [
    {
      id: "facebook",
      status: facebookLevel,
      lastCheckedAt: now,
      lastError: input.facebookLastError,
      detail: facebookDetail,
      href: "/facebook",
    },
    {
      id: "business",
      status: businessLevel,
      lastCheckedAt: now,
      lastError: null,
      detail: String(input.businessesCount),
      href: "/facebook",
    },
    {
      id: "pages",
      status: pagesLevel,
      lastCheckedAt: now,
      lastError: null,
      detail: `${input.connectedPages}/${input.totalPages}`,
      href: "/facebook",
    },
    {
      id: "forms",
      status: formsLevel,
      lastCheckedAt: now,
      lastError: input.failedFormsSync > 0 ? `${input.failedFormsSync} sync errors` : null,
      detail: `${input.activeForms}/${input.totalForms}`,
      href: "/forms",
    },
    {
      id: "webhook",
      status: webhookLevel,
      lastCheckedAt: input.lastWebhookAt?.toISOString() ?? null,
      lastError: input.lastWebhookError,
      href: "/facebook",
    },
    {
      id: "telegram",
      status: telegramLevel,
      lastCheckedAt: now,
      lastError: input.telegramLastError,
      href: "/telegram",
    },
    {
      id: "queue",
      status: queueLevel,
      lastCheckedAt: now,
      lastError: input.queuedWebhooks > 0 ? `${input.queuedWebhooks} queued events` : null,
      href: "/logs",
    },
    {
      id: "lastLead",
      status: lastLeadLevel,
      lastCheckedAt: input.lastLeadAt?.toISOString() ?? null,
      lastError: null,
      href: "/leads",
    },
    {
      id: "lastDelivery",
      status: lastDeliveryLevel,
      lastCheckedAt: input.lastTelegramDeliveryAt?.toISOString() ?? null,
      lastError:
        input.lastTelegramDeliveryStatus === "failed"
          ? "Last delivery failed"
          : null,
      href: "/logs",
    },
    {
      id: "security",
      status: securityLevel,
      lastCheckedAt: now,
      lastError: input.metaConfigured ? null : "Meta platform credentials not configured",
      href: "/settings",
    },
  ];
}
