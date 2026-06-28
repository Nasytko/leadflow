import { prisma } from "@/lib/prisma";
import { META_GRAPH_API_BASE } from "@/lib/facebook-graph-config";
import { parseGraphApiError } from "@/lib/facebook-errors";
import { getDecryptedUserToken } from "@/services/facebook.service";

const GRAPH = META_GRAPH_API_BASE;

type Paging = { cursors?: { after?: string }; next?: string };

async function graphFetch<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${GRAPH}${path}${separator}access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw parseGraphApiError(await res.text());
  }
  return res.json();
}

async function graphFetchAll<T extends { id: string }>(
  basePath: string,
  accessToken: string
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;
  do {
    let path = basePath;
    if (after) path += `${basePath.includes("?") ? "&" : "?"}after=${after}`;
    const response = await graphFetch<{ data: T[]; paging?: Paging }>(
      path,
      accessToken
    );
    all.push(...(response.data ?? []));
    after = response.paging?.cursors?.after;
  } while (after);
  return all;
}

export function normalizeAdAccountId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

export function stripActPrefix(id: string): string {
  return id.replace(/^act_/, "");
}

type GraphAdAccount = {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  amount_spent?: string;
  balance?: string;
  business?: { id: string; name?: string };
};

type GraphCampaign = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  created_time?: string;
  updated_time?: string;
};

type GraphAdSet = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  optimization_goal?: string;
  billing_event?: string;
  campaign_id?: string;
  created_time?: string;
  updated_time?: string;
};

type GraphAd = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
  adset_id?: string;
  creative?: { id?: string };
  created_time?: string;
  updated_time?: string;
};

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

export function countLeadsFromActions(actions?: InsightAction[]): number {
  if (!actions?.length) return 0;
  const leadTypes = new Set([
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
    "leadgen_grouped",
  ]);
  let total = 0;
  for (const a of actions) {
    if (leadTypes.has(a.action_type)) {
      total += parseInt(a.value, 10) || 0;
    }
  }
  return total;
}

