"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Play, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatTimeAgo } from "@/lib/utils";

const META_TESTING_TOOL_URL = "https://developers.facebook.com/tools/lead-ads-testing/";

type DashboardStats = {
  lastLeadAt?: string | null;
  facebookConnected: boolean;
  telegramConnected: boolean;
};

type WebhookDiagnostics = {
  webhookVerified: boolean;
  lastLeadgenAt?: string | null;
  lastWebhookError: string | null;
};

async function fetchDashboard(): Promise<DashboardStats | null> {
  const res = await fetch("/api/dashboard/stats");
  const json = await res.json();
  return json.data ?? null;
}

async function fetchWebhookDiagnostics(): Promise<WebhookDiagnostics | null> {
  const res = await fetch("/api/webhooks/diagnostics");
  const json = await res.json();
  return json.data ?? null;
}

async function sendTelegramTest(): Promise<boolean> {
  const res = await fetch("/api/telegram/test", { method: "POST" });
  const json = await res.json();
  return !!json.data?.sent;
}

export function FlowTestCenter() {
  const t = useTranslations("testing.flow");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [wh, setWh] = useState<WebhookDiagnostics | null>(null);
  const [telegram, setTelegram] = useState<"unknown" | "ok" | "fail">("unknown");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, w] = await Promise.all([fetchDashboard(), fetchWebhookDiagnostics()]);
      setDash(d);
      setWh(w);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run() {
    setRunning(true);
    try {
      const ok = await sendTelegramTest();
      setTelegram(ok ? "ok" : "fail");
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="type-title">{t("title")}</h2>
          <p className="type-body text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={META_TESTING_TOOL_URL} target="_blank" rel="noopener noreferrer">
              {t("openLeadTool")}
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MiniNode
          label={t("nodeSource")}
          status={dash?.facebookConnected ? "ok" : "warning"}
          hint={dash?.facebookConnected ? t("connected") : t("notConnected")}
        />
        <MiniNode
          label={t("nodeProcessing")}
          status={wh?.webhookVerified ? "ok" : "warning"}
          hint={
            wh?.lastLeadgenAt
              ? t("lastLeadAt", { time: formatTimeAgo(wh.lastLeadgenAt, locale) })
              : t("noLeadYet")
          }
        />
        <MiniNode
          label={t("nodeDelivery")}
          status={telegram === "ok" ? "ok" : telegram === "fail" ? "error" : dash?.telegramConnected ? "warning" : "warning"}
          hint={
            telegram === "unknown"
              ? t("runToTest")
              : telegram === "ok"
                ? t("telegramOk")
                : t("telegramFail")
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <Button className="min-h-11" disabled={running} onClick={() => void run()}>
          <Play className="h-4 w-4 mr-2" />
          {t("testFullFlow")}
        </Button>
        <p className="type-caption text-muted-foreground">{t("hint")}</p>
      </div>
    </section>
  );
}

function MiniNode({
  label,
  status,
  hint,
}: {
  label: string;
  status: "ok" | "warning" | "error";
  hint: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4",
        status === "ok" && "border-emerald-500/25 bg-emerald-500/[0.03]",
        status === "warning" && "border-amber-500/25 bg-amber-500/[0.03]",
        status === "error" && "border-destructive/25 bg-destructive/[0.03]"
      )}
    >
      <p className="type-caption text-muted-foreground">{label}</p>
      <p className="type-body font-semibold mt-1">{hint}</p>
    </div>
  );
}

