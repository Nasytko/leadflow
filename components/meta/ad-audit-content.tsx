"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdAuditMiniChart } from "@/components/meta/ad-audit-mini-chart";
import { AdAuditDetailSheet } from "@/components/meta/ad-audit-detail-sheet";
import {
  MarketingScoreCard,
  MainInsightCard,
  RoiCard,
  SystemHealthCard,
  MatchRateCard,
  ActivityCard,
  HealthHistoryCard,
} from "@/components/meta/ad-audit-polish";
import { apiFetch } from "@/lib/client-api";
import { formatPeriodRangeLabel } from "@/lib/ad-audit-periods";
import { kpiVariantForMetric } from "@/lib/ad-audit-analytics";
import type { CampaignQuality } from "@/lib/ad-audit-analytics";
import { cn } from "@/lib/utils";
import { safeToastId } from "@/lib/safe-toast-id";

type AdAccount = { id: string; name: string; metaAdAccountId: string; currency: string | null };

type AuditPayload = {
  period: {
    since: string;
    until: string;
    labelKey: string;
    allTimeNote?: string | null;
  };
  adAccount: { id: string; name: string; currency: string | null };
  summary: {
    spend: number;
    metaLeads: number;
    leadBridgeLeads: number;
    cpl: number | null;
    ctr: number;
    cpm: number;
    clicks: number;
    conversion: number;
  };
  comparison: Record<
    string,
    {
      deltaPct: number | null;
      direction: "up" | "down" | "flat";
      phraseKey: string;
      phraseParams?: Record<string, string | number>;
    }
  >;
  leadSync: { metaLeads: number; leadBridgeLeads: number; matchRate: number | null; status: string };
  campaigns: Array<{
    id: string;
    metaCampaignId: string;
    name: string;
    status: string;
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
    cpm: number;
    impressions: number;
    clicks: number;
    quality: CampaignQuality;
  }>;
  ads: Array<{
    id: string;
    metaAdId: string;
    name: string;
    campaignName: string;
    adSetName: string;
    status: string;
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number;
    cpm: number;
    impressions: number;
    clicks: number;
    quality: CampaignQuality;
  }>;
  charts: {
    spendByDay: Array<{ date: string; value: number }>;
    leadsByDay: Array<{ date: string; value: number }>;
    cplByDay: Array<{ date: string; value: number }>;
    ctrByDay: Array<{ date: string; value: number }>;
  };
  recommendations: Array<{
    id: string;
    severity: string;
    messageKey: string;
    messageParams?: Record<string, string | number>;
    actionLabelKey?: string;
    actionHref?: string;
  }>;
  health: {
    webhook: { ok: boolean; lastEventAt: string | null };
    telegram: { ok: boolean };
    lastLeadAt: string | null;
    hasAdsRead: boolean;
    facebookConnected: boolean;
  };
  emptyState: string | null;
  marketingScore?: {
    score: number;
    status: "excellent" | "good" | "attention" | "critical";
    factors: Array<{
      id: string;
      status: "positive" | "warning" | "negative";
      messageKey: string;
      messageParams?: Record<string, string | number>;
    }>;
  };
  mainInsight?: {
    bullets: Array<{
      id: string;
      tone: "positive" | "neutral" | "warning";
      messageKey: string;
      messageParams?: Record<string, string | number>;
    }>;
    headlineKey: string;
    headlineParams?: Record<string, string | number>;
  };
  systemHealth?: {
    items: Array<{ id: string; labelKey: string; ok: boolean }>;
    overallOk: boolean;
  };
  healthHistory?: {
    periodDays: number;
    webhook: { uptimePct: number };
    meta: { uptimePct: number };
    telegram: { uptimePct: number };
    errors: number;
  };
  activity?: {
    lastLeadAt: string | null;
    lastSyncedAt: string | null;
    lastErrorAt: string | null;
    lastErrorMessage: string | null;
  };
  admin?: Record<string, unknown> | null;
};

const PERIODS = [
  "today",
  "yesterday",
  "last_7d",
  "last_30d",
  "this_month",
  "last_month",
  "all_time",
  "custom",
] as const;

const AD_FILTERS = ["all", "effective", "wasting", "no_leads", "low_ctr", "high_cpl"] as const;

const qualityBadge: Record<CampaignQuality, "success" | "warning" | "destructive" | "secondary"> = {
  effective: "success",
  attention: "warning",
  wasting: "destructive",
  insufficient: "secondary",
};

