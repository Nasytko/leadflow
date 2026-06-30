"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminKpi } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";
import { AlertTriangle } from "lucide-react";

type Dashboard = {
  platformStatus: string;
  stats: Record<string, number>;
  alerts: Array<{
    id: string;
    severity: string;
    messageKey: string;
    messageParams?: Record<string, number>;
    href: string;
    actionKey: string;
  }>;
};

export function AdminOverviewContent() {
  const t = useTranslations("adminCenter.overview");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/dashboard");
      const json = await res.json();
      setData(json.data ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">{t("loadError")}</p>;

  const s = data.stats;
  const statusEmoji =
    data.platformStatus === "healthy" ? "🟢" : data.platformStatus === "attention" ? "🟡" : "🔴";

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-2">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {statusEmoji} {t(`platformStatus.${data.platformStatus}`)}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <AdminKpi label={t("usersTotal")} value={s.usersTotal} />
        <AdminKpi label={t("activeUsers")} value={s.activeUsers} variant="success" />
        <AdminKpi label={t("verifiedEmails")} value={s.verifiedEmails} />
        <AdminKpi label={t("fbConnections")} value={s.fbConnections} />
        <AdminKpi label={t("telegramConnected")} value={s.telegramConnected} />
        <AdminKpi label={t("leadsToday")} value={s.leadsToday} variant="success" />
        <AdminKpi label={t("leadsWeek")} value={s.leadsWeek} />
        <AdminKpi
          label={t("failedJobs")}
          value={s.failedJobs}
          variant={s.failedJobs > 0 ? "warning" : "default"}
        />
      </div>

      {data.alerts.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("needsAttention")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={a.severity === "critical" ? "destructive" : "warning"}
                  >
                    {a.severity}
                  </Badge>
                  <span>{t(a.messageKey as "alertSmtpNotConfigured", a.messageParams)}</span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={a.href}>{t(a.actionKey as "actionFix")}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
