"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { Link } from "@/i18n/navigation";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import type { DashboardStats } from "@/types";
import type {
  LeadsChartDay,
  FormOverviewRow,
  PipelineNode,
  SourceBreakdown,
} from "@/lib/dashboard-analytics";
import { MissionKpiRow } from "@/components/features/dashboard/kpi/mission-kpi-row";
import { LeadFlowChart } from "@/components/features/dashboard/lead-flow-chart";
import { LeadPipelineMap } from "@/components/features/dashboard/lead-pipeline-map";
import { ConnectedSourcesSection } from "@/components/features/dashboard/connected-sources-section";
import { ActivityFeed, type ActivityEvent } from "@/components/features/dashboard/activity-feed";
import { ActivationMode } from "@/components/features/dashboard/activation-mode";
import { FlowTestCenter } from "@/components/features/testing/flow-test-center";

type StatsResponse = DashboardStats & {
  todayBreakdown?: SourceBreakdown;
  deliveredToday?: number;
  deliveryRateToday?: number | null;
  avgProcessingMs?: number | null;
  attentionCount?: number;
  leadsChartSeries?: LeadsChartDay[];
  formsOverview?: FormOverviewRow[];
  telegramToday?: { delivered: number; errors: number };
  pipelineNodes?: PipelineNode[];
  activationMode?: boolean;
  activationSteps?: {
    facebook: boolean;
    forms: boolean;
    telegram: boolean;
    testLead: boolean;
  };
  activationCompleted?: number;
  activationTotal?: number;
  recentEvents?: ActivityEvent[];
  lastLeadAt?: string | null;
  todayTrend?: number | null;
};

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/stats").then((r) => r.json());
      if (res.data) {
        setStats(res.data);
        setRefreshedAt(new Date());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 px-1">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!stats) return null;

  if (stats.activationMode && stats.activationSteps) {
    return (
      <ActivationMode
        steps={stats.activationSteps}
        completed={stats.activationCompleted ?? 0}
        total={stats.activationTotal ?? 4}
        onRefresh={() => loadStats(true)}
      />
    );
  }

  const todayBreakdown = stats.todayBreakdown ?? { facebook: 0, webhook: 0, import: 0 };

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-1 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="type-display">{t("missionControlTitle")}</h1>
          <p className="type-body text-muted-foreground">{t("welcomeHint")}</p>
          <p className="type-caption text-muted-foreground">
            {t("lastLead")}{" "}
            <span className="text-foreground font-medium">
              {formatTimeAgo(stats.lastLeadAt ?? null, locale)}
            </span>
            {refreshedAt && (
              <>
                <span className="mx-2">·</span>
                {t("lastRefresh", {
                  time: refreshedAt.toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="min-h-11"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/leads">
              {t("actionLeads")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <MissionKpiRow
        leadsToday={stats.leadsToday}
        todayTrend={stats.todayTrend ?? null}
        todayBreakdown={todayBreakdown}
        deliveredToday={stats.deliveredToday ?? 0}
        deliveryRateToday={stats.deliveryRateToday ?? null}
        avgProcessingMs={stats.avgProcessingMs ?? null}
        attentionCount={stats.attentionCount ?? 0}
      />

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-6">
          <SectionHeader title={t("leadsChart30d")} description={t("leadsChartDesc")} className="mb-4" />
          <LeadFlowChart data={stats.leadsChartSeries ?? []} />
        </div>
        <div className="lg:col-span-2">
          {stats.pipelineNodes && stats.pipelineNodes.length > 0 && (
            <LeadPipelineMap nodes={stats.pipelineNodes} />
          )}
        </div>
      </section>

      <ConnectedSourcesSection
        facebookConnected={stats.facebookConnected}
        telegramConnected={stats.telegramConnected}
        accountName={stats.facebookUserName}
        connectedPages={stats.connectedPages}
        activeForms={stats.activeForms}
        forms={stats.formsOverview ?? []}
        deliveredToday={stats.telegramToday?.delivered ?? 0}
        errorsToday={stats.telegramToday?.errors ?? 0}
      />

      <FlowTestCenter />

      <section className="space-y-4">
        <SectionHeader
          title={t("recentEvents")}
          description={t("recentEventsDesc")}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/activity">
                {t("viewAll")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
        <ActivityFeed events={stats.recentEvents ?? []} />
      </section>
    </div>
  );
}
