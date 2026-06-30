"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/admin/admin-shell";
import { apiFetch } from "@/lib/client-api";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Check = {
  id: string;
  category: string;
  labelKey: string;
  status: "ok" | "warning" | "error" | "unknown";
  message?: string;
  detail?: string;
};

export function AdminHealthContent() {
  const t = useTranslations("adminCenter.health");
  const [checks, setChecks] = useState<Check[]>([]);
  const [status, setStatus] = useState("healthy");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    const res = await apiFetch("/api/admin/health");
    const data = await res.json();
    setChecks(data.data?.checks ?? []);
    setStatus(data.data?.status ?? "healthy");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function runFull() {
    setRunning(true);
    try {
      const res = await apiFetch("/api/admin/health/diagnostics", { method: "POST" });
      const data = await res.json();
      if (data.data) {
        setChecks(data.data.checks);
        setStatus(data.data.status);
        toast.success(t("diagnosticsDone"));
      }
    } catch {
      toast.error(t("diagnosticsFailed"));
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  const grouped = checks.reduce<Record<string, Check[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => void runFull()} disabled={running}>
          <RefreshCw className={cn("h-4 w-4 mr-2", running && "animate-spin")} />
          {t("runFull")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t(`status.${status}`)}</p>

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm capitalize">{t(`category.${cat}`)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <StatusDot status={c.status} />
                  <span>{t(c.labelKey as "checkDatabase")}</span>
                </div>
                <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {c.detail ?? c.message ?? c.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
