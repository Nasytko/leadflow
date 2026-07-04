"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  RefreshCw,
  Activity,
  Zap,
  CheckCircle2,
  Circle,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardStats } from "@/types";
import { DashboardLineChart, DashboardDonutChart } from "@/components/dashboard/dashboard-charts";
import { DashboardActiveFlows } from "@/components/dashboard/dashboard-active-flows";
import { DashboardSystemHealth } from "@/components/dashboard/dashboard-system-health";
import { formatTimeAgo } from "@/lib/utils";

type HealthCard = {
  id: string;
  status: "ok" | "warning" | "error" | "unknown";
};

type StatsResponse = DashboardStats & {
  healthCards?: HealthCard[];
  leadsByDay?: Array<{ date: string; value: number }>;
  leadSources?: Array<{ name: string; count: number; pct: number }>;
  campaignSummary?: Array<{ name: string; leads: number; channel: string }>;
  recentEvents?: Array<{
    id: string;
    at: string;
    messageKey: string;
    messageParams?: Record<string, string>;
    status: "ok" | "warning" | "error";
  }>;
  lastLeadAt?: string | null;
  todayTrend?: number | null;
  weekTrend?: number | null;
  monthTrend?: number | null;
};

const SYSTEM_STATUS_IDS = ["facebook", "pages", "forms", "webhook", "telegram", "queue"] as const;