function labelEntityName(name: string, t: (k: string) => string): string {
  if (name === "unnamed_campaign") return t("unnamedCampaign");
  if (name === "unnamed_ad") return t("unnamedAd");
  if (name === "unnamed_adset") return t("unnamedAdSet");
  return name;
}

export function AdAuditContent({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("metaAds");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [period, setPeriod] = useState("last_7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [adFilter, setAdFilter] = useState<(typeof AD_FILTERS)[number]>("all");
  const [detail, setDetail] = useState<Parameters<typeof AdAuditDetailSheet>[0]["entity"]>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    const res = await apiFetch("/api/meta/ad-accounts");
    const data = await res.json();
    const list = (data.data?.accounts ?? []) as AdAccount[];
    setAccounts(list);
    const fromUrl = searchParams.get("adAccountId");
    if (fromUrl && list.some((a) => a.id === fromUrl)) setSelectedId(fromUrl);
    else if (list[0]) setSelectedId(list[0].id);
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const runAudit = useCallback(async () => {
    if (!selectedId) {
      toast.error(t("selectAdAccount"), { id: safeToastId("audit_no_account") });
      return;
    }
    setRunning(true);
    try {
      let url = `/api/meta/ad-audit?adAccountId=${selectedId}&period=${period}`;
      if (period === "custom" && dateFrom && dateTo) {
        url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      }
      const res = await apiFetch(url);
      const data = await res.json();
      if (data.data) setAudit(data.data as AuditPayload);
      else toast.error(data.error?.message ?? t("auditFailed"), { id: safeToastId("audit_failed") });
    } catch {
      toast.error(t("auditFailed"), { id: safeToastId("audit_failed") });
    } finally {
      setRunning(false);
    }
  }, [selectedId, period, dateFrom, dateTo, t]);

  useEffect(() => {
    if (selectedId && !loading) void runAudit();
  }, [selectedId, period, loading]); // eslint-disable-line react-hooks/exhaustive-deps -- run on account/period change

  const periodLabel = audit
    ? formatPeriodRangeLabel(audit.period.since, audit.period.until, locale)
    : "";

  const currency = audit?.adAccount.currency ?? "";

  const filteredAds = useMemo(() => {
    if (!audit) return [];
    const ads = audit.ads;
    const avgCpl =
      ads.filter((a) => a.cpl != null).reduce((s, a) => s + (a.cpl ?? 0), 0) /
        Math.max(1, ads.filter((a) => a.cpl != null).length) || 0;
    switch (adFilter) {
      case "effective":
        return ads.filter((a) => a.quality === "effective");
      case "wasting":
        return ads.filter((a) => a.quality === "wasting");
      case "no_leads":
        return ads.filter((a) => a.leads === 0 && a.spend > 0);
      case "low_ctr":
        return ads.filter((a) => a.ctr > 0 && a.ctr < 0.5);
      case "high_cpl":
        return ads.filter((a) => a.cpl != null && avgCpl > 0 && (a.cpl ?? 0) > avgCpl * 1.2);
      default:
        return ads;
    }
  }, [audit, adFilter]);

  function comparisonPhrase(key: string) {
    const c = audit?.comparison[key];
    if (!c || c.deltaPct == null) return undefined;
    try {
      return t(c.phraseKey as "comparison.spend", c.phraseParams as Record<string, string>);
    } catch {
      return undefined;
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState icon={BarChart3} title={t("emptyNoAccounts")} description={t("emptyNoAccountsDesc")}>
        <Button asChild>
          <Link href="/meta/ad-accounts">{t("goAdAccounts")}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-[#1877F2]" />
            {t("auditTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("auditSubtitle")}</p>
          <p className="text-xs text-muted-foreground mt-2">{t("auditPositioning")}</p>
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("auditFilters")}</CardTitle>
          {periodLabel && (
            <CardDescription>
              {t("dataForPeriod")}: <strong>{periodLabel}</strong>
              {audit?.period.allTimeNote && (
                <span className="block text-xs mt-1">{t("allTimeNote")}</span>
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">{t("selectAdAccount")}</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("periodLabel")}</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`period.${p}` as "period.last_7d")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </>
          )}
          <Button onClick={() => void runAudit()} disabled={running || !selectedId}>
            <RefreshCw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
            {running ? t("auditRunning") : t("runAudit")}
          </Button>
        </CardContent>
      </Card>

      {audit && !audit.health.hasAdsRead && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("emptyNoAdsRead")}
        </div>
      )}

      {audit?.emptyState === "no_data_period" && (
        <EmptyState icon={BarChart3} title={t("emptyNoData")} description={t("emptyNoDataDesc")} />
      )}

      {audit && audit.summary && (
        <>
          {audit.marketingScore && <MarketingScoreCard data={audit.marketingScore} />}

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label={t("kpiSpend")}
              value={`${audit.summary.spend.toFixed(2)} ${currency}`}
              sublabel={comparisonPhrase("spend")}
              variant={kpiVariantForMetric("spend", audit.summary.spend, audit.comparison.spend)}
              icon={TrendingUp}
            />
            <KpiCard
              label={t("kpiMetaLeads")}
              value={String(audit.summary.metaLeads)}
              sublabel={comparisonPhrase("metaLeads")}
              variant={kpiVariantForMetric("leads", audit.summary.metaLeads, audit.comparison.metaLeads)}
            />
            <KpiCard
              label={t("kpiLeadBridgeLeads")}
              value={String(audit.summary.leadBridgeLeads)}
              sublabel={t("kpiLeadBridgeHint")}
              variant={audit.summary.leadBridgeLeads > 0 ? "success" : "default"}
            />
            <KpiCard
              label={t("kpiCpl")}
              value={audit.summary.cpl != null ? `${audit.summary.cpl.toFixed(2)} ${currency}` : "—"}
              sublabel={t("kpiCplHint")}
              variant={kpiVariantForMetric("cpl", audit.summary.cpl ?? 0, audit.comparison.cpl)}
            />
            <KpiCard
              label={t("kpiCtr")}
              value={`${audit.summary.ctr.toFixed(2)}%`}
              sublabel={t("kpiCtrHint")}
              variant={kpiVariantForMetric("ctr", audit.summary.ctr, audit.comparison.ctr)}
            />
            <KpiCard label={t("kpiCpm")} value={`${audit.summary.cpm.toFixed(2)} ${currency}`} sublabel={t("kpiCpmHint")} />
            <KpiCard label={t("kpiClicks")} value={String(audit.summary.clicks)} sublabel={comparisonPhrase("clicks")} />
            <KpiCard
              label={t("kpiConversion")}
              value={`${audit.summary.conversion.toFixed(2)}%`}
              sublabel={t("kpiConversionHint")}
            />
            <KpiCard
              label={t("kpiWebhook")}
              value={audit.health.webhook.ok ? t("webhookOk") : t("webhookIssue")}
              sublabel={audit.health.lastLeadAt ? t("lastLeadAgo") : t("noLeadsYet")}
              variant={audit.health.webhook.ok ? "success" : "warning"}
              icon={Webhook}
            />
          </div>

          {audit.mainInsight && (
            <MainInsightCard data={audit.mainInsight} periodLabel={periodLabel} />
          )}

          <RoiCard
            spend={audit.summary.spend}
            leads={Math.max(audit.summary.metaLeads, audit.summary.leadBridgeLeads)}
            currency={currency}
            adAccountId={selectedId}
          />

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {audit.systemHealth && <SystemHealthCard data={audit.systemHealth} />}
            <MatchRateCard data={audit.leadSync} />
            {audit.activity && <ActivityCard data={audit.activity} locale={locale} />}
          </div>

          {audit.healthHistory && <HealthHistoryCard data={audit.healthHistory} />}

          <div className="grid gap-3 md:grid-cols-2">
            <AdAuditMiniChart title={t("chartSpend")} data={audit.charts.spendByDay} emptyLabel={t("chartEmpty")} />
            <AdAuditMiniChart title={t("chartLeads")} data={audit.charts.leadsByDay} emptyLabel={t("chartEmpty")} color="#10b981" />
            <AdAuditMiniChart
              title={t("chartCpl")}
              data={audit.charts.cplByDay}
              emptyLabel={t("chartEmpty")}
              formatValue={(v) => v.toFixed(2)}
            />
            <AdAuditMiniChart
              title={t("chartCtr")}
              data={audit.charts.ctrByDay}
              emptyLabel={t("chartEmpty")}
              formatValue={(v) => `${v.toFixed(2)}%`}
              color="#f59e0b"
            />
          </div>

          {audit.recommendations.length > 0 && (
            <Card className="rounded-2xl border-primary/20">
              <CardHeader>
                <CardTitle>{t("recommendationsTitle")}</CardTitle>
                <CardDescription>{t("recommendationsSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {audit.recommendations.map((rec, i) => (
                  <div
                    key={rec.id}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2",
                      rec.severity === "critical" && "border-destructive/40 bg-destructive/5",
                      rec.severity === "warning" && "border-amber-500/40 bg-amber-500/5",
                      rec.severity === "success" && "border-emerald-500/40 bg-emerald-500/5"
                    )}
                  >
                    <span>
                      <span className="font-medium mr-2">{i + 1}.</span>
                      {t(`recommendations.${rec.messageKey}` as "recommendations.recAllGood", rec.messageParams)}
                    </span>
                    {rec.actionHref && rec.actionLabelKey && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={rec.actionHref}>{t(rec.actionLabelKey as "actionCheckWebhook")}</Link>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl" id="campaigns">
            <CardHeader>
              <CardTitle>{t("campaignsTable")}</CardTitle>
              <CardDescription>{t("campaignsTableDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-3">{t("colName")}</th>
                    <th className="py-2 pr-3">{t("colQuality")}</th>
                    <th className="py-2 pr-3">{t("kpiSpend")}</th>
                    <th className="py-2 pr-3">{t("kpiLeads")}</th>
                    <th className="py-2 pr-3">{t("kpiCpl")}</th>
                    <th className="py-2 pr-3">{t("kpiCtr")}</th>
                    <th className="py-2">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.campaigns.map((c) => (
                    <tr key={c.metaCampaignId} className="border-b border-border/50">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{labelEntityName(c.name, t)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.metaCampaignId}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={qualityBadge[c.quality]}>{t(`quality.${c.quality}` as "quality.effective")}</Badge>
                      </td>
                      <td className="py-3 pr-3">{c.spend.toFixed(2)}</td>
                      <td className="py-3 pr-3">{c.leads}</td>
                      <td className="py-3 pr-3">{c.cpl != null ? c.cpl.toFixed(2) : "—"}</td>
                      <td className="py-3 pr-3">{c.ctr.toFixed(2)}%</td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetail({
                              type: "campaign",
                              name: c.name,
                              metaId: c.metaCampaignId,
                              status: c.status,
                              spend: c.spend,
                              impressions: c.impressions,
                              clicks: c.clicks,
                              leads: c.leads,
                              cpl: c.cpl,
                              ctr: c.ctr,
                              cpm: c.cpm,
                              quality: c.quality,
                              currency,
                            });
                            setDetailOpen(true);
                          }}
                        >
                          {t("detailBtn")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl" id="ads">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>{t("adsTable")}</CardTitle>
                  <CardDescription>{t("adsTableDesc")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-1">
                  {AD_FILTERS.map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={adFilter === f ? "default" : "outline"}
                      onClick={() => setAdFilter(f)}
                    >
                      {t(`adFilter.${f}` as "adFilter.all")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-3">{t("colAd")}</th>
                    <th className="py-2 pr-3">{t("colCampaign")}</th>
                    <th className="py-2 pr-3">{t("kpiSpend")}</th>
                    <th className="py-2 pr-3">{t("kpiLeads")}</th>
                    <th className="py-2 pr-3">{t("kpiCpl")}</th>
                    <th className="py-2 pr-3">{t("kpiCtr")}</th>
                    <th className="py-2">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.slice(0, 50).map((a) => (
                    <tr key={a.metaAdId} className="border-b border-border/50">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{labelEntityName(a.name, t)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{a.metaAdId}</p>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{a.campaignName}</td>
                      <td className="py-3 pr-3">{a.spend.toFixed(2)}</td>
                      <td className="py-3 pr-3">{a.leads}</td>
                      <td className="py-3 pr-3">{a.cpl != null ? a.cpl.toFixed(2) : "—"}</td>
                      <td className="py-3 pr-3">{a.ctr.toFixed(2)}%</td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetail({
                              type: "ad",
                              name: a.name,
                              metaId: a.metaAdId,
                              status: a.status,
                              spend: a.spend,
                              impressions: a.impressions,
                              clicks: a.clicks,
                              leads: a.leads,
                              cpl: a.cpl,
                              ctr: a.ctr,
                              cpm: a.cpm,
                              quality: a.quality,
                              campaignName: a.campaignName,
                              adSetName: a.adSetName,
                              currency,
                            });
                            setDetailOpen(true);
                          }}
                        >
                          {t("detailBtn")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {isAdmin && audit.admin && (
            <Card className="rounded-2xl border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">{t("adminBlock")}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                  {JSON.stringify(audit.admin, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AdAuditDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entity={detail}
        periodLabel={periodLabel}
        isAdmin={isAdmin}
      />
    </div>
  );
}
