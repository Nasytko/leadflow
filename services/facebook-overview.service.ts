import { prisma } from "@/lib/prisma";
import {
  mapFacebookBusinessPublic,
  mapFacebookConnectionPublic,
  mapFacebookPagePublic,
} from "@/services/facebook.service";
import { mapMetaAdAccountPublic } from "@/services/meta-ads.service";
import {
  computeFacebookHealth,
  isTokenExpired,
  tokenExpiresInDays,
} from "@/lib/connections/facebook-health";
import { resolveMetaConnectionStatus, resolveTokenStatus } from "@/lib/meta/meta-connection-status";
import { getIntegrationSettingsPublic, isMetaConfiguredForUser } from "@/services/integration-settings.service";
import { resolveFacebookSetupState } from "@/lib/connections/facebook-setup-state";

export type FacebookActivityItem = {
  id: string;
  at: string;
  kind: "sync" | "refresh" | "lead" | "connect" | "error" | "other";
  messageKey: string;
  messageParams?: Record<string, string | number>;
};

function mapAuditAction(action: string): { kind: FacebookActivityItem["kind"]; messageKey: string } {
  if (action === "facebook.refresh") {
    return { kind: "refresh", messageKey: "activity.tokenRefreshed" };
  }
  if (action === "facebook.connect") {
    return { kind: "connect", messageKey: "activity.connected" };
  }
  return { kind: "other", messageKey: "activity.generic" };
}

function mapSystemAction(action: string): { kind: FacebookActivityItem["kind"]; messageKey: string } {
  if (action.includes("sync")) {
    return { kind: "sync", messageKey: "activity.pageSynced" };
  }
  if (action.includes("error") || action.includes("failed")) {
    return { kind: "error", messageKey: "activity.error" };
  }
  return { kind: "other", messageKey: "activity.generic" };
}

function businessHealth(input: {
  pagesCount: number;
  activeFormsCount: number;
  adAccountsCount: number;
}): "ready" | "warning" | "empty" {
  if (input.pagesCount === 0) return "empty";
  if (input.activeFormsCount === 0) return "warning";
  return "ready";
}

