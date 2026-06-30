import type { MetricComparison } from "@/lib/ad-audit-analytics";
import type { CampaignQuality } from "@/lib/ad-audit-analytics";

export type MainInsight = {
  periodLabelKey: string;
  bullets: Array<{
    id: string;
    tone: "positive" | "neutral" | "warning";
    messageKey: string;
    messageParams?: Record<string, string | number>;
  }>;
  headlineKey: string;
  headlineParams?: Record<string, string | number>;
};

type CampaignRow = {
  name: string;
  leads: number;
  cpl: number | null;
  quality: CampaignQuality;
  spend: number;
};

export function buildMainInsight(params: {
  periodId: string;
  metaLeads: number;
  leadBridgeLeads: number;
  cplComparison?: Pick<MetricComparison, "deltaPct" | "direction">;
  campaigns: CampaignRow[];
  avgCpl: number | null;
  currency: string;
}): MainInsight {
  const bullets: MainInsight["bullets"] = [];

  const totalLeads = Math.max(params.metaLeads, params.leadBridgeLeads);
  if (totalLeads > 0) {
    bullets.push({
      id: "leads",
      tone: "positive",
      messageKey: "insightLeadsReceived",
      messageParams: { count: totalLeads },
    });
  }

  if (params.cplComparison?.deltaPct != null && params.cplComparison.direction !== "flat") {
    bullets.push({
      id: "cpl",
      tone: params.cplComparison.direction === "down" ? "positive" : "warning",
      messageKey:
        params.cplComparison.direction === "down"
          ? "insightCplDown"
          : "insightCplUp",
      messageParams: { value: Math.abs(params.cplComparison.deltaPct) },
    });
  }

  const withLeads = params.campaigns.filter((c) => c.leads > 0);
  const best = [...withLeads].sort((a, b) => (a.cpl ?? 999) - (b.cpl ?? 999))[0];
  const worst = [...params.campaigns]
    .filter((c) => c.spend > 0)
    .sort((a, b) => {
      if (a.leads === 0 && b.leads > 0) return -1;
      if (b.leads === 0 && a.leads > 0) return 1;
      return b.spend - a.spend;
    })[0];

  if (best) {
    bullets.push({
      id: "bestCampaign",
      tone: "positive",
      messageKey: "insightBestCampaign",
      messageParams: { name: best.name },
    });
  }

  if (worst && worst.name !== best?.name) {
    bullets.push({
      id: "worstCampaign",
      tone: worst.leads === 0 ? "warning" : "neutral",
      messageKey: "insightWorstCampaign",
      messageParams: { name: worst.name },
    });
  }

  if (best && best.cpl != null && params.avgCpl != null && best.cpl <= params.avgCpl) {
    bullets.push({
      id: "scaleBudget",
      tone: "positive",
      messageKey: "insightScaleBudget",
      messageParams: { name: best.name },
    });
  }

  if (bullets.length === 0) {
    bullets.push({
      id: "noData",
      tone: "neutral",
      messageKey: "insightNoData",
    });
  }

  return {
    periodLabelKey: `period.${params.periodId}`,
    bullets,
    headlineKey: totalLeads > 0 ? "insightHeadlineActive" : "insightHeadlineEmpty",
    headlineParams: totalLeads > 0 ? { count: totalLeads } : undefined,
  };
}

import type { PrismaClient } from "@prisma/client";

export type HealthHistory = {
  periodDays: number;
  webhook: { uptimePct: number; processed: number; total: number };
  meta: { uptimePct: number; ok: boolean };
  telegram: { uptimePct: number; sent: number; total: number };
  errors: number;
};

export async function computeHealthHistory(
  userId: string,
  prisma: PrismaClient
): Promise<HealthHistory> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [webhookTotal, webhookProcessed, telegramTotal, telegramSent, fb] =
    await Promise.all([
      prisma.webhookEvent.count({ where: { userId, createdAt: { gte: since } } }),
      prisma.webhookEvent.count({
        where: { userId, status: "processed", createdAt: { gte: since } },
      }),
      prisma.deliveryLog.count({
        where: { userId, type: "telegram", createdAt: { gte: since } },
      }),
      prisma.deliveryLog.count({
        where: {
          userId,
          type: "telegram",
          status: { in: ["sent", "delivered"] },
          createdAt: { gte: since },
        },
      }),
      prisma.facebookConnection.findUnique({
        where: { userId },
        select: { status: true, lastErrorAt: true },
      }),
    ]);

  const webhookPct =
    webhookTotal > 0 ? Math.round((webhookProcessed / webhookTotal) * 1000) / 10 : 100;
  const telegramPct =
    telegramTotal > 0 ? Math.round((telegramSent / telegramTotal) * 1000) / 10 : 100;
  const metaOk =
    fb?.status === "connected" &&
    (!fb.lastErrorAt || fb.lastErrorAt < since);

  const errors =
    (webhookTotal - webhookProcessed) +
    (telegramTotal - telegramSent) +
    (metaOk ? 0 : 1);

  return {
    periodDays: 30,
    webhook: {
      uptimePct: webhookPct,
      processed: webhookProcessed,
      total: webhookTotal,
    },
    meta: { uptimePct: metaOk ? 100 : fb?.status === "connected" ? 95 : 0, ok: metaOk },
    telegram: {
      uptimePct: telegramPct,
      sent: telegramSent,
      total: telegramTotal,
    },
    errors: Math.max(0, errors),
  };
}

export type SystemHealthItem = {
  id: string;
  labelKey: string;
  ok: boolean;
  detailKey?: string;
  detailParams?: Record<string, string | number>;
};

export function buildSystemHealth(params: {
  metaApiOk: boolean;
  webhookOk: boolean;
  telegramOk: boolean;
  leadDeliveryOk: boolean;
  oauthOk: boolean;
}): { items: SystemHealthItem[]; overallOk: boolean } {
  const items: SystemHealthItem[] = [
    { id: "meta", labelKey: "healthMetaApi", ok: params.metaApiOk },
    { id: "webhook", labelKey: "healthWebhook", ok: params.webhookOk },
    { id: "telegram", labelKey: "healthTelegram", ok: params.telegramOk },
    { id: "delivery", labelKey: "healthLeadDelivery", ok: params.leadDeliveryOk },
    { id: "oauth", labelKey: "healthOAuth", ok: params.oauthOk },
  ];

  return {
    items,
    overallOk: items.every((i) => i.ok),
  };
}

export type RoiMetrics = {
  spend: number;
  leads: number;
  revenuePerLead: number;
  expectedRevenue: number;
  roi: number;
  profit: number;
};

export function calculateRoi(
  spend: number,
  leads: number,
  revenuePerLead: number
): RoiMetrics | null {
  if (!revenuePerLead || revenuePerLead <= 0 || leads <= 0) return null;
  const expectedRevenue = leads * revenuePerLead;
  const profit = expectedRevenue - spend;
  const roi = spend > 0 ? ((expectedRevenue - spend) / spend) * 100 : 0;
  return {
    spend,
    leads,
    revenuePerLead,
    expectedRevenue,
    roi: Math.round(roi * 10) / 10,
    profit: Math.round(profit * 100) / 100,
  };
}
