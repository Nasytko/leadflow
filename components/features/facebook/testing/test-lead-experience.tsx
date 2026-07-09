"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ExternalLink, RefreshCw, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatTimeAgo } from "@/lib/utils";

const META_TESTING_TOOL_URL = "https://developers.facebook.com/tools/lead-ads-testing/";

type DashboardStats = {
  lastLeadAt?: string | null;
};

type WebhookDiagnostics = {
  lastLeadgenAt?: string | null;
  lastLeadgenStatus?: string | null;
  webhookVerified: boolean;
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

type NodeState = "pending" | "success" | "failed";

export function FacebookTestLeadExperience() {
  const t = useTranslations("connections.facebook.testLead");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [wh, setWh] = useState<WebhookDiagnostics | null>(null);
  const [telegramResult, setTelegramResult] = useState<"unknown" | "ok" | "fail">("unknown");

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

  const facebookNode: NodeState = wh?.lastLeadgenAt ? "success" : "pending";
  const orvixNode: NodeState = dash?.lastLeadAt ? "success" : "pending";
  const processingNode: NodeState =
    wh?.lastWebhookError ? "failed" : wh?.lastLeadgenAt ? "success" : "pending";
  const telegramNode: NodeState =
    telegramResult === "ok" ? "success" : telegramResult === "fail" ? "failed" : "pending";

  const secondsHint = useMemo(() => {
    if (!wh?.lastLeadgenAt || !dash?.lastLeadAt) return null;
    const a = new Date(wh.lastLeadgenAt).getTime();
    const b = new Date(dash.lastLeadAt).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const sec = Math.max(0, Math.round((b - a) / 1000));
    return `${sec}s`;
  }, [wh?.lastLeadgenAt, dash?.lastLeadAt]);

  async function testTelegram() {
    setTestingTelegram(true);
    try {
      const ok = await sendTelegramTest();
      setTelegramResult(ok ? "ok" : "fail");
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-6 space-y-5">
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
              {t("openTool")}
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Node label={t("nodeFacebook")} state={facebookNode} hint={wh?.lastLeadgenAt ? formatTimeAgo(wh.lastLeadgenAt, locale) : t("pending")} />
        <Node label={t("nodeOrvix")} state={orvixNode} hint={dash?.lastLeadAt ? formatTimeAgo(dash.lastLeadAt, locale) : t("pending")} />
        <Node label={t("nodeProcessing")} state={processingNode} hint={wh?.lastWebhookError ? t("processingIssue") : t("ok")} />
        <Node label={t("nodeTelegram")} state={telegramNode} hint={telegramResult === "unknown" ? t("notTested") : telegramResult === "ok" ? t("ok") : t("failed")} />
      </div>

      {secondsHint ? (
        <p className="type-caption text-muted-foreground">
          {t("timeHint", { s: secondsHint })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <Button className="min-h-11" disabled={testingTelegram} onClick={() => void testTelegram()}>
          <Play className="h-4 w-4 mr-2" />
          {t("testTelegram")}
        </Button>
        {telegramResult === "fail" ? (
          <p className="type-caption text-muted-foreground">
            {t("telegramFailHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Node({ label, state, hint }: { label: string; state: NodeState; hint: string }) {
  const icon =
    state === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    ) : state === "failed" ? (
      <AlertTriangle className="h-4 w-4 text-destructive" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
    );

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4 space-y-1",
        state === "success" && "border-emerald-500/25 bg-emerald-500/[0.03]",
        state === "failed" && "border-destructive/25 bg-destructive/[0.03]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="type-caption text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="type-body font-semibold">{hint}</p>
    </div>
  );
}