export async function getFacebookOverview(userId: string) {
  const metaConfigured = await isMetaConfiguredForUser(userId);

  const [
    connection,
    pages,
    businesses,
    forms,
    adAccounts,
    campaignCounts,
    integrationSettings,
    lastSuccessVerification,
    auditLogs,
    systemLogs,
    lastLead,
  ] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookPage.findMany({
      where: { userId },
      include: {
        business: true,
        forms: {
          select: {
            id: true,
            enabled: true,
            leadCount: true,
            lastLeadAt: true,
            status: true,
          },
        },
      },
      orderBy: { pageName: "asc" },
    }),
    prisma.facebookBusiness.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.facebookForm.findMany({
      where: { page: { userId } },
      include: {
        page: { select: { pageName: true, pageId: true, connected: true, webhookStatus: true } },
      },
      orderBy: [{ metaCreatedAt: "desc" }, { formName: "asc" }],
    }),
    prisma.metaAdAccount.findMany({
      where: { userId },
      include: { business: { select: { name: true, businessId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.metaCampaign.groupBy({
      by: ["adAccountDbId"],
      where: { userId },
      _count: { id: true },
      _max: { updatedTime: true, lastSyncedAt: true },
    }),
    getIntegrationSettingsPublic(userId),
    prisma.webhookVerificationLog.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { userId, action: { startsWith: "facebook" } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.systemLog.findMany({
      where: { userId, source: { in: ["facebook", "webhook"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.lead.findFirst({
      where: { userId },
      orderBy: { createdTime: "desc" },
      select: { id: true, createdTime: true, name: true },
    }),
  ]);

  const connectedPages = pages.filter((p) => p.connected);
  const activeForms = forms.filter((f) => f.enabled && f.page.connected);
  const activeFormsCount = activeForms.length;
  const webhookVerified = !!lastSuccessVerification;

  const facebook = connection
    ? mapFacebookConnectionPublic(connection, {
        hasLoginConfigId: integrationSettings.hasMetaLoginConfigId,
        pagesCount: pages.length,
        connectedPagesCount: connectedPages.length,
        activeFormsCount,
      })
    : null;

  const connected = !!facebook?.connected;
  const tokenExpired = connection ? isTokenExpired(connection.tokenExpiresAt) : false;
  const tokenInvalid = !!facebook?.tokenInvalid || connection?.status === "invalid";
  const formsWithoutLeads = activeForms.filter((f) => (f.leadCount ?? 0) === 0).length;
  const pagesWithWebhookIssues = connectedPages.filter(
    (p) => p.webhookStatus !== "success"
  ).length;

  const health = computeFacebookHealth({
    connected,
    tokenInvalid,
    tokenExpired,
    connectedPagesCount: connectedPages.length,
    totalPagesCount: pages.length,
    activeFormsCount,
    webhookVerified,
    formsWithoutLeads,
    pagesWithWebhookIssues,
    hasConnectionError: !!connection?.lastError,
  });

  const connectionStatus = resolveMetaConnectionStatus({
    hasConnection: connected,
    connectionStatus: connection?.status,
    uiStatus: facebook?.uiStatus,
    tokenInvalid,
    tokenExpiresAt: connection?.tokenExpiresAt,
  });

  const tokenStatus = resolveTokenStatus({
    tokenExpiresAt: connection?.tokenExpiresAt,
    tokenInvalid,
  });

  const campaignByAccount = new Map(
    campaignCounts.map((row) => [
      row.adAccountDbId,
      {
        campaignCount: row._count.id,
        lastActivityAt: row._max.updatedTime ?? row._max.lastSyncedAt ?? null,
      },
    ])
  );

  const adAccountsByBusiness = new Map<string, number>();
  for (const account of adAccounts) {
    if (account.businessDbId) {
      adAccountsByBusiness.set(
        account.businessDbId,
        (adAccountsByBusiness.get(account.businessDbId) ?? 0) + 1
      );
    }
  }

  const primaryBusinessId = connection?.primaryBusinessId ?? null;

  const businessesPublic = businesses.map((business) => {
    const businessPages = pages.filter((p) => p.businessId === business.id);
    const businessForms = businessPages.flatMap((p) => p.forms);
    const activeBusinessForms = businessForms.filter((f) => f.enabled).length;
    const adAccountsCount = adAccountsByBusiness.get(business.id) ?? 0;
    return {
      ...mapFacebookBusinessPublic(business, {
        pagesCount: businessPages.length,
        formsCount: businessForms.length,
      }),
      activeFormsCount: activeBusinessForms,
      adAccountsCount,
      connectedPagesCount: businessPages.filter((p) => p.connected).length,
      isPrimary: business.businessId === primaryBusinessId,
      health: businessHealth({
        pagesCount: businessPages.length,
        activeFormsCount: activeBusinessForms,
        adAccountsCount,
      }),
    };
  });

  const setupState = resolveFacebookSetupState({
    connected,
    businessesCount: businesses.length,
    connectedPagesCount: connectedPages.length,
    totalPagesCount: pages.length,
    activeFormsCount,
    webhookVerified,
    hasConnectionError: !!connection?.lastError,
    pagesAccessMissing: facebook?.pagesAccessMissing,
  });

  const activity: FacebookActivityItem[] = [];

  for (const log of auditLogs) {
    const mapped = mapAuditAction(log.action);
    activity.push({
      id: `audit-${log.id}`,
      at: log.createdAt.toISOString(),
      kind: mapped.kind,
      messageKey: mapped.messageKey,
    });
  }

  for (const log of systemLogs) {
    const mapped = mapSystemAction(log.action);
    activity.push({
      id: `sys-${log.id}`,
      at: log.createdAt.toISOString(),
      kind: mapped.kind,
      messageKey: mapped.messageKey,
      messageParams: log.message ? { detail: log.message.slice(0, 80) } : undefined,
    });
  }

  if (lastLead?.createdTime) {
    activity.push({
      id: `lead-${lastLead.id}`,
      at: lastLead.createdTime.toISOString(),
      kind: "lead",
      messageKey: lastLead.name ? "activity.newLeadNamed" : "activity.newLead",
      messageParams: lastLead.name ? { name: lastLead.name } : undefined,
    });
  }

  if (connection?.lastCheckedAt) {
    activity.push({
      id: "last-checked",
      at: connection.lastCheckedAt.toISOString(),
      kind: "refresh",
      messageKey: "activity.lastChecked",
    });
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const lastPageSync = pages.reduce<Date | null>((latest, page) => {
    if (!page.lastSyncedAt) return latest;
    if (!latest || page.lastSyncedAt > latest) return page.lastSyncedAt;
    return latest;
  }, null);

  return {
    metaConfigured,
    connected,
    setupComplete: setupState.isComplete,
    setupStep: setupState.currentStep,
    primaryBusinessId,
    connection: facebook && connection
      ? {
          ...facebook,
          permissionsCount: facebook.grantedScopes?.length ?? 0,
          connectionStatus: connectionStatus.status,
          connectionStatusSeverity: connectionStatus.severity,
          tokenStatus: tokenStatus.status,
          tokenStatusSeverity: tokenStatus.severity,
          tokenExpiresInDays: tokenExpiresInDays(connection.tokenExpiresAt),
          lastSyncAt: lastPageSync?.toISOString() ?? null,
        }
      : null,
    health,
    businesses: businessesPublic,
    pages: pages.map(mapFacebookPagePublic),
    forms: forms.map((f) => ({
      id: f.id,
      formId: f.formId,
      formName: f.formName,
      enabled: f.enabled,
      status: f.status,
      syncStatus: f.syncStatus,
      metaCreatedAt: f.metaCreatedAt?.toISOString() ?? null,
      leadCount: f.leadCount,
      lastLeadAt: f.lastLeadAt?.toISOString() ?? null,
      pageName: f.page.pageName,
      pageId: f.page.pageId,
      pageConnected: f.page.connected,
      pageWebhookStatus: f.page.webhookStatus,
      warnings: [
        ...(f.enabled && f.leadCount === 0 ? (["noLeads"] as const) : []),
        ...(f.enabled && f.page.connected && f.page.webhookStatus !== "success"
          ? (["webhookNotSubscribed"] as const)
          : []),
      ],
    })),
    adAccounts: adAccounts.map((account) => {
      const stats = campaignByAccount.get(account.id);
      return {
        ...mapMetaAdAccountPublic(account),
        campaignCount: stats?.campaignCount ?? 0,
        lastActivityAt:
          stats?.lastActivityAt?.toISOString() ??
          account.lastSyncedAt?.toISOString() ??
          null,
      };
    }),
    counts: {
      businesses: businesses.length,
      pages: pages.length,
      connectedPages: connectedPages.length,
      forms: forms.length,
      activeForms: activeFormsCount,
      adAccounts: adAccounts.length,
    },
    webhookVerified,
    activity: activity.slice(0, 12),
  };
}

export type FacebookOverviewData = Awaited<ReturnType<typeof getFacebookOverview>>;
