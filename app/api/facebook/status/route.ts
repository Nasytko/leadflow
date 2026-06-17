import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import {
  isMetaConfiguredForUser,
  getRedirectUri,
  getWebhookUrl,
  getLoginConfigId,
  getIntegrationSettingsPublic,
} from "@/services/integration-settings.service";
import { mapFacebookConnectionPublic, mapFacebookPagePublic, mapFacebookBusinessPublic } from "@/services/facebook.service";
import { mapTelegramConnectionPublic } from "@/services/telegram.service";
import { buildWizardSteps } from "@/lib/facebook-diagnosis";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const metaConfigured = await isMetaConfiguredForUser(userId);

  const [connection, pages, businesses, forms, telegram, failedForms, integrationSettings, leadsCount, lastSuccessVerification] =
    await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookPage.findMany({
      where: { userId },
      include: {
        business: true,
        forms: { select: { id: true, enabled: true } },
      },
      orderBy: { pageName: "asc" },
    }),
    prisma.facebookBusiness.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.facebookForm.count({
      where: { syncStatus: "failed", page: { userId } },
    }),
    getIntegrationSettingsPublic(userId),
    prisma.lead.count({ where: { userId } }),
    prisma.webhookVerificationLog.findFirst({
      where: { userId, success: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasLoginConfigId = integrationSettings.hasMetaLoginConfigId;
  const connectedPages = pages.filter((p) => p.connected);
  const facebook = connection
    ? mapFacebookConnectionPublic(connection, { hasLoginConfigId })
    : {
        status: "disconnected",
        uiStatus: "disconnected" as const,
        diagnosis: "disconnected" as const,
        facebookUserId: null,
        facebookUserName: null,
        facebookUserPictureUrl: null,
        appIdUsed: null,
        loginConfigIdAtAuth: null,
        grantedScopes: [],
        granularScopes: [],
        missingScopes: [],
        connectedAt: null,
        lastCheckedAt: null,
        lastError: null,
        lastErrorCode: null,
        lastErrorAt: null,
        tokenExpiresAt: null,
        connected: false,
        tokenInvalid: false,
        pagesCountAtAuth: 0,
        pagesAccessMissing: false,
      };

  const wizardSteps = buildWizardSteps({
    hasFacebookProfile: !!facebook.facebookUserId,
    businessesCount: businesses.length,
    connectedPagesCount: connectedPages.length,
    activeFormsCount: forms,
    telegramConnected: telegram?.status === "connected",
    webhookVerified: !!lastSuccessVerification,
    leadsCount,
  });

  return apiSuccess({
    metaConfigured,
    hasLoginConfigId,
    connected: facebook.connected,
    integrationStatus: facebook.uiStatus,
    diagnosis: facebook.diagnosis,
    connectionStatus: facebook.status,
    tokenInvalid: facebook.tokenInvalid,
    tokenExpiresAt: facebook.tokenExpiresAt,
    facebook,
    telegram: telegram
      ? mapTelegramConnectionPublic(telegram)
      : {
          connected: false,
          status: "disconnected",
          lastError: null,
          lastErrorAt: null,
        },
    pages: pages.map(mapFacebookPagePublic),
    businesses: businesses.map(mapFacebookBusinessPublic),
    businessesCount: businesses.length,
    connectedPagesCount: connectedPages.length,
    totalPagesCount: pages.length,
    activeFormsCount: forms,
    failedFormsCount: failedForms,
    leadsCount,
    telegramConnected: telegram?.status === "connected",
    webhookUrl: getWebhookUrl(),
    redirectUri: getRedirectUri(),
    webhookVerified: !!lastSuccessVerification,
    setupSteps: wizardSteps,
  });
}
