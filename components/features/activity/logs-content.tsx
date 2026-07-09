"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import { ScrollText, Webhook } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

type Log = {
  id: string;
  type: string;
  status: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  leadName?: string;
};

type WebhookEventRow = {
  id: string;
  eventType: string;
  status: string;
  pageId?: string;
  leadgenId?: string;
  lastError?: string;
  sourceIp?: string;
  createdAt: string;
};

type VerificationRow = {
  id: string;
  success: boolean;
  tokenMasked?: string;
  challengePresent: boolean;
  ipAddress?: string;
  errorMessage?: string;
  createdAt: string;
};

export function LogsContent() {
  const t = useTranslations("logs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [logs, setLogs] = useState<Log[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/logs?page=${page}`).then((r) => r.json()),
      fetch("/api/webhooks/diagnostics").then((r) => r.json()),
    ])
      .then(([logsRes, diagRes]) => {
        if (logsRes.data) {
          setLogs(logsRes.data.deliveryLogs);
          setTotalPages(logsRes.data.totalPages);
        }
        if (diagRes.data) {
          setWebhookEvents(diagRes.data.webhookEvents ?? []);
          setVerificationLogs(diagRes.data.verificationLogs ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  function statusVariant(s: string): "success" | "destructive" | "warning" {
    if (s === "success" || s === "sent" || s === "processed") return "success";
    if (s === "failed") return "destructive";
    return "warning";
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      success: t("statusSuccess"),
      sent: t("statusSent"),
      failed: t("statusFailed"),
      pending: t("statusPending"),
      retrying: t("statusRetrying"),
      processed: t("statusProcessed"),
      received: t("statusReceived"),
      queued: t("statusQueued"),
      ignored: t("statusIgnored"),
    };
    return map[s] ?? s;
  }

  function typeLabel(type: string) {
    return type === "telegram" ? t("typeTelegram") : t("typeWebhook");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const successCount = logs.filter((l) => l.status === "success" || l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={ScrollText} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpiTotal")} value={logs.length} icon={ScrollText} />
        <KpiCard label={t("kpiSuccess")} value={successCount} variant="success" />
        <KpiCard label={t("kpiFailed")} value={failedCount} variant={failedCount > 0 ? "warning" : "default"} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            {t("webhookDiagnostics")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">{t("verificationAttempts")}</h3>
            {verificationLogs.length === 0 ? (
              <EmptyState
                icon={Webhook}
                title={t("noVerificationLogs")}
                description={t("noVerificationLogsDesc")}
                className="py-8"
              >
                <Button variant="outline" asChild className="min-h-11">
                  <Link href="/connections/webhook">{t("noLogsCtaWebhook")}</Link>
                </Button>
              </EmptyState>
            ) : (
              <div className="space-y-2">
                {verificationLogs.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <Badge variant={row.success ? "success" : "destructive"}>
                      {row.success ? t("verified") : t("verificationFailed")}
                    </Badge>
                    <span className="text-muted-foreground">{formatDate(row.createdAt, locale)}</span>
                    {row.tokenMasked && <span className="font-mono text-xs">{row.tokenMasked}</span>}
                    {row.errorMessage && <span className="text-destructive text-xs">{row.errorMessage}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">{t("webhookEvents")}</h3>
            {webhookEvents.length === 0 ? (
              <EmptyState
                icon={Webhook}
                title={t("noWebhookEvents")}
                description={t("noWebhookEventsDesc")}
                className="py-8"
              >
                <Button variant="outline" asChild className="min-h-11">
                  <Link href="/connections/webhook">{t("noLogsCtaWebhook")}</Link>
                </Button>
              </EmptyState>
            ) : (
              <div className="space-y-2 md:hidden">
                {webhookEvents.map((e) => (
                  <div key={e.id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={statusVariant(e.status)}>{statusLabel(e.status)}</Badge>
                      <span className="type-caption text-muted-foreground">{formatDate(e.createdAt, locale)}</span>
                    </div>
                    {e.leadgenId && <p className="font-mono text-xs truncate">leadgen: {e.leadgenId}</p>}
                    {e.lastError && <p className="text-destructive text-xs">{e.lastError}</p>}
                  </div>
                ))}
              </div>
            )}
            {webhookEvents.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">{t("status")}</th>
                      <th className="p-2 text-left">{t("date")}</th>
                      <th className="p-2 text-left">leadgen</th>
                      <th className="p-2 text-left">{t("errorMessage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEvents.map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="p-2">
                          <Badge variant={statusVariant(e.status)}>{statusLabel(e.status)}</Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{formatDate(e.createdAt, locale)}</td>
                        <td className="p-2 font-mono text-xs">{e.leadgenId ?? "—"}</td>
                        <td className="p-2 text-destructive text-xs max-w-xs truncate">{e.lastError ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("deliveryLogs")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState icon={ScrollText} title={t("noLogs")} description={t("noLogsDesc")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild className="min-h-11">
                  <Link href="/connections/facebook">{t("noLogsCtaConnect")}</Link>
                </Button>
                <Button variant="outline" asChild className="min-h-11">
                  <Link href="/connections/webhook">{t("noLogsCtaWebhook")}</Link>
                </Button>
              </div>
            </EmptyState>
          ) : (
            <>
            <div className="md:hidden divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{typeLabel(log.type)}</span>
                    <Badge variant={statusVariant(log.status)}>{statusLabel(log.status)}</Badge>
                  </div>
                  <p className="type-caption text-muted-foreground">{formatDate(log.createdAt, locale)}</p>
                  {log.errorMessage && <p className="text-destructive text-xs">{log.errorMessage}</p>}
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">{t("type")}</th>
                    <th className="p-4 text-left">{t("status")}</th>
                    <th className="p-4 text-left">{t("retries")}</th>
                    <th className="p-4 text-left">{t("date")}</th>
                    <th className="p-4 text-left">{t("errorMessage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="p-4">{typeLabel(log.type)}</td>
                      <td className="p-4">
                        <Badge variant={statusVariant(log.status)}>{statusLabel(log.status)}</Badge>
                      </td>
                      <td className="p-4">{log.retryCount}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(log.createdAt, locale)}</td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">{log.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {tCommon("back")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {tCommon("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
