export type CampaignQuality =
  | "effective"
  | "attention"
  | "wasting"
  | "insufficient";

export type RecommendationSeverity = "info" | "warning" | "critical" | "success";
export type RecommendationCategory =
  | "budget"
  | "creative"
  | "webhook"
  | "forms"
  | "leads"
  | "telegram";

export type AdAuditRecommendation = {
  id: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  actionLabelKey?: string;
  actionHref?: string;
};

export type MetricComparison = {
  current: number;
  previous: number;
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
  phraseKey: string;
  phraseParams?: Record<string, string | number>;
};

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function compareMetric(
  current: number,
  previous: number,
  metric: "spend" | "leads" | "cpl" | "ctr" | "cpm" | "clicks" | "conversion"
): MetricComparison {
  const deltaPct = pctChange(current, previous);
  const direction =
    deltaPct == null || deltaPct === 0
      ? "flat"
      : deltaPct > 0
      ? "up"
      : "down";

  return {
    current,
    previous,
    deltaPct,
    direction,
    phraseKey: `comparison.${metric}`,
    phraseParams:
      deltaPct != null
        ? { value: Math.abs(deltaPct) }
        : undefined,
  };
}

export function classifyCampaign(
  row: {
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
    impressions: number;
  },
  avgCpl: number | null
): CampaignQuality {
  if (row.spend < 3 && row.impressions < 300) return "insufficient";
  if (row.spend > 0 && row.leads === 0) return "wasting";
  if (row.ctr > 0 && row.ctr < 0.5) return "attention";
  if (
    row.leads > 0 &&
    avgCpl != null &&
    row.cpl != null &&
    row.cpl <= avgCpl * 0.9
  ) {
    return "effective";
  }
  if (
    row.leads > 0 &&
    avgCpl != null &&
    row.cpl != null &&
    row.cpl > avgCpl * 1.2
  ) {
    return "attention";
  }
  if (row.leads > 0) return "effective";
  return "insufficient";
}

export function classifyAdFilter(
  row: {
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
  },
  avgCpl: number | null
): CampaignQuality {
  return classifyCampaign({ ...row, impressions: 0 }, avgCpl);
}

export function kpiVariantForMetric(
  metric: string,
  value: number,
  comparison?: Pick<MetricComparison, "direction" | "deltaPct">
): "default" | "success" | "warning" {
  if (metric === "cpl") {
    if (comparison?.direction === "down") return "success";
    if (comparison?.direction === "up") return "warning";
    return "default";
  }
  if (metric === "ctr") {
    if (value >= 1) return "success";
    if (value > 0 && value < 0.5) return "warning";
    return "default";
  }
  if (metric === "leads") {
    if (value > 0 && comparison?.direction === "up") return "success";
    if (comparison?.direction === "down") return "warning";
    return value > 0 ? "success" : "default";
  }
  return "default";
}

type RecommendationContext = {
  currency: string;
  summary: {
    spend: number;
    metaLeads: number;
    leadBridgeLeads: number;
    cpl: number | null;
    ctr: number;
  };
  campaigns: Array<{
    name: string;
    metaCampaignId: string;
    spend: number;
    leads: number;
    cpl: number | null;
    quality: CampaignQuality;
  }>;
  ads: Array<{
    name: string;
    metaAdId: string;
    spend: number;
    leads: number;
    ctr: number;
    quality: CampaignQuality;
  }>;
  health: {
    webhookOk: boolean;
    telegramOk: boolean;
    enabledForms: number;
    connectedPages: number;
    leadMatchRate: number | null;
  };
  avgCpl: number | null;
};

