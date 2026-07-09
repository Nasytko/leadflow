import { prisma } from "@/lib/prisma";
import { requireAuth, apiSuccess } from "@/lib/api-helpers";
import { getIntegrationSettingsPublic } from "@/services/integration-settings.service";
import { buildWizardSteps } from "@/lib/facebook-diagnosis";
import { buildDashboardHealthCards } from "@/lib/dashboard-health";
import {
  getLeadsByDay,
  getLeadsChartSeries,
  getLeadSources,
  getCampaignSummary,
  getRecentEvents,
  getLeadTrends,
  getTodaySourceBreakdown,
  getDeliveredToday,
  getTodayDeliveryRate,
  getAvgProcessingTimeMs,
  getFormOverview,
  getTelegramTodayStats,
  computeAttentionCount,
  type PipelineNode,
} from "@/lib/dashboard-analytics";
import { checkRateLimit } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;

  const rateLimitError = await checkRateLimit(request, authResult.session.user.id);
  if (rateLimitError) return rateLimitError;

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
  const integrationPublic = await getIntegrationSettingsPublic(userId);

  const setupSteps = buildWizardSteps({
    hasFacebookProfile: !!facebookConnection?.facebookUserId,
    businessesCount: await prisma.facebookBusiness.count({ where: { userId } }),
    adAccountsCount: await prisma.metaAdAccount.count({ where: { userId } }),
    connectedPagesCount: connectedPages,
    activeFormsCount: activeForms,
    telegramConnected: telegramStatus === "connected",
    webhookVerified: !!lastSuccessVerification,
    leadsCount: totalLeads,
    hasAuditRun:
      (await prisma.metaInsightSnapshot.count({ where: { userId } })) > 0,
  });

  const setupCompleted = Object.values(setupSteps).filter(Boolean).length;

  const [businessesCount, queuedWebhooks, lastLead, lastTelegramDelivery] =
    await Promise.all([
      prisma.facebookBusiness.count({ where: { userId } }),
      prisma.webhookEvent.count({
        where: {
          userId,
          status: { in: ["queued", "processing", "received"] },
        },
      }),
      prisma.lead.findFirst({
        where: { userId },
        orderBy: { createdTime: "desc" },
        select: { createdTime: true },
      }),
      prisma.deliveryLog.findFirst({
        where: { userId, type: "telegram" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true },
      }),
    ]);

  const healthCards = buildDashboardHealthCards({
    facebookStatus,
    facebookLastError: facebookConnection?.lastError ?? null,
    facebookUserName: facebookConnection?.facebookUserName ?? null,
    businessesCount,
    connectedPages,
    totalPages,
    activeForms,
    totalForms,
    failedFormsSync,
    webhookVerified: !!lastSuccessVerification,
    lastWebhookAt: lastWebhookEvent?.createdAt ?? null,
    lastWebhookStatus: lastWebhookEvent?.status ?? null,
    lastWebhookError: lastWebhookEvent?.lastError ?? null,
    telegramStatus,
    telegramLastError: telegramConnection?.lastError ?? null,
    failedDeliveriesToday,
    lastLeadAt: lastLead?.createdTime ?? null,
    lastTelegramDeliveryAt: lastTelegramDelivery?.createdAt ?? null,
    lastTelegramDeliveryStatus: lastTelegramDelivery?.status ?? null,
    metaConfigured: !!integrationSettings?.configured,
    queuedWebhooks,
  });

  const [leadsByDay, leadsChartSeries, leadSources, campaignSummary, recentEvents, trends, todayBreakdown, deliveredToday, deliveryRateToday, avgProcessingMs, formsOverview, telegramToday] =
    await Promise.all([
      getLeadsByDay(userId, 30),
      getLeadsChartSeries(userId, 30),
      getLeadSources(userId),
      getCampaignSummary(userId),
      getRecentEvents(userId, 10),
      getLeadTrends(userId),
      getTodaySourceBreakdown(userId, startOfDay),
      getDeliveredToday(userId, startOfDay),
      getTodayDeliveryRate(userId, startOfDay),
      getAvgProcessingTimeMs(userId, startOfDay),
      getFormOverview(userId, startOfDay),
      getTelegramTodayStats(userId, startOfDay),
    ]);

  const attentionCount = computeAttentionCount({
    failedDeliveriesToday,
    failedWebhookEvents,
    failedFormsSync,
    facebookStatus,
    webhookVerified: !!lastSuccessVerification,
    telegramStatus,
    activeForms,
  });

  const sourceHealth = healthCards.find((c) => c.id === "facebook")?.status ?? "unknown";
  const processingHealth = healthCards.find((c) => c.id === "webhook")?.status ?? "unknown";
  const deliveryHealth = healthCards.find((c) => c.id === "telegram")?.status ?? "unknown";

  const pipelineNodes: PipelineNode[] = [
    {
      id: "source",
      status: sourceHealth,
      healthLabelKey: "pipelineNodeSource",
      todayCount: leadsToday,
      manageHref: "/connections/facebook",
      fixHref: facebookStatus !== "connected" ? "/connections/facebook" : null,
    },
    {
      id: "processing",
      status: processingHealth,
      healthLabelKey: "pipelineNodeProcessing",
      todayCount: deliveryLogsToday,
      manageHref: "/connections/webhook",
      fixHref: !lastSuccessVerification && activeForms > 0 ? "/connections/webhook" : null,
    },
    {
      id: "delivery",
      status: deliveryHealth,
      healthLabelKey: "pipelineNodeDelivery",
      todayCount: deliveredToday,
      manageHref: "/connections/telegram",
      fixHref: telegramStatus !== "connected" && activeForms > 0 ? "/connections/telegram" : null,
    },
  ];

  const activationSteps = {
    facebook: setupSteps.facebookAccount,
    forms: setupSteps.formsEnabled,
    telegram: setupSteps.telegram,
    testLead: setupSteps.testLead || totalLeads > 0,
  };
  const activationCompleted = Object.values(activationSteps).filter(Boolean).length;
  const activationMode = totalLeads === 0 && activationCompleted < 4;

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
    setupTotal: 7,
    webhookVerified: !!lastSuccessVerification,
    lastWebhookAt: lastWebhookEvent?.createdAt ?? null,
    lastWebhookStatus: lastWebhookEvent?.status ?? null,
    lastWebhookError: lastWebhookEvent?.lastError ?? null,
    failedWebhookEvents,
    healthCards,
    recentLeads,
    recentLogs,
    leadsByDay,
    leadSources,
    campaignSummary,
    recentEvents,
    lastLeadAt: lastLead?.createdTime?.toISOString() ?? null,
    todayTrend: trends.todayTrend,
    weekTrend: trends.weekTrend,
    monthTrend: trends.monthTrend,
    todayBreakdown,
    deliveredToday,
    deliveryRateToday,
    avgProcessingMs,
    attentionCount,
    leadsChartSeries,
    formsOverview,
    telegramToday,
    pipelineNodes,
    activationMode,
    activationSteps,
    activationCompleted,
    activationTotal: 4,
  });
}
