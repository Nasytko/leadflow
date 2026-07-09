import { prisma } from "@/lib/prisma";

export type SourceBreakdown = {
  facebook: number;
  webhook: number;
  import: number;
};

export type LeadsChartDay = {
  date: string;
  total: number;
  facebook: number;
  webhook: number;
  import: number;
  delivered: number;
  failed: number;
  topForm: string | null;
  topCampaign: string | null;
};

export type FormOverviewRow = {
  id: string;
  formName: string;
  enabled: boolean;
  todayLeads: number;
  totalLeads: number;
  lastSyncAt: string | null;
};

export type PipelineNode = {
  id: "source" | "processing" | "delivery";
  status: "ok" | "warning" | "error" | "unknown";
  healthLabelKey: string;
  todayCount: number;
  manageHref: string;
  fixHref: string | null;
};

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

function sourceBucket(source: string): keyof SourceBreakdown {
  if (source === "manual_import") return "import";
  if (source === "webhook") return "webhook";
  return "facebook";
}

export async function getLeadsChartSeries(userId: string, days = 30): Promise<LeadsChartDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [leads, deliveries] = await Promise.all([
    prisma.lead.findMany({
      where: { userId, createdTime: { gte: since } },
      select: {
        createdTime: true,
        source: true,
        campaignName: true,
        form: { select: { formName: true } },
      },
    }),
    prisma.deliveryLog.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const dayMap = new Map<string, LeadsChartDay>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, {
      date: key,
      total: 0,
      facebook: 0,
      webhook: 0,
      import: 0,
      delivered: 0,
      failed: 0,
      topForm: null,
      topCampaign: null,
    });
  }

  const formCountsByDay = new Map<string, Map<string, number>>();
  const campaignCountsByDay = new Map<string, Map<string, number>>();

  for (const lead of leads) {
    const key = lead.createdTime.toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (!row) continue;
    row.total += 1;
    row[sourceBucket(lead.source)] += 1;

    if (lead.form?.formName) {
      if (!formCountsByDay.has(key)) formCountsByDay.set(key, new Map());
      const fm = formCountsByDay.get(key)!;
      fm.set(lead.form.formName, (fm.get(lead.form.formName) ?? 0) + 1);
    }
    if (lead.campaignName?.trim()) {
      if (!campaignCountsByDay.has(key)) campaignCountsByDay.set(key, new Map());
      const cm = campaignCountsByDay.get(key)!;
      const c = lead.campaignName.trim();
      cm.set(c, (cm.get(c) ?? 0) + 1);
    }
  }

  for (const d of deliveries) {
    const key = d.createdAt.toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (!row) continue;
    if (d.status === "failed") row.failed += 1;
    else if (d.status === "success" || d.status === "sent") row.delivered += 1;
  }

  for (const [key, row] of dayMap) {
    const topForm = [...(formCountsByDay.get(key)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0];
    const topCampaign = [...(campaignCountsByDay.get(key)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0];
    row.topForm = topForm?.[0] ?? null;
    row.topCampaign = topCampaign?.[0] ?? null;
  }

  return Array.from(dayMap.values());
}

export async function getTodaySourceBreakdown(userId: string, startOfDay: Date): Promise<SourceBreakdown> {
  const leads = await prisma.lead.findMany({
    where: { userId, createdTime: { gte: startOfDay } },
    select: { source: true },
  });
  const out: SourceBreakdown = { facebook: 0, webhook: 0, import: 0 };
  for (const l of leads) {
    out[sourceBucket(l.source)] += 1;
  }
  return out;
}

export async function getDeliveredToday(userId: string, startOfDay: Date) {
  return prisma.deliveryLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
      status: { in: ["success", "sent"] },
    },
  });
}

export async function getTodayDeliveryRate(userId: string, startOfDay: Date) {
  const [success, total] = await Promise.all([
    prisma.deliveryLog.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        status: { in: ["success", "sent"] },
      },
    }),
    prisma.deliveryLog.count({
      where: { userId, createdAt: { gte: startOfDay } },
    }),
  ]);
  return total > 0 ? Math.round((success / total) * 100) : null;
}

