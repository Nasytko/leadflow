"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  Shield,
  Play,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";
import { cn, formatDate } from "@/lib/utils";
import type {
  MetaHealthReport,
  MetaHealthSection,
  MetaHealthCheck,
  MetaOverallStatus,
} from "@/lib/meta-health-types";
import type { HealthLevel } from "@/lib/dashboard-health";
import { useLocale } from "next-intl";

function StatusDot({ status }: { status: HealthLevel | MetaOverallStatus }) {
  const map: Record<string, string> = {
    ok: "bg-emerald-500",
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    needs_attention: "bg-amber-500",
    error: "bg-red-500",
    critical: "bg-red-500",
    unknown: "bg-muted-foreground",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", map[status] ?? map.unknown)} />;
}

function StatusIcon({ status }: { status: HealthLevel }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function CheckRow({
  check,
  t,
  locale,
}: {
  check: MetaHealthCheck;
  t: (key: string) => string;
  locale: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <StatusIcon status={check.status} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t(check.titleKey)}</p>
          <Badge
            variant={
              check.status === "ok"
                ? "success"
                : check.status === "error"
                ? "destructive"
                : "warning"
            }
            className="text-[10px] shrink-0"
          >
            {t(`health.status.${check.status}`)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{t(check.meaningKey)}</p>
        {check.detail && (
          <p className="text-xs font-mono text-muted-foreground/80 break-all">{check.detail}</p>
        )}
        <p className="text-xs text-[#1877F2]">{t(check.actionKey)}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatDate(check.lastCheckedAt, locale)}
        </p>
        {check.fixHref && check.fixLabelKey && (
          <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" asChild>
            <Link href={check.fixHref}>
              {t(check.fixLabelKey)}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  t,
  locale,
  defaultOpen,
}: {
  section: MetaHealthSection;
  t: (key: string) => string;
  locale: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? section.status !== "ok");

  return (
    <Card className={cn("rounded-2xl overflow-hidden", section.status === "error" && "border-destructive/30")}>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <StatusIcon status={section.status} />
            <div>
              <CardTitle className="text-base">{t(section.titleKey)}</CardTitle>
              {section.summary && (
                <p className="text-xs text-muted-foreground mt-0.5">{section.summary}</p>
              )}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0 pb-4">
          {section.checks.map((check) => (
            <CheckRow key={check.id} check={check} t={t} locale={locale} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function MetaHealthCenter() {
  const t = useTranslations("metaCenter");
  const locale = useLocale();
  const { data: session } = useSession();
  const [report, setReport] = useState<MetaHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async (live = false) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/meta/health${live ? "?live=1" : ""}`);
      const json = await res.json();
      if (json.data) setReport(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function runFullTest(action = "full_test") {
    setRunning(true);
    try {
      const res = await apiFetch("/api/meta/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.data?.redirectUrl) {
        window.location.href = json.data.redirectUrl;
        return;
      }
      if (json.data) {
        setReport(json.data);
        toast.success(t("health.selfTestDone", { ms: json.data.selfTestDurationMs ?? 0 }));
      } else {
        toast.error(json.error?.message ?? t("health.selfTestFailed"));
      }
    } catch {
      toast.error(t("health.selfTestFailed"));
    } finally {
      setRunning(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(t("health.copied"));
  }

  const overall = report?.overallStatus ?? "needs_attention";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={Activity} title={t("health.title")} subtitle={t("health.subtitle")}>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading || running}>
          <RefreshCw className={cn("h-4 w-4 mr-2", (loading || running) && "animate-spin")} />
          {t("health.refresh")}
        </Button>
      </PageHeader>

      {loading && !report ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : report ? (
        <>
          <Card
            className={cn(
              "rounded-2xl border-2",
              overall === "healthy" && "border-emerald-500/40 bg-emerald-500/5",
              overall === "needs_attention" && "border-amber-500/40 bg-amber-500/5",
              overall === "critical" && "border-destructive/40 bg-destructive/5"
            )}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl",
                    overall === "healthy" && "bg-emerald-500/15",
                    overall === "needs_attention" && "bg-amber-500/15",
                    overall === "critical" && "bg-destructive/15"
                  )}
                >
                  <StatusDot status={overall} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{t(report.overallTitleKey)}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t(report.overallDescriptionKey)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("health.lastCheck")}: {formatDate(report.checkedAt, locale)}
                    {report.selfTestDurationMs != null && report.selfTestDurationMs > 0 && (
                      <> · {report.selfTestDurationMs}ms</>
                    )}
                  </p>
                </div>
                <Button onClick={() => void runFullTest()} disabled={running} className="shrink-0">
                  <Play className={cn("h-4 w-4 mr-2", running && "animate-pulse")} />
                  {t("health.runFullTest")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {report.showAdminDetails && report.deployment.checks.length > 0 && (
            <SectionCard
              section={{
                id: "deployment",
                titleKey: "health.sections.deployment",
                status: report.deployment.status,
                checks: report.deployment.checks,
              }}
              t={t}
              locale={locale}
              defaultOpen={report.deployment.status !== "ok"}
            />
          )}

          <div className="space-y-3">
            {report.sections.map((section) => (
              <SectionCard key={section.id} section={section} t={t} locale={locale} />
            ))}
          </div>

          {report.showAdminDetails && report.admin && (
            <Card className="rounded-2xl border-dashed">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t("health.adminPanel")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">App ID</span>
                    <code className="block text-xs bg-muted p-2 rounded mt-1">{report.admin.appId ?? "—"}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Login Config ID</span>
                    <code className="block text-xs bg-muted p-2 rounded mt-1">{report.admin.loginConfigId ?? "—"}</code>
                  </div>
                </div>
                {report.admin.oauthUrl && (
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">OAuth URL</span>
                      <Button variant="ghost" size="sm" onClick={() => void copyText(report.admin!.oauthUrl!)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">{report.admin.oauthUrl}</code>
                  </div>
                )}
                {report.admin.graphResponses && Object.keys(report.admin.graphResponses).length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-medium">{t("health.graphResponses")}</summary>
                    <pre className="text-xs bg-muted p-3 rounded-lg mt-2 overflow-x-auto max-h-64">
                      {JSON.stringify(report.admin.graphResponses, null, 2)}
                    </pre>
                  </details>
                )}
                {report.admin.recentSystemLogs && report.admin.recentSystemLogs.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-medium">SystemLog</summary>
                    <ul className="mt-2 space-y-1 text-xs font-mono max-h-48 overflow-y-auto">
                      {report.admin.recentSystemLogs.map((log) => (
                        <li key={log.id} className="border-b py-1">
                          [{log.level}] {log.action}: {log.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("health.actionCenter")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {report.actions.map((action) =>
                action.apiAction ? (
                  <Button
                    key={action.id}
                    variant={action.variant ?? "outline"}
                    size="sm"
                    disabled={running}
                    onClick={() => void runFullTest(action.apiAction)}
                  >
                    {t(action.labelKey)}
                  </Button>
                ) : (
                  <Button key={action.id} variant="outline" size="sm" asChild>
                    <Link href={action.href ?? "/meta/connect"}>{t(action.labelKey)}</Link>
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
