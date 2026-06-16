import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import {
  isMetaConfiguredForUser,
  getRedirectUri,
  getWebhookUrl,
} from "@/services/integration-settings.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const metaConfigured = await isMetaConfiguredForUser(userId);

  const [connection, pages, forms, telegram] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.facebookPage.findMany({ where: { userId } }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
  ]);

  const connectedPages = pages.filter((p) => p.connected);

  return apiSuccess({
    metaConfigured,
    connected: !!connection,
    connectionStatus: connection?.status ?? "not_connected",
    tokenExpiresAt: connection?.tokenExpiresAt,
    pages: pages.map((p) => ({
      id: p.id,
      pageId: p.pageId,
      pageName: p.pageName,
      connected: p.connected,
    })),
    connectedPagesCount: connectedPages.length,
    totalPagesCount: pages.length,
    activeFormsCount: forms,
    telegramConnected: !!telegram?.verified,
    webhookUrl: getWebhookUrl(),
    redirectUri: getRedirectUri(),
    setupSteps: {
      metaApp: metaConfigured,
      facebookOAuth: !!connection,
      pagesSelected: connectedPages.length > 0,
      formsEnabled: forms > 0,
      telegram: !!telegram?.verified,
    },
  });
}
