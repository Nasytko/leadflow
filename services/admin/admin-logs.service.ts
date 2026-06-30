import { prisma } from "@/lib/prisma";

export async function getAdminSecurityStats() {
  const [adminCount, unverifiedCount, recentAuthLogs] = await Promise.all([
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.systemLog.findMany({
      where: { source: { in: ["auth", "security"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        level: true,
        action: true,
        message: true,
        createdAt: true,
        userId: true,
      },
    }),
  ]);

  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, name: true, lastLoginAt: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    adminCount,
    unverifiedCount,
    csrfEnabled: true,
    rateLimitEnabled: true,
    webhookSignatureRequired: true,
    admins,
    recentAuthLogs,
  };
}

export async function getTelegramPlatformStats() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [connected, failedWeek, lastDelivery, lastError] = await Promise.all([
    prisma.telegramConnection.count({ where: { status: "connected" } }),
    prisma.deliveryLog.count({
      where: { type: "telegram", status: "failed", createdAt: { gte: weekAgo } },
    }),
    prisma.deliveryLog.findFirst({
      where: { type: "telegram", status: { in: ["sent", "delivered"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    }),
    prisma.deliveryLog.findFirst({
      where: { type: "telegram", status: "failed" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, errorMessage: true },
    }),
  ]);

  return {
    connectedUsers: connected,
    failedDeliveriesWeek: failedWeek,
    lastDeliveryAt: lastDelivery?.createdAt.toISOString() ?? null,
    lastErrorAt: lastError?.createdAt.toISOString() ?? null,
    lastErrorMessage: lastError?.errorMessage?.slice(0, 200) ?? null,
    platformBotConfigured: false,
  };
}

export async function querySystemLogs(params: {
  level?: string;
  source?: string;
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (params.level) where.level = params.level;
  if (params.source) where.source = params.source;
  if (params.userId) where.userId = params.userId;

  const logs = await prisma.systemLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 100,
    skip: params.offset ?? 0,
    include: {
      user: { select: { email: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    level: l.level,
    source: l.source,
    action: l.action,
    message: l.message,
    userEmail: l.user?.email ?? null,
    metadata: l.metadata,
  }));
}

export async function queryAuditLogs(params: {
  action?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (params.action) where.action = { contains: params.action };
  if (params.userId) where.userId = params.userId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 100,
    skip: params.offset ?? 0,
    include: {
      user: { select: { email: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    action: l.action,
    resource: l.resource,
    adminEmail: l.user?.email ?? null,
    metadata: l.metadata,
    ipAddress: l.ipAddress,
  }));
}

export async function getUserAdminDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      isAdmin: true,
      locale: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
      facebookConnection: { select: { status: true, connectedAt: true } },
      telegramConnection: { select: { status: true, chatId: true } },
      _count: {
        select: {
          leads: true,
          facebookPages: true,
          facebookBusinesses: true,
          metaAdAccounts: true,
          webhookEvents: true,
        },
      },
    },
  });

  if (!user) return null;

  const formsCount = await prisma.facebookForm.count({
    where: { page: { userId } },
  });

  const recentWebhooks = await prisma.webhookEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, status: true, eventType: true, createdAt: true },
  });

  return {
    ...user,
    formsCount,
    recentWebhooks,
    telegramChatId: user.telegramConnection?.chatId
      ? `***${user.telegramConnection.chatId.slice(-4)}`
      : null,
  };
}
