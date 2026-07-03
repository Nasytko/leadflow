"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { IntegrationPipeline } from "@/components/dashboard/integration-pipeline";

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
      <div className="mx-auto max-w-[1080px] space-y-16">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
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
    <div className="mx-auto max-w-[1080px]">
      {/* Page hero */}
      <header className="mb-16 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3 max-w-xl">
          <h1 className="type-display">{t("title")}</h1>
          <p className="type-body text-muted-foreground">{t("welcomeHint")}</p>
          <p className="type-caption">
            {t("lastLead")}{" "}
            <span className="text-foreground/80">
              {timeAgo(stats?.lastLeadAt ?? null, locale)}
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
            variant="ghost"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/leads">
              {t("actionLeads")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {stats && setupPercent < 100 && (
        <section className="mb-16 surface px-6 py-6 sm:px-8 sm:py-7">
          <div className="mb-5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <p className="type-title">{t("gettingStarted")}</p>
            <span className="type-caption ml-auto">{setupPercent}%</span>
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
                    "inline-flex items-center gap-2 type-caption transition-colors hover:text-foreground",
                    done ? "text-foreground/70" : "text-muted-foreground"
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

      {/* Metrics — single rhythm strip */}
      <section className="mb-20">
        <div className="grid grid-cols-2 border border-border/70 rounded-lg overflow-hidden lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/70 bg-card">
          <KpiCard
            minimal
            className="!px-6 !py-7"
            label={t("leadsToday")}
            value={stats?.leadsToday ?? 0}
            trend={stats?.todayTrend ?? undefined}
            trendLabel={t("vsYesterday")}
          />
          <KpiCard
            minimal
            className="!px-6 !py-7"
            label={t("leadsThisWeek")}
            value={stats?.leadsThisWeek ?? 0}
            trend={stats?.weekTrend ?? undefined}
            trendLabel={t("vsPrevWeek")}
          />
          <KpiCard
            minimal
            className="!px-6 !py-7"
            label={t("leadsThisMonth")}
            value={stats?.leadsThisMonth ?? 0}
            trend={stats?.monthTrend ?? undefined}
            trendLabel={t("vsPrevMonth")}
          />
          <KpiCard
            minimal
            className="!px-6 !py-7"
            label={t("totalLeadsLabel")}
            value={stats?.totalLeads ?? 0}
            sublabel={t("allTime")}
          />
        </div>
      </section>

      {/* Pipeline */}
      <section className="mb-20">
        <SectionHeader title={t("pipelineTitle")} description={t("pipelineSubtitle")} />
        <div className="surface px-6 py-8 sm:px-8">
          <IntegrationPipeline
            facebookConnected={stats?.facebookConnected ?? false}
            telegramConnected={stats?.telegramConnected ?? false}
            activeForms={stats?.activeForms ?? 0}
            webhookVerified={stats?.webhookVerified ?? false}
          />
        </div>
      </section>

      {/* Chart + health */}
      <section className="mb-20 grid gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
        <div>
          <SectionHeader title={t("leadsChart30d")} description={t("leadsChartDesc")} />
          <div className="surface px-6 py-8 sm:px-8">
            <DashboardLineChart data={stats?.leadsByDay ?? []} height={280} />
          </div>
        </div>
        <div>
          <SectionHeader title={t("systemStatus")} />
          <ul className="space-y-4">
            {systemCards.map((card) => (
              <li key={card.id} className="flex items-center justify-between gap-4">
                <span className="type-caption text-foreground/80">
                  {t(`health_${card.id}` as "health_facebook")}
                </span>
                <StatusBadge
                  status={card.status}
                  label={t(`healthStatus_${card.status}`)}
                />
              </li>
            ))}
            <li className="flex items-center justify-between gap-4">
              <span className="type-caption text-foreground/80">{t("health_database")}</span>
              <StatusBadge status="ok" label={t("healthStatus_ok")} />
            </li>
          </ul>
        </div>
      </section>

      {/* Sources + activity */}
      <section className="mb-20 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeader title={t("leadSources")} description={t("leadSourcesDesc")} />
          <div className="surface px-6 py-8 sm:px-8">
            {stats?.leadSources?.length ? (
              <DashboardDonutChart data={stats.leadSources} />
            ) : (
              <EmptyState icon={BarChart3} title={t("noSources")} description={t("noSourcesDesc")} />
            )}
          </div>
        </div>
        <div>
          <SectionHeader title={t("recentEvents")} description={t("recentEventsDesc")} />
          {stats?.recentEvents?.length ? (
            <ul className="space-y-5">
              {stats.recentEvents.map((ev) => (
                <li key={ev.id} className="flex gap-4">
                  <span
                    className={cn(
                      "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                      ev.status === "ok" && "bg-emerald-500",
                      ev.status === "warning" && "bg-amber-500",
                      ev.status === "error" && "bg-red-500"
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="type-body">
                      {t(ev.messageKey as "eventLeadReceived", ev.messageParams ?? {})}
                    </p>
                    <p className="type-caption">{timeAgo(ev.at, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Activity} title={t("noEvents")} description={t("noEventsDesc")} />
          )}
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
            <table className="w-full">
              <thead>
                <tr className="hairline-b text-left">
                  <th className="type-label px-6 py-4 font-medium">{t("campaignName")}</th>
                  <th className="type-label px-6 py-4 font-medium">{t("campaignChannel")}</th>
                  <th className="type-label px-6 py-4 font-medium text-right">
                    {t("campaignLeads")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.campaignSummary.map((row) => (
                  <tr
                    key={row.name}
                    className="hairline-b last:border-0 transition-colors hover:bg-foreground/[0.02]"
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
