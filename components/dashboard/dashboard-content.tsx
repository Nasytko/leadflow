"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Settings2,
  Activity,
  Clock,
  Zap,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardStats } from "@/types";
import { DashboardLineChart, DashboardDonutChart } from "@/components/dashboard/dashboard-charts";

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
  { key: "facebookAccount", href: "/meta/connect", labelKey: "setupFacebook" },
  { key: "businessPortfolio", href: "/meta/connect", labelKey: "setupBusiness" },
  { key: "pagesSelected", href: "/meta/pages", labelKey: "setupPages" },
  { key: "formsEnabled", href: "/meta/forms", labelKey: "setupForms" },
  { key: "webhookVerified", href: "/meta/webhook", labelKey: "setupWebhook" },
  { key: "telegram", href: "/meta/telegram", labelKey: "setupTelegram" },
  { key: "testLead", href: "/leads", labelKey: "setupTestLead" },
] as const;

function timeAgo(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return locale === "ru" ? "только что" : "just now";
  if (minutes < 60) return locale === "ru" ? `${minutes} мин назад` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "ru" ? `${hours} ч назад` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === "ru" ? `${days} дн назад` : `${days}d ago`;
}

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
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-1" />
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {refreshedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t("lastRefresh", {
                time: refreshedAt.toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg" asChild>
            <Link href="/settings">
              <Settings2 className="h-4 w-4 mr-2" />
              {t("configure")}
            </Link>
          </Button>
        </div>
      </div>

      {stats && setupPercent < 100 && (
        <Card className="rounded-lg border-primary/15 bg-primary/[0.02]">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4 text-primary" />
              {t("gettingStarted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <ProgressBar
              value={stats.setupCompleted}
              max={stats.setupTotal}
              label={t("setupLabel")}
            />
            <div className="flex flex-wrap gap-2">
              {SETUP_STEPS.map((step) => {
                const done = stats.setupSteps[step.key];
                return (
                  <Link
                    key={step.key}
                    href={step.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                      done
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    {t(step.labelKey)}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label={t("leadsToday")}
          value={stats?.leadsToday ?? 0}
          icon={Users}
          variant="brand"
          trend={stats?.todayTrend ?? undefined}
          trendLabel={t("vsYesterday")}
        />
        <KpiCard
          label={t("leadsThisWeek")}
          value={stats?.leadsThisWeek ?? 0}
          icon={TrendingUp}
          variant="success"
          trend={stats?.weekTrend ?? undefined}
          trendLabel={t("vsPrevWeek")}
        />
        <KpiCard
          label={t("leadsThisMonth")}
          value={stats?.leadsThisMonth ?? 0}
          icon={BarChart3}
          trend={stats?.monthTrend ?? undefined}
          trendLabel={t("vsPrevMonth")}
        />
        <KpiCard
          label={t("totalLeadsLabel")}
          value={stats?.totalLeads ?? 0}
          sublabel={t("allTime")}
          icon={Users}
        />
        <KpiCard
          label={t("lastLead")}
          value={timeAgo(stats?.lastLeadAt ?? null, locale)}
          sublabel={t("lastLeadDesc")}
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg lg:col-span-1">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("systemStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-2">
              {systemCards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-2 text-sm py-1"
                >
                  <span>{t(`health_${card.id}` as "health_facebook")}</span>
                  <StatusBadge
                    status={card.status}
                    label={t(`healthStatus_${card.status}`)}
                  />
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 text-sm py-1">
                <span>{t("health_database")}</span>
                <StatusBadge status="ok" label={t("healthStatus_ok")} />
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-lg lg:col-span-2">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">{t("leadsChart30d")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <DashboardLineChart data={stats?.leadsByDay ?? []} height={220} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">{t("leadSources")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.leadSources?.length ? (
              <DashboardDonutChart data={stats.leadSources} />
            ) : (
              <EmptyState icon={BarChart3} title={t("noSources")} description={t("noSourcesDesc")} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">{t("campaignsTable")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.campaignSummary?.length ? (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">{t("campaignName")}</th>
                      <th className="pb-2 font-medium">{t("campaignChannel")}</th>
                      <th className="pb-2 font-medium text-right">{t("campaignLeads")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.campaignSummary.map((row) => (
                      <tr key={row.name} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-2 max-w-[140px] truncate">{row.name}</td>
                        <td className="py-2 text-muted-foreground">{row.channel}</td>
                        <td className="py-2 text-right font-medium">{row.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title={t("noCampaigns")} description={t("noCampaignsDesc")} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">{t("recentEvents")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats?.recentEvents?.length ? (
              <ul className="space-y-3">
                {stats.recentEvents.map((ev) => (
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        ev.status === "ok" && "bg-emerald-500",
                        ev.status === "warning" && "bg-amber-500",
                        ev.status === "error" && "bg-red-500"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">
                        {t(ev.messageKey as "eventLeadReceived", ev.messageParams ?? {})}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(ev.at, locale)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Activity} title={t("noEvents")} description={t("noEventsDesc")} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
