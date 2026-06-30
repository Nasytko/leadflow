import { prisma } from "@/lib/prisma";

export type PlatformStatus = "healthy" | "attention" | "critical";

export async function getAdminDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    usersTotal,
    activeUsers,
    verifiedEmails,
    fbConnections,
    telegramConnected,
    leadsToday,
    leadsWeek,
    failedDeliveries,
    failedWebhooks,
    unverifiedUsers,
    pendingApproval,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.facebookConnection.count({ where: { status: "connected" } }),
    prisma.telegramConnection.count({ where: { status: "connected" } }),
    prisma.lead.count({ where: { createdTime: { gte: todayStart } } }),
    prisma.lead.count({ where: { createdTime: { gte: weekAgo } } }),
    prisma.deliveryLog.count({
      where: { status: "failed", createdAt: { gte: weekAgo } },
    }),
    prisma.webhookEvent.count({
      where: { status: { not: "processed" }, createdAt: { gte: weekAgo } },
    }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.user.count({ where: { status: "pending_approval" } }),
  ]);

  const emailSettings = await prisma.platformEmailSettings.findUnique({
    where: { id: "platform" },
  });
  const emailConfigured =
    !!process.env.SMTP_HOST ||
    (emailSettings?.enabled && !!emailSettings.smtpHost);

  const alerts: Array<{
    id: string;
    severity: "warning" | "critical" | "info";
    messageKey: string;
    messageParams?: Record<string, string | number>;
    href: string;
    actionKey: string;
  }> = [];

  if (!emailConfigured) {
    alerts.push({
      id: "smtp",
      severity: "warning",
      messageKey: "alertSmtpNotConfigured",
      href: "/admin/platform/email",
      actionKey: "actionFix",
    });
  }

  if (failedDeliveries > 0) {
    alerts.push({
      id: "telegram_failures",
      severity: "warning",
      messageKey: "alertTelegramFailures",
      messageParams: { count: failedDeliveries },
      href: "/admin/platform/telegram",
      actionKey: "actionViewLogs",
    });
  }

  if (failedWebhooks > 0) {
    alerts.push({
      id: "webhook_failures",
      severity: "critical",
      messageKey: "alertWebhookFailures",
      messageParams: { count: failedWebhooks },
      href: "/admin/logs",
      actionKey: "actionViewLogs",
    });
  }

  if (unverifiedUsers > 0) {
    alerts.push({
      id: "unverified",
      severity: "info",
      messageKey: "alertUnverifiedUsers",
      messageParams: { count: unverifiedUsers },
      href: "/admin/security",
      actionKey: "actionOpen",
    });
  }

  if (pendingApproval > 0) {
    alerts.push({
      id: "pending_approval",
      severity: "info",
      messageKey: "alertPendingApproval",
      messageParams: { count: pendingApproval },
      href: "/admin/users",
      actionKey: "actionOpen",
    });
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  let platformStatus: PlatformStatus = "healthy";
  if (criticalCount > 0 || failedWebhooks > 5) platformStatus = "critical";
  else if (warningCount > 0 || failedDeliveries > 0) platformStatus = "attention";

  return {
    platformStatus,
    stats: {
      usersTotal,
      activeUsers,
      verifiedEmails,
      fbConnections,
      telegramConnected,
      leadsToday,
      leadsWeek,
      failedJobs: failedDeliveries,
      failedWebhooks,
      emailErrors: emailSettings?.lastError ? 1 : 0,
      unverifiedUsers,
    },
    alerts,
    environment: process.env.NODE_ENV ?? "development",
    deploymentMode: process.env.DEPLOYMENT_MODE ?? "saas",
    version: process.env.npm_package_version ?? "0.1.0",
  };
}
