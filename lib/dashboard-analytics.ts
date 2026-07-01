import { prisma } from "@/lib/prisma";

export async function getLeadsByDay(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const leads = await prisma.lead.findMany({
    where: { userId, createdTime: { gte: since } },
    select: { createdTime: true },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const lead of leads) {
    const key = lead.createdTime.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}

export async function getLeadSources(userId: string) {
  const leads = await prisma.lead.findMany({
    where: { userId },
    select: { campaignName: true, source: true },
  });

  const counts = new Map<string, number>();
  for (const l of leads) {
    const key = l.campaignName?.trim() || (l.source === "manual_import" ? "Import" : "Facebook Lead Ads");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = leads.length || 1;
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export async function getCampaignSummary(userId: string) {
  const leads = await prisma.lead.groupBy({
    by: ["campaignName"],
    where: { userId, campaignName: { not: null } },
    _count: { _all: true },
  });

  return leads
    .filter((r) => r.campaignName)
    .map((r) => ({
      name: r.campaignName as string,
      leads: r._count._all,
      channel: "Facebook",
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 8);
}

export async function getRecentEvents(userId: string, limit = 8) {
  const [recentLeads, recentWebhooks, recentDeliveries] = await Promise.all([
    prisma.lead.findMany({
      where: { userId },
      orderBy: { createdTime: "desc" },
      take: limit,
      select: { id: true, name: true, createdTime: true, form: { select: { formName: true } } },
    }),
    prisma.webhookEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, status: true, createdAt: true, eventType: true },
    }),
    prisma.deliveryLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, status: true, createdAt: true },
    }),
  ]);

  type Event = {
    id: string;
    at: string;
    type: "lead" | "webhook" | "delivery";
    messageKey: string;
    messageParams?: Record<string, string>;
    status: "ok" | "warning" | "error";
  };

  const events: Event[] = [
    ...recentLeads.map((l) => ({
      id: `lead-${l.id}`,
      at: l.createdTime.toISOString(),
      type: "lead" as const,
      messageKey: "eventLeadReceived",
      messageParams: { name: l.name ?? "—", form: l.form?.formName ?? "" },
      status: "ok" as const,
    })),
    ...recentWebhooks.map((w) => ({
      id: `wh-${w.id}`,
      at: w.createdAt.toISOString(),
      type: "webhook" as const,
      messageKey: w.status === "processed" ? "eventWebhookOk" : "eventWebhookFail",
      status: (w.status === "processed" ? "ok" : "warning") as "ok" | "warning",
    })),
    ...recentDeliveries.map((d) => ({
      id: `dl-${d.id}`,
      at: d.createdAt.toISOString(),
      type: "delivery" as const,
      messageKey: d.status === "failed" ? "eventDeliveryFail" : "eventDeliveryOk",
      messageParams: { type: d.type },
      status: (d.status === "failed" ? "error" : "ok") as "ok" | "error",
    })),
  ];

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getLeadTrends(userId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [today, yesterday, week, prevWeek, month, prevMonth] = await Promise.all([
    prisma.lead.count({ where: { userId, createdTime: { gte: todayStart } } }),
    prisma.lead.count({
      where: { userId, createdTime: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.lead.count({ where: { userId, createdTime: { gte: weekStart } } }),
    prisma.lead.count({
      where: { userId, createdTime: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.lead.count({ where: { userId, createdTime: { gte: monthStart } } }),
    prisma.lead.count({
      where: {
        userId,
        createdTime: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    }),
  ]);

  return {
    todayTrend: pctChange(today, yesterday),
    weekTrend: pctChange(week, prevWeek),
    monthTrend: pctChange(month, prevMonth),
  };
}