const SETUP_STEPS = [
  { key: "facebookAccount", href: "/connections/facebook", labelKey: "setupFacebook" },
  { key: "businessPortfolio", href: "/connections/facebook?step=business", labelKey: "setupBusiness" },
  { key: "pagesSelected", href: "/connections/facebook?step=pages", labelKey: "setupPages" },
  { key: "formsEnabled", href: "/connections/facebook?step=forms", labelKey: "setupForms" },
  { key: "webhookVerified", href: "/connections/facebook?step=webhook", labelKey: "setupWebhook" },
  { key: "telegram", href: "/connections/telegram", labelKey: "setupTelegram" },
  { key: "testLead", href: "/leads", labelKey: "setupTestLead" },
] as const;

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
      <div className="mx-auto max-w-[1200px] space-y-8">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const setupPercent = stats
    ? Math.round((stats.setupCompleted / stats.setupTotal) * 100)
    : 0;

  const systemCards =
    stats?.healthCards?.filter((c) =>
      (SYSTEM_STATUS_IDS as readonly string[]).includes(c.id)
    ) ?? [];

  return (
    <div className="mx-auto max-w-[1200px] space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 max-w-xl">
          <h1 className="type-display">{t("title")}</h1>
          <p className="type-body text-muted-foreground">{t("welcomeHint")}</p>
          <p className="type-caption">
            {t("lastLead")}{" "}
            <span className="text-foreground/80 font-medium">
              {formatTimeAgo(stats?.lastLeadAt ?? null, locale)}
            </span>
            {refreshedAt && (
              <>
                <span className="mx-2 text-border">·</span>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="min-h-11"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button size="default" asChild className="min-h-11">
            <Link href="/leads">
              {t("actionLeads")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {stats && setupPercent < 100 && (
        <section className="surface px-6 py-6 sm:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <p className="type-title">{t("gettingStarted")}</p>
            <span className="type-caption ml-auto tabular-nums">{setupPercent}%</span>
          </div>
          <ProgressBar value={stats.setupCompleted} max={stats.setupTotal} />
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {SETUP_STEPS.map((step) => {
              const done = stats.setupSteps[step.key];
              return (
                <Link
                  key={step.key}
                  href={step.href}
                  className={cn(
                    "inline-flex items-center gap-2 type-caption transition-colors hover:text-primary",
                    done ? "text-foreground/75" : "text-muted-foreground"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.5} />
                  ) : (
                    <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {t(step.labelKey)}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          minimal
          label={t("leadsToday")}
          value={stats?.leadsToday ?? 0}
          trend={stats?.todayTrend ?? undefined}
          trendLabel={t("vsYesterday")}
        />
        <KpiCard
          minimal
          label={t("leadsThisWeek")}
          value={stats?.leadsThisWeek ?? 0}
          trend={stats?.weekTrend ?? undefined}
          trendLabel={t("vsPrevWeek")}
        />
        <KpiCard
          minimal
          label={t("leadsThisMonth")}
          value={stats?.leadsThisMonth ?? 0}
          trend={stats?.monthTrend ?? undefined}
          trendLabel={t("vsPrevMonth")}
        />
        <KpiCard
          minimal
          label={t("totalLeadsLabel")}
          value={stats?.totalLeads ?? 0}
          sublabel={t("allTime")}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 surface px-6 py-6 sm:px-8">
          <SectionHeader title={t("leadsChart30d")} description={t("leadsChartDesc")} className="mb-4" />
          <DashboardLineChart data={stats?.leadsByDay ?? []} height={280} />
        </div>
        <div className="surface px-6 py-6 sm:px-8">
          <SectionHeader title={t("leadSources")} description={t("leadSourcesDesc")} className="mb-4" />
          {stats?.leadSources?.length ? (
            <DashboardDonutChart data={stats.leadSources} centerLabel={t("donutCenter")} />
          ) : (
            <EmptyState icon={BarChart3} title={t("noSources")} description={t("noSourcesDesc")} />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="surface px-6 py-6 sm:px-8">
          <SectionHeader title={t("activeFlowsTitle")} description={t("pipelineSubtitle")} className="mb-4" />
          <DashboardActiveFlows
            facebookConnected={stats?.facebookConnected ?? false}
            telegramConnected={stats?.telegramConnected ?? false}
            webhookVerified={stats?.webhookVerified ?? false}
          />
        </div>
        <div className="surface px-6 py-6 sm:px-8">
          <SectionHeader title={t("recentEvents")} description={t("recentEventsDesc")} className="mb-4" />
          {stats?.recentEvents?.length ? (
            <ul className="space-y-4">
              {stats.recentEvents.slice(0, 6).map((ev) => (
                <li key={ev.id} className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <span
                      className={cn(
                        "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                        ev.status === "ok" && "bg-emerald-500",
                        ev.status === "warning" && "bg-amber-500",
                        ev.status === "error" && "bg-red-500"
                      )}
                    />
                    <p className="type-body line-clamp-2">
                      {t(ev.messageKey as "eventLeadReceived", ev.messageParams ?? {})}
                    </p>
                  </div>
                  <time className="type-caption shrink-0 tabular-nums">
                    {formatTimeAgo(ev.at, locale)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Activity} title={t("noEvents")} description={t("noEventsDesc")} />
          )}
        </div>
        <div className="surface px-6 py-6 sm:px-8">
          <SectionHeader title={t("systemHealthTitle")} className="mb-4" />
          <DashboardSystemHealth cards={systemCards} />
        </div>
      </section>

      {stats?.campaignSummary?.length ? (
        <section>
          <SectionHeader
            title={t("campaignsTable")}
            description={t("campaignsTableDesc")}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/meta/audit">
                  {t("viewAll")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="surface overflow-hidden">
            <div className="divide-y divide-border/70 lg:hidden">
              {stats.campaignSummary.map((row) => (
                <div key={row.name} className="px-6 py-4 space-y-1">
                  <p className="type-body font-medium truncate">{row.name}</p>
                  <div className="flex justify-between type-caption">
                    <span>{row.channel}</span>
                    <span className="tabular-nums font-medium">{row.leads} {t("campaignLeads").toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden lg:table w-full">
              <thead>
                <tr className="hairline-b text-left">
                  <th className="type-label px-6 py-4 font-medium normal-case">{t("campaignName")}</th>
                  <th className="type-label px-6 py-4 font-medium normal-case">{t("campaignChannel")}</th>
                  <th className="type-label px-6 py-4 font-medium text-right normal-case">
                    {t("campaignLeads")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.campaignSummary.map((row) => (
                  <tr
                    key={row.name}
                    className="hairline-b last:border-0 transition-colors hover:bg-primary/[0.02]"
                  >
                    <td className="type-body px-6 py-4 max-w-[240px] truncate">{row.name}</td>
                    <td className="type-caption px-6 py-4">{row.channel}</td>
                    <td className="type-body px-6 py-4 text-right tabular-nums">{row.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
