import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import {
  isMetaConfiguredForUser,
  getRedirectUri,
  getWebhookUrl,
} from "@/services/integration-settings.service";
import { mapFacebookConnectionPublic } from "@/services/facebook.service";
import { mapTelegramConnectionPublic } from "@/services/telegram.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const metaConfigured = await isMetaConfiguredForUser(userId);

  const [connection, pages, forms, telegram, failedForms] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookPage.findMany({ where: { userId } }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.facebookForm.count({
      where: { syncStatus: "failed", page: { userId } },
    }),
  ]);

  const connectedPages = pages.filter((p) => p.connected);
  const facebook = connection
    ? mapFacebookConnectionPublic(connection)
    : {
        status: "disconnected",
        facebookUserId: null,
        facebookUserName: null,
        facebookUserPictureUrl: null,
        connectedAt: null,
        lastCheckedAt: null,
        lastError: null,
        lastErrorCode: null,
        lastErrorAt: null,
        tokenExpiresAt: null,
        connected: false,
        tokenInvalid: false,
      };

  return apiSuccess({
    metaConfigured,
    connected: facebook.connected,
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
    pages: pages.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      pageName: p.pageName,
      connected: p.connected,
      syncStatus: p.syncStatus,
      webhookStatus: p.webhookStatus,
      lastError: p.lastError,
    })),
    connectedPagesCount: connectedPages.length,
    totalPagesCount: pages.length,
    activeFormsCount: forms,
    failedFormsCount: failedForms,
    telegramConnected: telegram?.status === "connected",
    webhookUrl: getWebhookUrl(),
    redirectUri: getRedirectUri(),
    setupSteps: {
      metaApp: metaConfigured,
      facebookOAuth: facebook.connected,
      pagesSelected: connectedPages.length > 0,
      formsEnabled: forms > 0,
      telegram: telegram?.status === "connected",
    },
  });
}
