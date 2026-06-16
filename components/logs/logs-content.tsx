"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

type Log = {
  id: string;
  type: string;
  status: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  leadName?: string;
};

export function LogsContent() {
  const t = useTranslations("logs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/logs?page=${page}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setLogs(res.data.deliveryLogs);
          setTotalPages(res.data.totalPages);
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  function statusVariant(s: string): "success" | "destructive" | "warning" {
    if (s === "success") return "success";
    if (s === "failed") return "destructive";
    return "warning";
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      success: t("statusSuccess"),
      failed: t("statusFailed"),
      pending: t("statusPending"),
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

  const successCount = logs.filter((l) => l.status === "success").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={ScrollText} gradient />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpiTotal")} value={logs.length} icon={ScrollText} />
        <KpiCard label={t("kpiSuccess")} value={successCount} variant="success" />
        <KpiCard label={t("kpiFailed")} value={failedCount} variant={failedCount > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-muted-foreground">{t("noLogs")}</p>
          ) : (
            <div className="overflow-x-auto">
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
                        <Badge variant={statusVariant(log.status)}>
                          {statusLabel(log.status)}
                        </Badge>
                      </td>
                      <td className="p-4">{log.retryCount}</td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(log.createdAt, locale)}
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">
                        {log.errorMessage ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