function parseMetaTime(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getUserAdAccountsFromGraph(accessToken: string) {
  return graphFetchAll<GraphAdAccount>(
    "/me/adaccounts?fields=id,name,account_status,currency,timezone_name,business{id,name},amount_spent,balance&limit=100",
    accessToken
  );
}

export async function syncUserAdAccounts(userId: string) {
  const conn = await prisma.facebookConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error("Facebook not connected");

  const token = await getDecryptedUserToken(userId);
  if (!token) throw new Error("Facebook token invalid");

  const accounts = await getUserAdAccountsFromGraph(token);
  const now = new Date();
  let synced = 0;

  for (const account of accounts) {
    const metaId = normalizeAdAccountId(account.id);
    let businessDbId: string | null = null;
    if (account.business?.id) {
      const biz = await prisma.facebookBusiness.findUnique({
        where: {
          userId_businessId: { userId, businessId: account.business.id },
        },
      });
      businessDbId = biz?.id ?? null;
    }

    await prisma.metaAdAccount.upsert({
      where: {
        userId_metaAdAccountId: { userId, metaAdAccountId: metaId },
      },
      create: {
        userId,
        connectionId: conn.id,
        businessDbId,
        metaAdAccountId: metaId,
        name: account.name,
        accountStatus: account.account_status ?? null,
        currency: account.currency ?? null,
        timezoneName: account.timezone_name ?? null,
        businessName: account.business?.name ?? null,
        amountSpent: account.amount_spent ?? null,
        balance: account.balance ?? null,
        lastSyncedAt: now,
      },
      update: {
        connectionId: conn.id,
        businessDbId,
        name: account.name,
        accountStatus: account.account_status ?? null,
        currency: account.currency ?? null,
        timezoneName: account.timezone_name ?? null,
        businessName: account.business?.name ?? null,
        amountSpent: account.amount_spent ?? null,
        balance: account.balance ?? null,
        lastSyncedAt: now,
      },
    });
    synced++;
  }

  return { synced, accounts };
}

export async function syncAdAccountCampaigns(userId: string, adAccountDbId: string) {
  const account = await prisma.metaAdAccount.findFirst({
    where: { id: adAccountDbId, userId },
  });
  if (!account) throw new Error("Ad account not found");

  const token = await getDecryptedUserToken(userId);
  if (!token) throw new Error("Facebook token invalid");

  const actId = normalizeAdAccountId(account.metaAdAccountId);
  const now = new Date();
  const fields =
    "id,name,status,effective_status,objective,created_time,updated_time";

  const [campaigns, adSets, ads] = await Promise.all([
    graphFetchAll<GraphCampaign>(
      `/${actId}/campaigns?fields=${fields}&limit=100`,
      token
    ),
    graphFetchAll<GraphAdSet>(
      `/${actId}/adsets?fields=${fields},optimization_goal,billing_event,campaign_id&limit=100`,
      token
    ),
    graphFetchAll<GraphAd>(
      `/${actId}/ads?fields=${fields},campaign_id,adset_id,creative{id}&limit=100`,
      token
    ),
  ]);

  const campaignIdMap = new Map<string, string>();

  for (const c of campaigns) {
    const row = await prisma.metaCampaign.upsert({
      where: {
        adAccountDbId_metaCampaignId: {
          adAccountDbId: account.id,
          metaCampaignId: c.id,
        },
      },
      create: {
        userId,
        adAccountDbId: account.id,
        metaCampaignId: c.id,
        name: c.name,
        objective: c.objective ?? null,
        status: c.status ?? null,
        effectiveStatus: c.effective_status ?? null,
        createdTime: parseMetaTime(c.created_time),
        updatedTime: parseMetaTime(c.updated_time),
        lastSyncedAt: now,
      },
      update: {
        name: c.name,
        objective: c.objective ?? null,
        status: c.status ?? null,
        effectiveStatus: c.effective_status ?? null,
        createdTime: parseMetaTime(c.created_time),
        updatedTime: parseMetaTime(c.updated_time),
        lastSyncedAt: now,
      },
    });
    campaignIdMap.set(c.id, row.id);
  }

  const adSetIdMap = new Map<string, string>();

  for (const s of adSets) {
    const campaignDbId = s.campaign_id
      ? campaignIdMap.get(s.campaign_id) ?? null
      : null;
    const row = await prisma.metaAdSet.upsert({
      where: {
        adAccountDbId_metaAdSetId: {
          adAccountDbId: account.id,
          metaAdSetId: s.id,
        },
      },
      create: {
        userId,
        adAccountDbId: account.id,
        campaignDbId,
        metaAdSetId: s.id,
        name: s.name,
        status: s.status ?? null,
        effectiveStatus: s.effective_status ?? null,
        optimizationGoal: s.optimization_goal ?? null,
        billingEvent: s.billing_event ?? null,
        createdTime: parseMetaTime(s.created_time),
        updatedTime: parseMetaTime(s.updated_time),
        lastSyncedAt: now,
      },
      update: {
        campaignDbId,
        name: s.name,
        status: s.status ?? null,
        effectiveStatus: s.effective_status ?? null,
        optimizationGoal: s.optimization_goal ?? null,
        billingEvent: s.billing_event ?? null,
        createdTime: parseMetaTime(s.created_time),
        updatedTime: parseMetaTime(s.updated_time),
        lastSyncedAt: now,
      },
    });
    adSetIdMap.set(s.id, row.id);
  }

  for (const a of ads) {
    const campaignDbId = a.campaign_id
      ? campaignIdMap.get(a.campaign_id) ?? null
      : null;
    const adSetDbId = a.adset_id ? adSetIdMap.get(a.adset_id) ?? null : null;
    await prisma.metaAd.upsert({
      where: {
        adAccountDbId_metaAdId: {
          adAccountDbId: account.id,
          metaAdId: a.id,
        },
      },
      create: {
        userId,
        adAccountDbId: account.id,
        campaignDbId,
        adSetDbId,
        metaAdId: a.id,
        name: a.name,
        status: a.status ?? null,
        effectiveStatus: a.effective_status ?? null,
        creativeId: a.creative?.id ?? null,
        createdTime: parseMetaTime(a.created_time),
        updatedTime: parseMetaTime(a.updated_time),
        lastSyncedAt: now,
      },
      update: {
        campaignDbId,
        adSetDbId,
        name: a.name,
        status: a.status ?? null,
        effectiveStatus: a.effective_status ?? null,
        creativeId: a.creative?.id ?? null,
        createdTime: parseMetaTime(a.created_time),
        updatedTime: parseMetaTime(a.updated_time),
        lastSyncedAt: now,
      },
    });
  }

  return {
    campaigns: campaigns.length,
    adSets: adSets.length,
    ads: ads.length,
  };
}

export type AdAuditPeriod = "last_7d" | "last_30d" | "custom";

export type AdAuditWarning = {
  code: string;
  severity: "warning" | "error";
  message: string;
};

export async function runAdAudit(
  userId: string,
  adAccountDbId: string,
  options: {
    period?: AdAuditPeriod;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const account = await prisma.metaAdAccount.findFirst({
    where: { id: adAccountDbId, userId },
  });
  if (!account) throw new Error("Ad account not found");

  const token = await getDecryptedUserToken(userId);
  if (!token) throw new Error("Facebook token invalid");

  const period = options.period ?? "last_7d";
  const actId = normalizeAdAccountId(account.metaAdAccountId);
  const insightFields =
    "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,campaign_id,adset_id,ad_id,date_start,date_stop";

  let insightsPath = `/${actId}/insights?fields=${insightFields}&level=ad&limit=500`;
  if (period === "custom" && options.dateFrom && options.dateTo) {
    insightsPath += `&time_range={"since":"${options.dateFrom}","until":"${options.dateTo}"}`;
  } else {
    insightsPath += `&date_preset=${period}`;
  }

  const [accountInsights, campaignInsights, adInsights, localLeads, campaigns, telegram, enabledForms, connectedPages] =
    await Promise.all([
      graphFetch<{ data: GraphInsight[] }>(
        `/${actId}/insights?fields=${insightFields}&date_preset=${period === "custom" ? "last_7d" : period}`,
        token
      ).catch(() => ({ data: [] as GraphInsight[] })),
      graphFetch<{ data: GraphInsight[] }>(
        `/${actId}/insights?fields=${insightFields}&level=campaign&limit=200&date_preset=${period === "custom" ? "last_7d" : period}`,
        token
      ).catch(() => ({ data: [] as GraphInsight[] })),
      graphFetch<{ data: GraphInsight[] }>(insightsPath, token).catch(() => ({
        data: [] as GraphInsight[],
      })),
      prisma.lead.count({
        where: {
          userId,
          adAccountDbId: account.id,
          createdTime: periodRangeFilter(period, options),
        },
      }),
      prisma.metaCampaign.findMany({
        where: { adAccountDbId: account.id, userId },
        orderBy: { name: "asc" },
      }),
      prisma.telegramConnection.findUnique({ where: { userId } }),
      prisma.facebookForm.count({
        where: { enabled: true, page: { userId, connected: true } },
      }),
      prisma.facebookPage.count({ where: { userId, connected: true } }),
    ]);

  const summaryRow = accountInsights.data?.[0];
  const spend = parseFloat(summaryRow?.spend ?? "0") || 0;
  const impressions = parseInt(summaryRow?.impressions ?? "0", 10) || 0;
  const reach = parseInt(summaryRow?.reach ?? "0", 10) || 0;
  const clicks = parseInt(summaryRow?.clicks ?? "0", 10) || 0;
  const ctr = parseFloat(summaryRow?.ctr ?? "0") || 0;
  const cpc = parseFloat(summaryRow?.cpc ?? "0") || 0;
  const cpm = parseFloat(summaryRow?.cpm ?? "0") || 0;
  const insightLeads = countLeadsFromActions(summaryRow?.actions);
  const leads = Math.max(insightLeads, localLeads);
  const cpl = leads > 0 ? spend / leads : null;

  const dateStart = summaryRow?.date_start
    ? new Date(summaryRow.date_start)
    : new Date();
  const dateStop = summaryRow?.date_stop
    ? new Date(summaryRow.date_stop)
    : new Date();

  await prisma.metaInsightSnapshot.create({
    data: {
      userId,
      adAccountDbId: account.id,
      dateStart,
      dateStop,
      spend,
      impressions,
      reach,
      clicks,
      ctr,
      cpc,
      cpm,
      leads,
      cpl,
    },
  });

  const campaignRows = (campaignInsights.data ?? []).map((row) => {
    const rowLeads = countLeadsFromActions(row.actions);
    const rowSpend = parseFloat(row.spend ?? "0") || 0;
    const metaCampaignId = row.campaign_id ?? "";
    const campaign = campaigns.find((c) => c.metaCampaignId === metaCampaignId);
    return {
      metaCampaignId,
      name: campaign?.name ?? metaCampaignId,
      spend: rowSpend,
      impressions: parseInt(row.impressions ?? "0", 10) || 0,
      clicks: parseInt(row.clicks ?? "0", 10) || 0,
      ctr: parseFloat(row.ctr ?? "0") || 0,
      leads: rowLeads,
      cpl: rowLeads > 0 ? rowSpend / rowLeads : null,
    };
  });

  const adRows = (adInsights.data ?? []).map((row) => {
    const rowLeads = countLeadsFromActions(row.actions);
    const rowSpend = parseFloat(row.spend ?? "0") || 0;
    return {
      metaAdId: row.ad_id ?? "",
      metaCampaignId: row.campaign_id ?? "",
      metaAdSetId: row.adset_id ?? "",
      spend: rowSpend,
      impressions: parseInt(row.impressions ?? "0", 10) || 0,
      clicks: parseInt(row.clicks ?? "0", 10) || 0,
      ctr: parseFloat(row.ctr ?? "0") || 0,
      leads: rowLeads,
      cpl: rowLeads > 0 ? rowSpend / rowLeads : null,
    };
  });

  const warnings: AdAuditWarning[] = [];

  if (spend > 0 && leads === 0) {
    warnings.push({
      code: "spend_without_leads",
      severity: "warning",
      message: "spend_without_leads",
    });
  }
  if (cpl != null && cpl > 50) {
    warnings.push({
      code: "high_cpl",
      severity: "warning",
      message: "high_cpl",
    });
  }
  if (ctr > 0 && ctr < 0.5) {
    warnings.push({
      code: "low_ctr",
      severity: "warning",
      message: "low_ctr",
    });
  }
  if (leads > 0 && enabledForms === 0) {
    warnings.push({
      code: "leads_without_forms",
      severity: "error",
      message: "leads_without_forms",
    });
  }
  if (connectedPages === 0) {
    warnings.push({
      code: "webhook_not_connected",
      severity: "error",
      message: "webhook_not_connected",
    });
  }
  if (!telegram || telegram.status !== "connected") {
    warnings.push({
      code: "telegram_not_connected",
      severity: "warning",
      message: "telegram_not_connected",
    });
  }

  return {
    adAccount: {
      id: account.id,
      metaAdAccountId: account.metaAdAccountId,
      name: account.name,
      currency: account.currency,
    },
    period,
    summary: { spend, leads, cpl, ctr, cpm, cpc, impressions, reach, clicks },
    campaigns: campaignRows,
    ads: adRows,
    warnings,
  };
}

function periodRangeFilter(
  period: AdAuditPeriod,
  options: { dateFrom?: string; dateTo?: string }
) {
  const now = new Date();
  if (period === "custom" && options.dateFrom) {
    return { gte: new Date(options.dateFrom) };
  }
  const days = period === "last_30d" ? 30 : 7;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { gte: from };
}

export function mapMetaAdAccountPublic(account: {
  id: string;
  metaAdAccountId: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  timezoneName: string | null;
  businessName: string | null;
  amountSpent: string | null;
  balance: string | null;
  lastSyncedAt: Date | null;
  business?: { name: string; businessId: string } | null;
}) {
  return {
    id: account.id,
    metaAdAccountId: account.metaAdAccountId,
    name: account.name,
    accountStatus: account.accountStatus,
    currency: account.currency,
    timezoneName: account.timezoneName,
    businessName:
      account.businessName ?? account.business?.name ?? null,
    businessId: account.business?.businessId ?? null,
    amountSpent: account.amountSpent,
    balance: account.balance,
    lastSyncedAt: account.lastSyncedAt,
  };
}

/** Link lead attribution to local Meta/Page/Business entities when possible. */
export async function resolveLeadAttributionLinks(
  userId: string,
  input: {
    campaignId?: string | null;
    adsetId?: string | null;
    adId?: string | null;
    pageDbId?: string | null;
    businessDbId?: string | null;
    adAccountDbId?: string | null;
  }
) {
  const [campaign, adSet, ad] = await Promise.all([
    input.campaignId
      ? prisma.metaCampaign.findFirst({
          where: { userId, metaCampaignId: input.campaignId },
        })
      : null,
    input.adsetId
      ? prisma.metaAdSet.findFirst({
          where: { userId, metaAdSetId: input.adsetId },
        })
      : null,
    input.adId
      ? prisma.metaAd.findFirst({
          where: { userId, metaAdId: input.adId },
        })
      : null,
  ]);

  let adAccountDbId = input.adAccountDbId ?? null;
  if (!adAccountDbId && campaign?.adAccountDbId) {
    adAccountDbId = campaign.adAccountDbId;
  }
  if (!adAccountDbId && ad?.adAccountDbId) {
    adAccountDbId = ad.adAccountDbId;
  }

  return {
    adAccountDbId,
    campaignDbId: campaign?.id ?? null,
    adSetDbId: adSet?.id ?? null,
    adDbId: ad?.id ?? null,
    pageDbId: input.pageDbId ?? null,
    businessDbId: input.businessDbId ?? null,
  };
}
