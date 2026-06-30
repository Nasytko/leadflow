export type MarketingScoreStatus = "excellent" | "good" | "attention" | "critical";

export type MarketingScoreFactor = {
  id: string;
  status: "positive" | "warning" | "negative";
  messageKey: string;
  messageParams?: Record<string, string | number>;
  weight: number;
  score: number;
};

export type MarketingScore = {
  score: number;
  status: MarketingScoreStatus;
  factors: MarketingScoreFactor[];
};

type ScoreInput = {
  ctr: number;
  cpl: number | null;
  avgCpl: number | null;
  webhookOk: boolean;
  matchRate: number | null;
  telegramOk: boolean;
  metaLeads: number;
  leadBridgeLeads: number;
  metaApiOk: boolean;
  adsWithZeroLeads: number;
  spend: number;
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function ctrScore(ctr: number): { score: number; status: MarketingScoreFactor["status"]; key: string } {
  if (ctr >= 1.5) return { score: 100, status: "positive", key: "scoreCtrExcellent" };
  if (ctr >= 1) return { score: 85, status: "positive", key: "scoreCtrGood" };
  if (ctr >= 0.5) return { score: 60, status: "warning", key: "scoreCtrAverage" };
  if (ctr > 0) return { score: 35, status: "warning", key: "scoreCtrLow" };
  return { score: 50, status: "warning", key: "scoreCtrNoData" };
}

function cplScore(
  cpl: number | null,
  avgCpl: number | null
): { score: number; status: MarketingScoreFactor["status"]; key: string } {
  if (cpl == null || cpl === 0) return { score: 50, status: "warning", key: "scoreCplNoData" };
  if (avgCpl != null && avgCpl > 0) {
    const ratio = cpl / avgCpl;
    if (ratio <= 0.85) return { score: 100, status: "positive", key: "scoreCplBelowAvg" };
    if (ratio <= 1.1) return { score: 75, status: "positive", key: "scoreCplAverage" };
    if (ratio <= 1.3) return { score: 45, status: "warning", key: "scoreCplAboveAvg" };
    return { score: 20, status: "negative", key: "scoreCplHigh" };
  }
  return { score: 70, status: "positive", key: "scoreCplOk" };
}

function statusFromScore(score: number): MarketingScoreStatus {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "attention";
  return "critical";
}

export function calculateMarketingScore(input: ScoreInput): MarketingScore {
  const factors: MarketingScoreFactor[] = [];
  const weights = {
    ctr: 20,
    cpl: 20,
    webhook: 15,
    matchRate: 15,
    telegram: 10,
    leads: 10,
    metaApi: 10,
  };

  const ctr = ctrScore(input.ctr);
  factors.push({
    id: "ctr",
    status: ctr.status,
    messageKey: ctr.key,
    weight: weights.ctr,
    score: ctr.score,
  });

  const cpl = cplScore(input.cpl, input.avgCpl);
  factors.push({
    id: "cpl",
    status: cpl.status,
    messageKey: cpl.key,
    weight: weights.cpl,
    score: cpl.score,
  });

  const webhookScore = input.webhookOk ? 100 : 0;
  factors.push({
    id: "webhook",
    status: input.webhookOk ? "positive" : "negative",
    messageKey: input.webhookOk ? "scoreWebhookOk" : "scoreWebhookIssue",
    weight: weights.webhook,
    score: webhookScore,
  });

  let matchScore = 50;
  let matchStatus: MarketingScoreFactor["status"] = "warning";
  let matchKey = "scoreMatchNoData";
  if (input.matchRate != null) {
    if (input.matchRate >= 95) {
      matchScore = 100;
      matchStatus = "positive";
      matchKey = "scoreMatchExcellent";
    } else if (input.matchRate >= 90) {
      matchScore = 80;
      matchStatus = "positive";
      matchKey = "scoreMatchGood";
    } else if (input.matchRate >= 70) {
      matchScore = 45;
      matchStatus = "warning";
      matchKey = "scoreMatchWarning";
    } else {
      matchScore = 15;
      matchStatus = "negative";
      matchKey = "scoreMatchCritical";
    }
  }
  factors.push({
    id: "matchRate",
    status: matchStatus,
    messageKey: matchKey,
    messageParams: input.matchRate != null ? { rate: input.matchRate } : undefined,
    weight: weights.matchRate,
    score: matchScore,
  });

  const telegramScore = input.telegramOk ? 100 : 0;
  factors.push({
    id: "telegram",
    status: input.telegramOk ? "positive" : "negative",
    messageKey: input.telegramOk ? "scoreTelegramOk" : "scoreTelegramIssue",
    weight: weights.telegram,
    score: telegramScore,
  });

  const hasLeads = input.metaLeads > 0 || input.leadBridgeLeads > 0;
  factors.push({
    id: "leads",
    status: hasLeads ? "positive" : "warning",
    messageKey: hasLeads ? "scoreLeadsOk" : "scoreLeadsNone",
    messageParams: hasLeads
      ? { count: Math.max(input.metaLeads, input.leadBridgeLeads) }
      : undefined,
    weight: weights.leads,
    score: hasLeads ? 100 : 20,
  });

  factors.push({
    id: "metaApi",
    status: input.metaApiOk ? "positive" : "negative",
    messageKey: input.metaApiOk ? "scoreMetaOk" : "scoreMetaIssue",
    weight: weights.metaApi,
    score: input.metaApiOk ? 100 : 0,
  });

  if (input.adsWithZeroLeads > 0 && input.spend > 0) {
    factors.push({
      id: "zeroLeadAds",
      status: "warning",
      messageKey: "scoreZeroLeadAds",
      messageParams: { count: input.adsWithZeroLeads },
      weight: 0,
      score: 0,
    });
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = factors
    .filter((f) => f.weight > 0)
    .reduce((sum, f) => sum + (f.score * f.weight) / totalWeight, 0);

  return {
    score: clamp(Math.round(weighted)),
    status: statusFromScore(weighted),
    factors,
  };
}
