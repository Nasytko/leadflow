import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, apiSuccess } from "@/lib/api-helpers";
import { getIntegrationSettingsPublic } from "@/services/integration-settings.service";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

  const userId = authResult.session.user.id;
  const limit = 20;

  const [verificationLogs, webhookEvents, lastSuccessVerification, integration] =
    await Promise.all([
      prisma.webhookVerificationLog.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.webhookEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.webhookVerificationLog.findFirst({
        where: { userId, success: true },
        orderBy: { createdAt: "desc" },
      }),
      getIntegrationSettingsPublic(userId),
    ]);

  const lastEvent = webhookEvents[0] ?? null;

  return apiSuccess({
    webhookVerified: !!lastSuccessVerification,
    hasWebhookVerifyToken: integration.hasWebhookToken,
    lastVerificationAt: lastSuccessVerification?.createdAt ?? null,
    lastWebhookAt: lastEvent?.createdAt ?? null,
    lastWebhookStatus: lastEvent?.status ?? null,
    lastWebhookError: lastEvent?.lastError ?? null,
    verificationLogs: verificationLogs.map((l) => ({
      id: l.id,
      mode: l.mode,
      tokenMasked: l.tokenMasked,
      challengePresent: l.challengePresent,
      success: l.success,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt,
    })),
    webhookEvents: webhookEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      status: e.status,
      pageId: e.pageId,
      formId: e.formId,
      leadgenId: e.leadgenId,
      lastError: e.lastError,
      sourceIp: e.sourceIp,
      userAgent: e.userAgent,
      createdAt: e.createdAt,
      processedAt: e.processedAt,
    })),
  });
}
