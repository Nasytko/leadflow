"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminKpi } from "@/components/admin/admin-shell";
import { apiFetch } from "@/lib/client-api";
import { toast } from "sonner";

export function AdminQueueContent() {
  const t = useTranslations("adminCenter.queue");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await apiFetch("/api/admin/queue");
    const json = await res.json();
    setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function retryAll() {
    const res = await apiFetch("/api/admin/queue", { method: "POST", body: JSON.stringify({}) });
    const json = await res.json();
    toast.success(t("retried", { count: json.data?.retried ?? 0 }));
    void load();
  }

  if (loading || !data) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AdminKpi label={t("waiting")} value={data.waiting as number} />
        <AdminKpi label={t("active")} value={data.active as number} />
        <AdminKpi label={t("completed")} value={data.completed as number} />
        <AdminKpi label={t("failed")} value={data.failed as number} variant={(data.failed as number) > 0 ? "warning" : "default"} />
        <AdminKpi label={t("delayed")} value={data.delayed as number} />
      </div>

      <Button variant="outline" onClick={() => void retryAll()}>
        {t("retryAll")}
      </Button>

      {(data.failedJobs as Array<Record<string, unknown>>)?.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t("failedJobs")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">ID</th>
                  <th>Name</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {(data.failedJobs as Array<Record<string, unknown>>).map((j) => (
                  <tr key={String(j.id)} className="border-b border-border/50">
                    <td className="py-2 font-mono">{String(j.id)}</td>
                    <td>{String(j.name)}</td>
                    <td className="text-muted-foreground">{String(j.failedReason ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AdminLogsTable({ endpoint, tKey }: { endpoint: string; tKey: string }) {
  const t = useTranslations(tKey);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch(endpoint);
      const data = await res.json();
      setLogs(data.data?.logs ?? []);
      setLoading(false);
    })();
  }, [endpoint]);

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3">{t("time")}</th>
              <th className="py-2 pr-3">{t("level")}</th>
              <th className="py-2 pr-3">{t("source")}</th>
              <th className="py-2">{t("message")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={String(l.id)} className="border-b border-border/50">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(String(l.createdAt)).toLocaleString()}</td>
                <td className="py-2 pr-3">{String(l.level ?? l.action ?? "")}</td>
                <td className="py-2 pr-3">{String(l.source ?? l.adminEmail ?? "")}</td>
                <td className="py-2">{String(l.message ?? l.action ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function AdminTelegramPlatformContent() {
  const t = useTranslations("adminCenter.telegram");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/platform/telegram");
      const json = await res.json();
      setData(json.data);
    })();
  }, []);

  if (!data) return <Skeleton className="h-40 rounded-2xl" />;

  return (
    <div className="grid grid-cols-2 gap-3 max-w-lg">
      <AdminKpi label={t("connectedUsers")} value={data.connectedUsers as number} variant="success" />
      <AdminKpi label={t("failedWeek")} value={data.failedDeliveriesWeek as number} variant={(data.failedDeliveriesWeek as number) > 0 ? "warning" : "default"} />
    </div>
  );
}

export function AdminSecurityContent() {
  const t = useTranslations("adminCenter.security");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/security");
      setData((await res.json()).data);
    })();
  }, []);

  if (!data) return <Skeleton className="h-40 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <AdminKpi label={t("adminCount")} value={data.adminCount as number} />
        <AdminKpi label={t("unverified")} value={data.unverifiedCount as number} variant={(data.unverifiedCount as number) > 0 ? "warning" : "default"} />
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("adminsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data.admins as Array<{ email: string; name: string | null }>).map((a) => (
            <div key={a.email} className="flex justify-between border-b pb-2">
              <span>{a.name ?? a.email}</span>
              <span className="text-muted-foreground">{a.email}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminFeatureFlagsContent() {
  const t = useTranslations("adminCenter.featureFlags");
  const [flags, setFlags] = useState<Array<{ key: string; enabled: boolean; description: string | null }>>([]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/feature-flags");
      setFlags((await res.json()).data?.flags ?? []);
    })();
  }, []);

  async function toggle(key: string, enabled: boolean) {
    await apiFetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
  }

  return (
    <Card className="rounded-2xl max-w-xl">
      <CardContent className="pt-6 space-y-3">
        {flags.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 border-b pb-3">
            <div>
              <p className="font-medium text-sm">{f.key}</p>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </div>
            <Button
              size="sm"
              variant={f.enabled ? "default" : "outline"}
              onClick={() => void toggle(f.key, !f.enabled)}
            >
              {f.enabled ? t("on") : t("off")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminBackupsContent() {
  const t = useTranslations("adminCenter.backups");
  return (
    <Card className="rounded-2xl max-w-xl">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>{t("desc")}</p>
        <p className="font-mono text-xs bg-muted p-3 rounded-lg">{t("commandHint")}</p>
      </CardContent>
    </Card>
  );
}

export function AdminBillingContent() {
  const t = useTranslations("adminCenter.billing");
  return (
    <Card className="rounded-2xl max-w-xl opacity-60">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{t("comingSoon")}</CardContent>
    </Card>
  );
}
