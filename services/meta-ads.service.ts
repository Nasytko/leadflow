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

export type AdAuditPeriod = import("@/lib/ad-audit-periods").AdAuditPeriodId | "custom";

export type AdAuditWarning = {
  code: string;
  severity: "warning" | "error";
  message: string;
};

export { runAdAudit } from "@/services/ad-audit.service";

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
