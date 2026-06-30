import { prisma } from "@/lib/prisma";
import { metaGraphFetch } from "@/lib/meta-graph-fetch";
import { parseGraphApiError } from "@/lib/facebook-errors";
import { META_GRAPH_API_BASE } from "@/lib/facebook-graph-config";
import {
  resolveAdAuditPeriod,
  buildInsightsTimeQuery,
  type AdAuditPeriodId,
} from "@/lib/ad-audit-periods";
import {
  compareMetric,
  classifyCampaign,
  classifyAdFilter,
  buildAdAuditRecommendations,
  displayEntityName,
  type CampaignQuality,
  type AdAuditRecommendation,
  type MetricComparison,
} from "@/lib/ad-audit-analytics";
import { calculateMarketingScore } from "@/lib/ad-audit-marketing-score";
import {
  buildMainInsight,
  buildSystemHealth,
  computeHealthHistory,
} from "@/lib/ad-audit-insights";
import {
  countLeadsFromActions,
  normalizeAdAccountId,
} from "@/services/meta-ads.service";
import { getDecryptedUserToken } from "@/services/facebook.service";

const GRAPH = META_GRAPH_API_BASE;
const INSIGHT_FIELDS =
  "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,campaign_id,adset_id,ad_id,date_start,date_stop";

type InsightAction = { action_type: string; value: string };

type GraphInsight = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: InsightAction[];
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
};

