import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { getMissingScopes } from "@/lib/facebook-diagnosis";
import { buildMetaCenterStatusCards } from "@/lib/meta-center-health";
import { buildWizardSteps } from "@/lib/facebook-diagnosis";
import { getLastOAuthError } from "@/lib/facebook-oauth-status";
import {
  isMetaConfiguredForUser,
  getIntegrationSettingsPublic,
} from "@/services/integration-settings.service";
import { mapFacebookConnectionPublic } from "@/services/facebook.service";
import { getRedis } from "@/lib/redis";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const isAdmin = authResult.session.user.isAdmin === true;

  const [
    connection,
    pages,
    businesses,
    adAccountsCount,
    totalForms,
    enabledForms,
    telegram,
    lastSuccessVerification,
    lastWebhookEvent,
    lastLead,
    failedDeliveries,
    failedWebhooks,
    auditSnapshotsCount,
    integrationSettings,
    lastOAuthError,
  ] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookPage.findMany({ where: { userId } }),
    prisma.facebookBusiness.count({ where: { userId } }),
    prisma.metaAdAccount.count({ where: { userId } }),
    prisma.facebookForm.count({ where: { page: { userId } } }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.webhookVerificationLog.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhookEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findFirst({
      where: { userId },
      orderBy: { createdTime: "desc" },
    }),
    prisma.deliveryLog.count({
      where: {
        userId,
        status: "failed",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.webhookEvent.count({
      where: { userId, status: "failed" },
    }),
    prisma.metaInsightSnapshot.count({ where: { userId } }),
    getIntegrationSettingsPublic(userId),
    getLastOAuthError(userId),
  ]);

  let workerReady = false;
  try {
    const redis = getRedis();
    await redis.ping();
    workerReady = true;
  } catch {
    workerReady = false;
  }

  const connectedPages = pages.filter((p) => p.connected);
  const effectivePagesCount = Math.max(
    connection?.pagesCountAtAuth ?? 0,
    pages.length
  );

  const facebook = connection
    ? mapFacebookConnectionPublic(connection, {
        hasLoginConfigId: integrationSettings.hasMetaLoginConfigId,
        pagesCount: effectivePagesCount,
      })
    : null;

  const grantedScopes = facebook?.grantedScopes ?? [];
  const missingScopes = facebook?.missingScopes ?? getMissingScopes(grantedScopes);

  const wizardSteps = buildWizardSteps({
    hasFacebookProfile: !!facebook?.facebookUserId,
    businessesCount: businesses,
    adAccountsCount,
    connectedPagesCount: connectedPages.length,
    activeFormsCount: enabledForms,
    telegramConnected: telegram?.status === "connected",
    webhookVerified: !!lastSuccessVerification,
    leadsCount: await prisma.lead.count({ where: { userId } }),
    hasAuditRun: auditSnapshotsCount > 0,
  });

  const statusCards = buildMetaCenterStatusCards({
    connected: facebook?.connected ?? false,
    facebookUserName: facebook?.facebookUserName ?? null,
    facebookLastError: lastOAuthError?.safeMessage ?? connection?.lastError ?? null,
    lastCheckedAt: connection?.lastCheckedAt?.toISOString() ?? null,
    grantedScopes,
    missingScopes,
    businessesCount: businesses,
    adAccountsCount,
    totalPages: pages.length,
    connectedPages: connectedPages.length,
    totalForms,
    enabledForms,
    webhookVerified: !!lastSuccessVerification,
    lastWebhookAt: lastWebhookEvent?.createdAt ?? null,
    lastLeadgenId: lastWebhookEvent?.leadgenId ?? null,
    telegramConnected: telegram?.status === "connected",
    telegramLastError: telegram?.lastError ?? null,
    lastTelegramStatus: failedDeliveries > 0 ? "failed" : telegram?.status ?? null,
    workerReady,
    failedJobs: failedWebhooks,
    lastLeadAt: lastLead?.createdTime ?? null,
  });

  const wizardProgress = Object.values(wizardSteps).filter(Boolean).length;
  const wizardTotal = Object.keys(wizardSteps).length;

  return apiSuccess({
    metaConfigured: await isMetaConfiguredForUser(userId),
    isAdmin,
    showAdvancedMetaSettings: integrationSettings.showAdvancedSettings,
    connected: facebook?.connected ?? false,
    facebook,
    wizardSteps,
    wizardProgress,
    wizardTotal,
    statusCards,
    lastOAuthError: lastOAuthError
      ? {
          ...lastOAuthError,
          userCode: lastOAuthError.reason,
        }
      : null,
    counts: {
      businesses,
      adAccounts: adAccountsCount,
      pages: pages.length,
      connectedPages: connectedPages.length,
      forms: totalForms,
      enabledForms,
      leads: await prisma.lead.count({ where: { userId } }),
    },
  });
}