export function buildAdAuditRecommendations(
  ctx: RecommendationContext
): AdAuditRecommendation[] {
  const items: AdAuditRecommendation[] = [];

  const best = ctx.campaigns
    .filter((c) => c.quality === "effective" && c.leads > 0)
    .sort((a, b) => (a.cpl ?? 999) - (b.cpl ?? 999))[0];

  if (best && best.cpl != null && ctx.avgCpl != null && best.cpl <= ctx.avgCpl) {
    items.push({
      id: "campaign_scale",
      severity: "success",
      category: "budget",
      messageKey: "recCampaignScale",
      messageParams: {
        name: best.name,
        cpl: best.cpl.toFixed(2),
        currency: ctx.currency,
      },
      actionLabelKey: "actionViewCampaign",
      actionHref: `/analytics?campaign=${best.metaCampaignId}`,
    });
  }

  const worstAd = ctx.ads
    .filter((a) => a.spend >= 5 && a.leads === 0)
    .sort((a, b) => b.spend - a.spend)[0];

  if (worstAd) {
    items.push({
      id: "ad_zero_leads",
      severity: "critical",
      category: "creative",
      messageKey: "recAdZeroLeads",
      messageParams: {
        name: worstAd.name,
        spend: worstAd.spend.toFixed(2),
        currency: ctx.currency,
      },
      actionLabelKey: "actionViewAd",
      actionHref: `/analytics?ad=${worstAd.metaAdId}`,
    });
  }

  if (ctx.summary.ctr > 0 && ctx.summary.ctr < 1) {
    items.push({
      id: "low_ctr_global",
      severity: "warning",
      category: "creative",
      messageKey: "recLowCtr",
      actionLabelKey: "actionOpenAds",
      actionHref: "/analytics#ads",
    });
  }

  if (
    ctx.summary.metaLeads > 0 &&
    ctx.health.leadMatchRate != null &&
    ctx.health.leadMatchRate < 90
  ) {
    items.push({
      id: "lead_mismatch",
      severity: "warning",
      category: "webhook",
      messageKey: "recLeadMismatch",
      messageParams: {
        leadBridge: ctx.summary.leadBridgeLeads,
        meta: ctx.summary.metaLeads,
      },
      actionLabelKey: "actionCheckWebhook",
      actionHref: "/connections/webhook",
    });
  }

  if (
    ctx.summary.metaLeads === 0 &&
    ctx.summary.leadBridgeLeads === 0 &&
    ctx.summary.spend === 0
  ) {
    items.push({
      id: "no_activity",
      severity: "info",
      category: "leads",
      messageKey: "recNoActivity",
      actionLabelKey: "actionOpenConnect",
      actionHref: "/connections/facebook",
    });
  } else if (ctx.summary.metaLeads === 0 && ctx.summary.leadBridgeLeads === 0) {
    items.push({
      id: "no_leads_period",
      severity: "warning",
      category: "leads",
      messageKey: "recNoLeadsPeriod",
      actionLabelKey: "actionOpenForms",
      actionHref: "/connections/facebook",
    });
  }

  if (!ctx.health.webhookOk) {
    items.push({
      id: "webhook_issue",
      severity: "critical",
      category: "webhook",
      messageKey: "recWebhookIssue",
      actionLabelKey: "actionCheckWebhook",
      actionHref: "/connections/webhook",
    });
  }

  if (!ctx.health.telegramOk) {
    items.push({
      id: "telegram_issue",
      severity: "warning",
      category: "telegram",
      messageKey: "recTelegramIssue",
      actionLabelKey: "actionOpenTelegram",
      actionHref: "/connections/telegram",
    });
  }

  if (ctx.summary.metaLeads > 0 && ctx.health.enabledForms === 0) {
    items.push({
      id: "forms_disabled",
      severity: "critical",
      category: "forms",
      messageKey: "recFormsDisabled",
      actionLabelKey: "actionOpenForms",
      actionHref: "/connections/facebook",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "all_good",
      severity: "success",
      category: "leads",
      messageKey: "recAllGood",
    });
  }

  return items.slice(0, 6);
}

export function displayEntityName(
  name: string | null | undefined,
  id: string,
  fallback: string
): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === id || /^\d+$/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}
