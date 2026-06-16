"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import {
  LayoutDashboard,
  Facebook,
  Send,
  FileText,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Activity,
  Zap,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

type StatsResponse = DashboardStats & {
  recentLeads: Array<{
    id: string;
    name: string | null;
    email: string | null;
    createdTime: string;
    form?: { formName: string };
  }>;
  recentLogs: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
};

const SETUP_STEPS = [
  { key: "metaApp", href: "/facebook", labelKey: "setupMeta" },
  { key: "facebookOAuth", href: "/facebook", labelKey: "setupFacebook" },
  { key: "pagesSelected", href: "/facebook", labelKey: "setupPages" },
  { key: "formsEnabled", href: "/forms", labelKey: "setupForms" },
  { key: "telegram", href: "/telegram", labelKey: "setupTelegram" },
] as const;

export function DashboardContent() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tLeads = useTranslations("leads");
  const tLogs = useTranslations("logs");
  const locale = useLocale();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const setupPercent = stats
    ? Math.round((stats.setupCompleted / stats.setupTotal) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon={LayoutDashboard}
        gradient
        badge={
          stats && (
            <Badge variant={setupPercent === 100 ? "success" : "warning"}>
              {t("setupProgress", { percent: setupPercent })}
            </Badge>
          )
        }
      >
        <Button variant="outline" size="sm" asChild className="rounded-xl">
          <Link href="/wiki">
            <BookOpen className="h-4 w-4 mr-2" />
            {t("openWiki")}
          </Link>
        </Button>
      </PageHeader>

      {/* Setup progress */}
      {stats && setupPercent < 100 && (
        <Card className="rounded-2xl border-primary/15 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {t("gettingStarted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar
              value={stats.setupCompleted}
              max={stats.setupTotal}
              label={t("setupLabel")}
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {SETUP_STEPS.map((step) => {
                const done = stats.setupSteps[step.key];
                return (
                  <Link
                    key={step.key}
                    href={step.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all hover:shadow-sm",
                      done
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                        : "border-border/60 hover:border-primary/30"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{t(step.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          {t("kpiTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("leadsToday")}
            value={stats?.leadsToday ?? 0}
            sublabel={t("leadsTodayDesc")}
            icon={Users}
            variant="brand"
          />
          <KpiCard
            label={t("leadsThisWeek")}
            value={stats?.leadsThisWeek ?? 0}
            sublabel={t("leadsThisWeekDesc")}
            icon={TrendingUp}
            variant="success"
          />
          <KpiCard
            label={t("leadsThisMonth")}
            value={stats?.leadsThisMonth ?? 0}
            sublabel={t("totalLeads", { count: stats?.totalLeads ?? 0 })}
            icon={BarChart3}
          />
          <KpiCard
            label={t("deliveryRate")}
            value={
              stats?.deliverySuccessRate !== null && stats?.deliverySuccessRate !== undefined
                ? `${stats.deliverySuccessRate}%`
                : "—"
            }
            sublabel={t("deliveryRateDesc", {
              failed: stats?.failedDeliveriesToday ?? 0,
            })}
            icon={Activity}
            variant={
              stats?.failedDeliveriesToday
                ? "warning"
                : stats?.deliverySuccessRate && stats.deliverySuccessRate >= 95
                ? "success"
                : "default"
            }
          />
          <KpiCard
            label={t("facebookStatus")}
            value={
              <Badge variant={stats?.facebookConnected ? "success" : "secondary"}>
                {stats?.facebookConnected ? tCommon("connected") : tCommon("notConnected")}
              </Badge>
            }
            sublabel={t("pagesCount", {
              connected: stats?.connectedPages ?? 0,
              total: stats?.totalPages ?? 0,
            })}
            icon={Facebook}
            variant="facebook"
          />
          <KpiCard
            label={t("telegramStatus")}
            value={
              <Badge variant={stats?.telegramConnected ? "success" : "secondary"}>
                {stats?.telegramConnected ? tCommon("connected") : tCommon("notConnected")}
              </Badge>
            }
            icon={Send}
            variant={stats?.telegramConnected ? "success" : "default"}
          />
          <KpiCard
            label={t("activeForms")}
            value={stats?.activeForms ?? 0}
            sublabel={t("formsCount", { total: stats?.totalForms ?? 0 })}
            icon={FileText}
          />
          <KpiCard
            label={t("metaAppStatus")}
            value={
              <Badge variant={stats?.metaConfigured ? "success" : "warning"}>
                {stats?.metaConfigured ? t("metaReady") : t("metaNotReady")}
              </Badge>
            }
            icon={Zap}
            variant={stats?.metaConfigured ? "brand" : "warning"}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/facebook">
            <Facebook className="h-4 w-4 mr-2" />
            {t("actionFacebook")}
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/forms">
            <FileText className="h-4 w-4 mr-2" />
            {t("actionForms")}
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/telegram">
            <Send className="h-4 w-4 mr-2" />
            {t("actionTelegram")}
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/leads">
            <Users className="h-4 w-4 mr-2" />
            {t("actionLeads")}
          </Link>
        </Button>
      </div>

      {/* Activity panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("recentLeads")}</CardTitle>
            <Link
              href="/leads"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {t("viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentLeads?.length ? (
              <div className="space-y-3">
                {stats.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lead.name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.form?.formName}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(lead.createdTime, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title={tLeads("noLeads")}
                description={t("noLeadsDesc")}
              >
                <Button size="sm" asChild>
                  <Link href="/facebook">{t("actionFacebook")}</Link>
                </Button>
              </EmptyState>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t("recentLogs")}</CardTitle>
            <Link
              href="/logs"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {t("viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentLogs?.length ? (
              <div className="space-y-3">
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-4 py-3"
                  >
                    <span className="text-sm truncate">{log.type}</span>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "success"
                          : log.status === "failed"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title={tLogs("noLogs")} description={t("noLogsDesc")} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health alert */}
      {stats?.failedDeliveriesToday ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{t("deliveryAlertTitle")}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("deliveryAlertDesc", { count: stats.failedDeliveriesToday })}
            </p>
            <Button variant="outline" size="sm" asChild className="mt-3 rounded-xl">
              <Link href="/logs">{t("viewLogs")}</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
