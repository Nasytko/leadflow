import { prisma } from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const userId = authResult.session.user.id;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    facebookConnection,
    telegramConnection,
    integrationSettings,
    connectedPages,
    totalPages,
    activeForms,
    totalForms,
    failedFormsSync,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    totalLeads,
    deliveryLogsToday,
    successfulDeliveries,
    totalDeliveries,
    recentLeads,
    recentLogs,
  ] = await Promise.all([
    prisma.facebookConnection.findUnique({ where: { userId } }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.integrationSettings.findUnique({ where: { userId } }),
    prisma.facebookPage.count({ where: { userId, connected: true } }),
    prisma.facebookPage.count({ where: { userId } }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.facebookForm.count({ where: { page: { userId } } }),
    prisma.facebookForm.count({
      where: { syncStatus: "failed", page: { userId } },
    }),
    prisma.lead.count({
      where: { userId, createdTime: { gte: startOfDay } },
    }),
    prisma.lead.count({
      where: { userId, createdTime: { gte: startOfWeek } },
    }),
    prisma.lead.count({
      where: { userId, createdTime: { gte: startOfMonth } },
    }),
    prisma.lead.count({ where: { userId } }),
    prisma.deliveryLog.count({
      where: { userId, createdAt: { gte: startOfDay } },
    }),
    prisma.deliveryLog.count({
      where: { userId, status: { in: ["success", "sent"] } },
    }),
    prisma.deliveryLog.count({ where: { userId } }),
    prisma.lead.findMany({
      where: { userId },
      orderBy: { createdTime: "desc" },
      take: 5,
      include: { form: { select: { formName: true } } },
    }),
    prisma.deliveryLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const failedDeliveriesToday = await prisma.deliveryLog.count({
    where: {
      userId,
      status: "failed",
      createdAt: { gte: startOfDay },
    },
  });

  const deliverySuccessRate =
    totalDeliveries > 0
      ? Math.round((successfulDeliveries / totalDeliveries) * 100)
      : null;

  const [lastSuccessVerification, lastWebhookEvent, failedWebhookEvents] =
    await Promise.all([
      prisma.webhookVerificationLog.findFirst({
        where: { userId, success: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.webhookEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.webhookEvent.count({
        where: { userId, status: "failed" },
      }),
    ]);

  const facebookStatus = facebookConnection?.status ?? "disconnected";
  const telegramStatus = telegramConnection?.status ?? "disconnected";

  const setupSteps = {
    metaApp: !!integrationSettings?.configured,
    facebookOAuth: facebookStatus === "connected",
    pagesSelected: connectedPages > 0,
    formsEnabled: activeForms > 0,
    telegram: telegramStatus === "connected",
  };

  const setupCompleted = Object.values(setupSteps).filter(Boolean).length;

  return apiSuccess({
    facebookConnected: facebookStatus === "connected",
    facebookStatus,
    facebookLastError: facebookConnection?.lastError ?? null,
    facebookUserName: facebookConnection?.facebookUserName ?? null,
    telegramConnected: telegramStatus === "connected",
    telegramStatus,
    telegramLastError: telegramConnection?.lastError ?? null,
    metaConfigured: !!integrationSettings?.configured,
    connectedPages,
    totalPages,
    activeForms,
    totalForms,
    failedFormsSync,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    totalLeads,
    deliveryLogsToday,
    failedDeliveriesToday,
    deliverySuccessRate,
    setupSteps,
    setupCompleted,
    setupTotal: 5,
    webhookVerified: !!lastSuccessVerification,
    lastWebhookAt: lastWebhookEvent?.createdAt ?? null,
    lastWebhookStatus: lastWebhookEvent?.status ?? null,
    lastWebhookError: lastWebhookEvent?.lastError ?? null,
    failedWebhookEvents,
    recentLeads,
    recentLogs,
  });
}
