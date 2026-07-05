"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  HeartPulse,
  Clock,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { calculateRoi } from "@/lib/ad-audit-insights";
import { apiFetch } from "@/lib/client-api";
import type { MarketingScoreStatus } from "@/lib/ad-audit-marketing-score";

function timeAgo(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale.startsWith("en") ? "just now" : "только что";
  if (mins < 60) return locale.startsWith("en") ? `${mins} min ago` : `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale.startsWith("en") ? `${hours} h ago` : `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  return locale.startsWith("en") ? `${days} d ago` : `${days} дн. назад`;
}

const scoreStatusConfig: Record<
  MarketingScoreStatus,
  { emoji: string; variant: "success" | "warning" | "destructive" }
> = {
  excellent: { emoji: "🟢", variant: "success" },
  good: { emoji: "🟢", variant: "success" },
  attention: { emoji: "🟡", variant: "warning" },
  critical: { emoji: "🔴", variant: "destructive" },
};

type MarketingScoreData = {
  score: number;
  status: MarketingScoreStatus;
  factors: Array<{
    id: string;
    status: "positive" | "warning" | "negative";
    messageKey: string;
    messageParams?: Record<string, string | number>;
  }>;
};

export function MarketingScoreCard({ data }: { data: MarketingScoreData }) {
  const t = useTranslations("metaAds");
  const cfg = scoreStatusConfig[data.status];

  return (
    <Card className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t("marketingScoreTitle")}</CardTitle>
        <CardDescription>{t("marketingScoreDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-bold tracking-tight">
              {data.score}
              <span className="text-2xl text-muted-foreground font-normal"> / 100</span>
            </div>
            <Badge variant={cfg.variant} className="mt-2">
              {cfg.emoji} {t(`scoreStatus.${data.status}`)}
            </Badge>
          </div>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.factors.map((f) => (
              <li key={f.id} className="flex items-start gap-2">
                <span className="shrink-0">
                  {f.status === "positive" ? "✔" : f.status === "warning" ? "⚠" : "✗"}
                </span>
                <span className={cn(f.status === "negative" && "text-destructive")}>
                  {t(`scoreFactors.${f.messageKey}` as "scoreFactors.scoreCtrGood", f.messageParams)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

type MainInsightData = {
  bullets: Array<{
    id: string;
    tone: "positive" | "neutral" | "warning";
    messageKey: string;
    messageParams?: Record<string, string | number>;
  }>;
  headlineKey: string;
  headlineParams?: Record<string, string | number>;
};

export function MainInsightCard({ data, periodLabel }: { data: MainInsightData; periodLabel: string }) {
  const t = useTranslations("metaAds");

  return (
    <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          {t("mainInsightTitle")}
        </CardTitle>
        <CardDescription>{t("mainInsightFor", { period: periodLabel })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-medium text-sm">
          {t(data.headlineKey as "insightHeadlineActive", data.headlineParams)}
        </p>
        <ul className="space-y-1.5 text-sm">
          {data.bullets.map((b) => (
            <li key={b.id} className="flex items-start gap-2">
              <span>
                {b.tone === "positive" ? "✓" : b.tone === "warning" ? "!" : "•"}
              </span>
              <span>{t(b.messageKey as "insightLeadsReceived", b.messageParams)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

type RoiProps = {
  spend: number;
  leads: number;
  currency: string;
  adAccountId: string;
};

export function RoiCard({ spend, leads, currency, adAccountId }: RoiProps) {
  const t = useTranslations("metaAds");
  const [avgValue, setAvgValue] = useState("");
  const [useProfit, setUseProfit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/meta/ad-audit/preferences");
      const data = await res.json();
      const prefs = data.data?.preferences;
      if (prefs?.averageOrderValue) setAvgValue(String(prefs.averageOrderValue));
      if (prefs?.useProfit) setUseProfit(true);
      if (prefs?.profitPerLead) setAvgValue(String(prefs.profitPerLead));
    })();
  }, [adAccountId]);

  const revenuePerLead = parseFloat(avgValue) || 0;
  const roi = calculateRoi(spend, leads, revenuePerLead);

  async function savePrefs() {
    setSaving(true);
    try {
      await apiFetch("/api/meta/ad-audit/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          averageOrderValue: useProfit ? null : revenuePerLead || null,
          profitPerLead: useProfit ? revenuePerLead || null : null,
          useProfit,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("roiTitle")}</CardTitle>
        <CardDescription>{t("roiDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">
              {useProfit ? t("roiProfitPerLead") : t("roiAvgOrder")}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={avgValue}
              onChange={(e) => setAvgValue(e.target.value)}
              className="w-[160px]"
              placeholder="0"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseProfit(!useProfit)}
          >
            {useProfit ? t("roiModeProfit") : t("roiModeRevenue")}
          </Button>
          <Button size="sm" onClick={() => void savePrefs()} disabled={saving}>
            {t("roiSave")}
          </Button>
        </div>

        {roi && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <RoiStep label={t("roiSpend")} value={`${roi.spend.toFixed(2)} ${currency}`} />
            <ArrowDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <RoiStep label={t("roiLeads")} value={String(roi.leads)} />
            <ArrowDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <RoiStep
              label={t("roiExpectedRevenue")}
              value={`${roi.expectedRevenue.toFixed(2)} ${currency}`}
            />
            <ArrowDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <RoiStep
              label={t("roiPercent")}
              value={`${roi.roi > 0 ? "+" : ""}${roi.roi}%`}
              highlight={roi.roi > 0}
            />
            <ArrowDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <RoiStep
              label={t("roiProfit")}
              value={`${roi.profit.toFixed(2)} ${currency}`}
              highlight={roi.profit > 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoiStep({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-2 min-w-[100px]">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("font-semibold", highlight && "text-emerald-600")}>{value}</p>
    </div>
  );
}

type SystemHealthData = {
  items: Array<{ id: string; labelKey: string; ok: boolean }>;
  overallOk: boolean;
};

export function SystemHealthCard({ data }: { data: SystemHealthData }) {
  const t = useTranslations("metaAds");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4" />
          {t("systemHealthTitle")}
        </CardTitle>
        <CardDescription>
          {data.overallOk ? t("systemHealthOk") : t("systemHealthIssue")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span>{t(item.labelKey as "healthMetaApi")}</span>
            {item.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        ))}
        {!data.overallOk && (
          <Button size="sm" variant="outline" className="mt-2" asChild>
            <Link href="/health">{t("systemHealthFix")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

type LeadSyncData = {
  metaLeads: number;
  leadBridgeLeads: number;
  matchRate: number | null;
  status: string;
};

export function MatchRateCard({ data }: { data: LeadSyncData }) {
  const t = useTranslations("metaAds");
  const rate = data.matchRate ?? 0;

  return (
    <Card className="rounded-2xl border-[#1877F2]/30 bg-gradient-to-r from-[#1877F2]/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("matchRateTitle")}</CardTitle>
        <CardDescription>{t("leadSyncDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Meta</p>
            <p className="text-2xl font-bold">{data.metaLeads}</p>
            <p className="text-[10px] text-muted-foreground">{t("kpiMetaLeads")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">ORVIX</p>
            <p className="text-2xl font-bold text-emerald-600">{data.leadBridgeLeads}</p>
            <p className="text-[10px] text-muted-foreground">{t("kpiLeadBridgeLeads")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("matchRateLabel")}</p>
            <p
              className={cn(
                "text-2xl font-bold",
                rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-destructive"
              )}
            >
              {data.matchRate != null ? `${rate}%` : "—"}
            </p>
          </div>
        </div>
        {data.matchRate != null && data.matchRate < 90 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t("matchRateWarning")}
            <Button size="sm" variant="outline" className="ml-auto" asChild>
              <Link href="/connections/webhook">{t("actionCheckWebhook")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ActivityData = {
  lastLeadAt: string | null;
  lastSyncedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
};

export function ActivityCard({ data, locale }: { data: ActivityData; locale: string }) {
  const t = useTranslations("metaAds");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t("activityTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("activityLastLead")}</span>
          <span className="font-medium">{timeAgo(data.lastLeadAt, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("activityLastSync")}</span>
          <span className="font-medium">{timeAgo(data.lastSyncedAt, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("activityLastError")}</span>
          <span className="font-medium">
            {data.lastErrorAt ? timeAgo(data.lastErrorAt, locale) : t("activityNoErrors")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

type HealthHistoryData = {
  periodDays: number;
  webhook: { uptimePct: number };
  meta: { uptimePct: number };
  telegram: { uptimePct: number };
  errors: number;
};

export function HealthHistoryCard({ data }: { data: HealthHistoryData }) {
  const t = useTranslations("metaAds");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t("healthHistoryTitle", { days: data.periodDays })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <HistoryMetric label="Webhook" value={`${data.webhook.uptimePct}%`} ok={data.webhook.uptimePct >= 95} />
          <HistoryMetric label="Meta" value={`${data.meta.uptimePct}%`} ok={data.meta.uptimePct >= 95} />
          <HistoryMetric label="Telegram" value={`${data.telegram.uptimePct}%`} ok={data.telegram.uptimePct >= 95} />
          <HistoryMetric label={t("healthHistoryErrors")} value={String(data.errors)} ok={data.errors === 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryMetric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={cn("text-lg font-bold", ok ? "text-emerald-600" : "text-amber-600")}>{value}</p>
    </div>
  );
}