export async function getAvgProcessingTimeMs(userId: string, startOfDay: Date): Promise<number | null> {
  const deliveries = await prisma.deliveryLog.findMany({
    where: {
      userId,
      createdAt: { gte: startOfDay },
      leadId: { not: null },
      status: { in: ["success", "sent"] },
    },
    include: { lead: { select: { createdTime: true } } },
    take: 100,
  });
  const deltas = deliveries
    .filter((d) => d.lead)
    .map((d) => d.createdAt.getTime() - d.lead!.createdTime.getTime())
    .filter((ms) => ms >= 0 && ms < 24 * 60 * 60 * 1000);
  if (!deltas.length) return null;
  return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

export async function getFormOverview(userId: string, startOfDay: Date): Promise<FormOverviewRow[]> {
  const [forms, todayByForm] = await Promise.all([
    prisma.facebookForm.findMany({
      where: { page: { userId } },
      select: {
        id: true,
        formName: true,
        enabled: true,
        leadCount: true,
        lastSyncAt: true,
      },
      orderBy: [{ enabled: "desc" }, { leadCount: "desc" }],
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["formId"],
      where: { userId, createdTime: { gte: startOfDay }, formId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const todayMap = new Map(todayByForm.map((r) => [r.formId!, r._count._all]));

  return forms.map((f) => ({
    id: f.id,
    formName: f.formName,
    enabled: f.enabled,
    todayLeads: todayMap.get(f.id) ?? 0,
    totalLeads: f.leadCount,
    lastSyncAt: f.lastSyncAt?.toISOString() ?? null,
  }));
}

export async function getTelegramTodayStats(userId: string, startOfDay: Date) {
  const [delivered, errors] = await Promise.all([
    prisma.deliveryLog.count({
      where: {
        userId,
        type: "telegram",
        createdAt: { gte: startOfDay },
        status: { in: ["success", "sent"] },
      },
    }),
    prisma.deliveryLog.count({
      where: {
        userId,
        type: "telegram",
        createdAt: { gte: startOfDay },
        status: "failed",
      },
    }),
  ]);
  return { delivered, errors };
}

export function computeAttentionCount(input: {
  failedDeliveriesToday: number;
  failedWebhookEvents: number;
  failedFormsSync: number;
  facebookStatus: string;
  webhookVerified: boolean;
  telegramStatus: string;
  activeForms: number;
}): number {
  let n = 0;
  if (input.failedDeliveriesToday > 0) n += 1;
  if (input.failedWebhookEvents > 0) n += 1;
  if (input.failedFormsSync > 0) n += 1;
  if (input.facebookStatus !== "connected") n += 1;
  if (!input.webhookVerified && input.activeForms > 0) n += 1;
  if (input.telegramStatus !== "connected" && input.activeForms > 0) n += 1;
  return n;
}

export async function getLeadSources(userId: string) {  const leads = await prisma.lead.findMany({
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
      messageKey: "eventNewLeadFacebook",
      messageParams: l.form?.formName ? { form: l.form.formName } : undefined,
      status: "ok" as const,
    })),
    ...recentWebhooks.map((w) => ({
      id: `wh-${w.id}`,
      at: w.createdAt.toISOString(),
      type: "webhook" as const,
      messageKey: w.status === "processed" ? "eventLeadProcessed" : "eventLeadProcessingIssue",
      status: (w.status === "processed" ? "ok" : "warning") as "ok" | "warning",
    })),
    ...recentDeliveries.map((d) => ({
      id: `dl-${d.id}`,
      at: d.createdAt.toISOString(),
      type: "delivery" as const,
      messageKey:
        d.status === "failed"
          ? d.type === "telegram"
            ? "eventDeliveryTelegramFailed"
            : "eventDeliveryFailed"
          : d.type === "telegram"
          ? "eventDeliveryTelegramSuccess"
          : "eventDeliverySuccess",
      status: (d.status === "failed" ? "error" : "ok") as "ok" | "error",
    })),  ];

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