async function fetchInsights(
  path: string,
  token: string,
  stage: string
): Promise<GraphInsight[]> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${GRAPH}${path}${separator}access_token=${token}`;
  try {
    const res = await metaGraphFetch(url, { stage, timeoutMs: 20000, retries: 2 });
    if (!res.ok) {
      throw parseGraphApiError(await res.text());
    }
    const json = (await res.json()) as { data?: GraphInsight[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

function parseSummary(rows: GraphInsight[]) {
  const row = rows[0];
  const spend = parseFloat(row?.spend ?? "0") || 0;
  const impressions = parseInt(row?.impressions ?? "0", 10) || 0;
  const reach = parseInt(row?.reach ?? "0", 10) || 0;
  const clicks = parseInt(row?.clicks ?? "0", 10) || 0;
  const ctr = parseFloat(row?.ctr ?? "0") || 0;
  const cpc = parseFloat(row?.cpc ?? "0") || 0;
  const cpm = parseFloat(row?.cpm ?? "0") || 0;
  const metaLeads = countLeadsFromActions(row?.actions);
  const conversion = clicks > 0 ? (metaLeads / clicks) * 100 : 0;
  return {
    spend,
    impressions,
    reach,
    clicks,
    ctr,
    cpc,
    cpm,
    metaLeads,
    conversion,
    dateStart: row?.date_start ?? null,
    dateStop: row?.date_stop ?? null,
  };
}

function leadDateFilter(since: string, until: string) {
  const from = new Date(since);
  from.setHours(0, 0, 0, 0);
  const to = new Date(until);
  to.setHours(23, 59, 59, 999);
  return { gte: from, lte: to };
}

export type AdAuditPeriod = AdAuditPeriodId | "custom";

export async function runAdAudit(
  userId: string,
  adAccountDbId: string,
  options: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    isAdmin?: boolean;
    locale?: string;
  } = {}
) {
  const account = await prisma.metaAdAccount.findFirst({
    where: { id: adAccountDbId, userId },
  });
  if (!account) throw new Error("Ad account not found");

  const token = await getDecryptedUserToken(userId);
  if (!token) throw new Error("Facebook token invalid");

  const resolved = resolveAdAuditPeriod(options.period ?? "last_7d", {
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
  });

  const actId = normalizeAdAccountId(account.metaAdAccountId);
  const timeQ = buildInsightsTimeQuery(resolved);
  const prevTimeQ =
    resolved.previousMetaPreset != null
      ? `&date_preset=${resolved.previousMetaPreset}`
      : `&time_range={"since":"${resolved.previousSince}","until":"${resolved.previousUntil}"}`;

  const [
    accountInsights,
    prevAccountInsights,
    campaignInsights,
    adInsights,
    dailyInsights,
    campaigns,
    ads,
    adSets,
    leadBridgeLeads,
    lastLead,
    lastWebhook,
    telegram,
    enabledForms,
    connectedPages,
    fbConnection,
  ] = await Promise.all([
    fetchInsights(`/${actId}/insights?fields=${INSIGHT_FIELDS}${timeQ}`, token, "audit_account"),
    fetchInsights(`/${actId}/insights?fields=${INSIGHT_FIELDS}${prevTimeQ}`, token, "audit_prev"),
    fetchInsights(
      `/${actId}/insights?fields=${INSIGHT_FIELDS}&level=campaign&limit=200${timeQ}`,
      token,
      "audit_campaigns"
    ),
    fetchInsights(
      `/${actId}/insights?fields=${INSIGHT_FIELDS}&level=ad&limit=500${timeQ}`,
      token,
      "audit_ads"
    ),
    fetchInsights(
      `/${actId}/insights?fields=spend,actions,ctr,clicks,impressions&time_increment=1&limit=100${timeQ}`,
      token,
      "audit_daily"
    ),
    prisma.metaCampaign.findMany({
      where: { adAccountDbId: account.id, userId },
    }),
    prisma.metaAd.findMany({
      where: { adAccountDbId: account.id, userId },
    }),
    prisma.metaAdSet.findMany({
      where: { adAccountDbId: account.id, userId },
    }),
    prisma.lead.count({
      where: {
        userId,
        adAccountDbId: account.id,
        createdTime: leadDateFilter(resolved.since, resolved.until),
      },
    }),
    prisma.lead.findFirst({
      where: { userId, adAccountDbId: account.id },
      orderBy: { createdTime: "desc" },
      select: { createdTime: true, name: true },
    }),
    prisma.webhookEvent.findFirst({
      where: { userId, status: "processed" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.telegramConnection.findUnique({ where: { userId } }),
    prisma.facebookForm.count({
      where: { enabled: true, page: { userId, connected: true } },
    }),
    prisma.facebookPage.count({ where: { userId, connected: true } }),
    prisma.facebookConnection.findUnique({
      where: { userId },
      select: {
        grantedScopes: true,
        status: true,
        lastCheckedAt: true,
        lastError: true,
        lastErrorAt: true,
        connectedAt: true,
      },
    }),
  ]);

  const current = parseSummary(accountInsights);
  const previous = parseSummary(prevAccountInsights);

  const cpl = current.metaLeads > 0 ? current.spend / current.metaLeads : null;
  const prevCpl =
    previous.metaLeads > 0 ? previous.spend / previous.metaLeads : null;

  const campaignMap = new Map(campaigns.map((c) => [c.metaCampaignId, c]));
  const adMap = new Map(ads.map((a) => [a.metaAdId, a]));
  const adSetMap = new Map(adSets.map((s) => [s.metaAdSetId, s]));

  const campaignRowsRaw = campaignInsights.map((row) => {
    const rowLeads = countLeadsFromActions(row.actions);
    const rowSpend = parseFloat(row.spend ?? "0") || 0;
    const metaCampaignId = row.campaign_id ?? "";
    const db = campaignMap.get(metaCampaignId);
    const cplVal = rowLeads > 0 ? rowSpend / rowLeads : null;
    return {
      id: db?.id ?? metaCampaignId,
      metaCampaignId,
      name: displayEntityName(db?.name, metaCampaignId, "unnamed_campaign"),
      status: db?.effectiveStatus ?? db?.status ?? "—",
      spend: rowSpend,
      impressions: parseInt(row.impressions ?? "0", 10) || 0,
      clicks: parseInt(row.clicks ?? "0", 10) || 0,
      ctr: parseFloat(row.ctr ?? "0") || 0,
      cpm: parseFloat(row.cpm ?? "0") || 0,
      leads: rowLeads,
      cpl: cplVal,
    };
  });

  const avgCpl =
    campaignRowsRaw.filter((c) => c.cpl != null).length > 0
      ? campaignRowsRaw.reduce((s, c) => s + (c.cpl ?? 0), 0) /
        campaignRowsRaw.filter((c) => c.cpl != null).length
      : cpl;

  const campaignRows = campaignRowsRaw.map((row) => {
    const quality = classifyCampaign(row, avgCpl);
    return {
      ...row,
      quality,
      recommendationKey: `quality.${quality}`,
    };
  });

  const adRows = adInsights.map((row) => {
    const rowLeads = countLeadsFromActions(row.actions);
    const rowSpend = parseFloat(row.spend ?? "0") || 0;
    const metaAdId = row.ad_id ?? "";
    const metaCampaignId = row.campaign_id ?? "";
    const metaAdSetId = row.adset_id ?? "";
    const dbAd = adMap.get(metaAdId);
    const dbCampaign = campaignMap.get(metaCampaignId);
    const dbAdSet = adSetMap.get(metaAdSetId);
    const adRow = {
      id: dbAd?.id ?? metaAdId,
      metaAdId,
      metaCampaignId,
      metaAdSetId,
      name: displayEntityName(dbAd?.name, metaAdId, "unnamed_ad"),
      campaignName: displayEntityName(
        dbCampaign?.name,
        metaCampaignId,
        "unnamed_campaign"
      ),
      adSetName: displayEntityName(dbAdSet?.name, metaAdSetId, "unnamed_adset"),
      status: dbAd?.effectiveStatus ?? dbAd?.status ?? "—",
      spend: rowSpend,
      impressions: parseInt(row.impressions ?? "0", 10) || 0,
      clicks: parseInt(row.clicks ?? "0", 10) || 0,
      ctr: parseFloat(row.ctr ?? "0") || 0,
      cpm: parseFloat(row.cpm ?? "0") || 0,
      leads: rowLeads,
      cpl: rowLeads > 0 ? rowSpend / rowLeads : null,
    };
    const quality = classifyAdFilter(adRow, avgCpl);
    return { ...adRow, quality, recommendationKey: `quality.${quality}` };
  });

  const charts = {
    spendByDay: dailyInsights.map((d) => ({
      date: d.date_start ?? "",
      value: parseFloat(d.spend ?? "0") || 0,
    })),
    leadsByDay: dailyInsights.map((d) => ({
      date: d.date_start ?? "",
      value: countLeadsFromActions(d.actions),
    })),
    cplByDay: dailyInsights.map((d) => {
      const spend = parseFloat(d.spend ?? "0") || 0;
      const leads = countLeadsFromActions(d.actions);
      return {
        date: d.date_start ?? "",
        value: leads > 0 ? spend / leads : 0,
      };
    }),
    ctrByDay: dailyInsights.map((d) => ({
      date: d.date_start ?? "",
      value: parseFloat(d.ctr ?? "0") || 0,
    })),
  };

  const leadMatchRate =
    current.metaLeads > 0
      ? Math.round((leadBridgeLeads / current.metaLeads) * 100)
      : leadBridgeLeads > 0
      ? 100
      : null;

  const webhookOk = connectedPages > 0 && !!lastWebhook;
  const telegramOk = telegram?.status === "connected";

  const comparison: Record<string, MetricComparison> = {
    spend: compareMetric(current.spend, previous.spend, "spend"),
    metaLeads: compareMetric(current.metaLeads, previous.metaLeads, "leads"),
    leadBridgeLeads: compareMetric(leadBridgeLeads, 0, "leads"),
    cpl: compareMetric(cpl ?? 0, prevCpl ?? 0, "cpl"),
    ctr: compareMetric(current.ctr, previous.ctr, "ctr"),
    cpm: compareMetric(current.cpm, previous.cpm, "cpm"),
    clicks: compareMetric(current.clicks, previous.clicks, "clicks"),
    conversion: compareMetric(current.conversion, 0, "conversion"),
  };

  const recommendations = buildAdAuditRecommendations({
    currency: account.currency ?? "",
    summary: {
      spend: current.spend,
      metaLeads: current.metaLeads,
      leadBridgeLeads,
      cpl,
      ctr: current.ctr,
    },
    campaigns: campaignRows,
    ads: adRows,
    health: {
      webhookOk,
      telegramOk,
      enabledForms,
      connectedPages,
      leadMatchRate,
    },
    avgCpl,
  });

  const grantedScopes = Array.isArray(fbConnection?.grantedScopes)
    ? (fbConnection.grantedScopes as string[])
    : [];
  const hasAdsRead = grantedScopes.includes("ads_read");
  const metaApiOk = fbConnection?.status === "connected" && hasAdsRead;
  const leadDeliveryOk =
    webhookOk && telegramOk && (leadMatchRate == null || leadMatchRate >= 70);

  const adsWithZeroLeads = adRows.filter((a) => a.spend > 0 && a.leads === 0).length;

  const marketingScore = calculateMarketingScore({
    ctr: current.ctr,
    cpl,
    avgCpl,
    webhookOk,
    matchRate: leadMatchRate,
    telegramOk,
    metaLeads: current.metaLeads,
    leadBridgeLeads,
    metaApiOk,
    adsWithZeroLeads,
    spend: current.spend,
  });

  const mainInsight = buildMainInsight({
    periodId: resolved.id,
    metaLeads: current.metaLeads,
    leadBridgeLeads,
    cplComparison: comparison.cpl,
    campaigns: campaignRows.map((c) => ({
      name: c.name,
      leads: c.leads,
      cpl: c.cpl,
      quality: c.quality,
      spend: c.spend,
    })),
    avgCpl,
    currency: account.currency ?? "",
  });

  const systemHealth = buildSystemHealth({
    metaApiOk,
    webhookOk,
    telegramOk,
    leadDeliveryOk,
    oauthOk: fbConnection?.status === "connected",
  });

  const healthHistory = await computeHealthHistory(userId, prisma);

  const lastErrorAt =
    fbConnection?.lastErrorAt?.toISOString() ??
    telegram?.lastErrorAt?.toISOString() ??
    null;
  const lastErrorMessage =
    fbConnection?.lastError ?? telegram?.lastError ?? null;

  await prisma.metaInsightSnapshot.create({
    data: {
      userId,
      adAccountDbId: account.id,
      dateStart: new Date(resolved.since),
      dateStop: new Date(resolved.until),
      spend: current.spend,
      impressions: current.impressions,
      reach: current.reach,
      clicks: current.clicks,
      ctr: current.ctr,
      cpc: current.cpc,
      cpm: current.cpm,
      leads: current.metaLeads,
      cpl,
    },
  });

  return {
    period: {
      id: resolved.id,
      since: resolved.since,
      until: resolved.until,
      labelKey: resolved.labelKey,
      previousSince: resolved.previousSince,
      previousUntil: resolved.previousUntil,
      allTimeNote: resolved.id === "all_time" ? "all_time_limit" : null,
    },
    adAccount: {
      id: account.id,
      metaAdAccountId: account.metaAdAccountId,
      name: account.name,
      currency: account.currency,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    },
    summary: {
      spend: current.spend,
      metaLeads: current.metaLeads,
      leadBridgeLeads,
      leads: Math.max(current.metaLeads, leadBridgeLeads),
      cpl,
      ctr: current.ctr,
      cpm: current.cpm,
      cpc: current.cpc,
      impressions: current.impressions,
      reach: current.reach,
      clicks: current.clicks,
      conversion: current.conversion,
    },
    comparison,
    leadSync: {
      metaLeads: current.metaLeads,
      leadBridgeLeads,
      matchRate: leadMatchRate,
      status:
        leadMatchRate == null
          ? "unknown"
          : leadMatchRate >= 90
          ? "good"
          : leadMatchRate >= 70
          ? "warning"
          : "critical",
    },
    campaigns: campaignRows,
    ads: adRows,
    charts,
    recommendations,
    marketingScore,
    mainInsight,
    systemHealth,
    healthHistory,
    activity: {
      lastLeadAt: lastLead?.createdTime.toISOString() ?? null,
      lastLeadName: lastLead?.name ?? null,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      lastWebhookAt: lastWebhook?.createdAt.toISOString() ?? null,
      lastErrorAt,
      lastErrorMessage,
    },
    health: {
      webhook: {
        ok: webhookOk,
        lastEventAt: lastWebhook?.createdAt.toISOString() ?? null,
        connectedPages,
      },
      telegram: {
        ok: telegramOk,
        status: telegram?.status ?? "disconnected",
      },
      lastLeadAt: lastLead?.createdTime.toISOString() ?? null,
      enabledForms,
      hasAdsRead,
      facebookConnected: fbConnection?.status === "connected",
    },
    emptyState:
      campaignRows.length === 0 && current.spend === 0
        ? "no_data_period"
        : null,
    admin: options.isAdmin
      ? {
          metaAdAccountId: account.metaAdAccountId,
          lastSyncedAt: account.lastSyncedAt?.toISOString(),
          grantedScopes,
          insightRows: {
            account: accountInsights.length,
            campaigns: campaignInsights.length,
            ads: adInsights.length,
          },
        }
      : null,
  };
}

export type { AdAuditRecommendation, CampaignQuality, MetricComparison };
