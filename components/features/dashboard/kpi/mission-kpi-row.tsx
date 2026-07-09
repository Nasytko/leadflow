"use client";

import { useTranslations } from "next-intl";
import { MissionKpiCard } from "./mission-kpi-card";
import type { SourceBreakdown } from "@/lib/dashboard-analytics";

type Props = {
  leadsToday: number;
  todayTrend: number | null;
  todayBreakdown: SourceBreakdown;
  deliveredToday: number;
  deliveryRateToday: number | null;
  avgProcessingMs: number | null;
  attentionCount: number;
};

function formatDuration(ms: number | null, t: (k: string, p?: Record<string, number>) => string) {
  if (ms == null) return "—";
  if (ms < 60_000) return t("durationSeconds", { s: Math.round(ms / 1000) });
  return t("durationMinutes", { m: Math.round(ms / 60_000) });
}

export function MissionKpiRow({
  leadsToday,
  todayTrend,
  todayBreakdown,
  deliveredToday,
  deliveryRateToday,
  avgProcessingMs,
  attentionCount,
}: Props) {
  const t = useTranslations("dashboard.kpi");

  const breakdown =
    leadsToday > 0
      ? [
          { label: t("sourceFacebook"), value: todayBreakdown.facebook },
          ...(todayBreakdown.webhook > 0
            ? [{ label: t("sourceWebhook"), value: todayBreakdown.webhook }]
            : []),
          ...(todayBreakdown.import > 0
            ? [{ label: t("sourceImport"), value: todayBreakdown.import }]
            : []),
        ]
      : undefined;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MissionKpiCard
        label={t("leadsToday")}
        value={leadsToday}
        trend={todayTrend}
        trendLabel={t("vsYesterday")}
        breakdown={breakdown}
      />
      <MissionKpiCard
        label={t("deliveredToday")}
        value={deliveredToday}
        variant={deliveredToday > 0 ? "success" : "default"}
      />
      <MissionKpiCard
        label={t("deliveryRate")}
        value={deliveryRateToday != null ? `${deliveryRateToday}%` : "—"}
        variant={
          deliveryRateToday != null && deliveryRateToday >= 95
            ? "success"
            : deliveryRateToday != null && deliveryRateToday < 80
            ? "warning"
            : "default"
        }
      />
      <MissionKpiCard
        label={t("avgProcessing")}
        value={formatDuration(avgProcessingMs, t)}
      />
      <MissionKpiCard
        label={t("attention")}
        value={attentionCount}
        variant={attentionCount > 0 ? "warning" : "success"}
        breakdown={
          attentionCount > 0
            ? [{ label: t("attentionHint"), value: t("review") }]
            : [{ label: t("allClear"), value: "✓" }]
        }
      />
    </section>
  );
}
