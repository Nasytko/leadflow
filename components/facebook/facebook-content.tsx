"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetaSettingsForm } from "@/components/integrations/meta-settings-form";
import {
  Facebook,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowRight,
  Zap,
  FileText,
  Send,
  Layers,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Page = {
  id: string;
  pageId: string;
  pageName: string;
  connected: boolean;
};

type StatusData = {
  metaConfigured: boolean;
  connected: boolean;
  connectionStatus: string;
  pages: Page[];
  connectedPagesCount: number;
  totalPagesCount: number;
  activeFormsCount: number;
  telegramConnected: boolean;
  webhookUrl: string;
  redirectUri: string;
  setupSteps: {
    metaApp: boolean;
    facebookOAuth: boolean;
    pagesSelected: boolean;
    formsEnabled: boolean;
    telegram: boolean;
  };
};

async function fetchWithTimeout(url: string, options?: RequestInit, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function StatCard({
  label,
  value,
  done,
  icon: Icon,
}: {
  label: string;
  value: string;
  done?: boolean;
  icon: React.ElementType;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all",
        done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="font-semibold text-sm">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            done ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ProgressStep({
  done,
  active,
  title,
  step,
}: {
  done: boolean;
  active: boolean;
  title: string;
  step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-[#1877F2] text-white ring-4 ring-[#1877F2]/20"
            : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <p
        className={cn(
          "text-[10px] sm:text-xs text-center leading-tight max-w-[72px]",
          active ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        {title}
      </p>
    </div>
  );
}

export function FacebookContent() {
  const t = useTranslations("facebook");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(false);
      const res = await fetchWithTimeout("/api/facebook/status");
      const data = await res.json();
      if (data.data) setStatus(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (searchParams.get("success") === "connected") {
      toast.success(t("connectedSuccess"));
      loadData();
    }
    const err = searchParams.get("error");
    if (err === "oauth_denied") toast.error(t("oauthDenied"));
    if (err === "oauth_failed" || err === "invalid_state") toast.error(t("oauthFailed"));
  }, [searchParams, t, loadData]);

  async function handleConnect() {
    if (!status?.metaConfigured) {
      toast.error(t("connectDisabled"));
      return;
    }
    setConnecting(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/connect");
      const data = await res.json();
      if (data.data?.url) window.location.href = data.data.url;
      else toast.error(data.error?.message ?? t("oauthFailed"));
    } catch {
      toast.error(t("oauthFailed"));
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await fetchWithTimeout("/api/facebook/pages", { method: "DELETE" });
    toast.success(t("disconnectedSuccess"));
    loadData();
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/pages", { method: "POST" });
      const data = await res.json();
      if (data.error) toast.error(data.error.message);
      else { toast.success(tCommon("success")); loadData(); }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setSyncing(false);
    }
  }

  async function togglePage(pageId: string, isConnected: boolean) {
    await fetchWithTimeout(`/api/facebook/pages/${pageId}`, {
      method: isConnected ? "DELETE" : "POST",
    });
    toast.success(isConnected ? t("pageDisconnected") : t("pageConnected"));
    loadData();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#1877F2]" />
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <Card className="border-destructive/30 rounded-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <p>{t("loadError")}</p>
          <Button onClick={() => { setLoading(true); loadData(); }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("checkConnection")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const steps = status.setupSteps;
  const completedCount = [
    steps.metaApp,
    steps.facebookOAuth,
    steps.pagesSelected,
    steps.formsEnabled,
    steps.telegram,
  ].filter(Boolean).length;

  const progressSteps = [
    { done: steps.metaApp, title: t("progressStep1"), active: !steps.metaApp },
    { done: steps.facebookOAuth, title: t("progressStep2"), active: steps.metaApp && !steps.facebookOAuth },
    { done: steps.pagesSelected, title: t("progressStep3"), active: steps.facebookOAuth && !steps.pagesSelected },
    { done: steps.formsEnabled, title: t("progressStep4"), active: steps.pagesSelected && !steps.formsEnabled },
    { done: steps.telegram, title: t("progressStep5"), active: steps.formsEnabled && !steps.telegram },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#1877F2]/10 via-background to-background p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1877F2]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1877F2] shadow-lg shadow-[#1877F2]/25">
            <Facebook className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">{t("subtitle")}</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 max-w-xs h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1877F2] to-emerald-500 transition-all duration-500"
                  style={{ width: `${(completedCount / 5) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("progressLabel", { done: completedCount, total: 5 })}
              </span>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="relative flex items-start justify-between gap-1 mt-8 pt-6 border-t border-border/50">
          {progressSteps.map((s, i) => (
            <ProgressStep key={i} step={i + 1} done={s.done} active={s.active} title={s.title} />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("statMeta")}
          value={status.metaConfigured ? t("metaReady") : t("metaNotReady")}
          done={status.metaConfigured}
          icon={Zap}
        />
        <StatCard
          label={t("statFacebook")}
          value={status.connected ? t("fbConnected") : t("fbNotConnected")}
          done={status.connected}
          icon={Facebook}
        />
        <StatCard
          label={t("statPages")}
          value={String(status.connectedPagesCount)}
          done={status.connectedPagesCount > 0}
          icon={Layers}
        />
        <StatCard
          label={t("statForms")}
          value={String(status.activeFormsCount)}
          done={status.activeFormsCount > 0}
          icon={FileText}
        />
      </div>

      {/* Meta App Settings — always visible */}
      <Card className="rounded-2xl border-[#1877F2]/20 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#1877F2]/5 to-transparent border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2]/15">
              <Zap className="h-5 w-5 text-[#1877F2]" />
            </div>
            <div>
              <CardTitle>{t("metaSetupTitle")}</CardTitle>
              <CardDescription>{t("metaSetupDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <MetaSettingsForm compact onSaved={loadData} />
        </CardContent>
      </Card>

      {/* Connect Facebook */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            {t("connectSectionTitle")}
          </CardTitle>
          <CardDescription>{t("connectSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {!status.connected ? (
              <Button
                onClick={handleConnect}
                disabled={!status.metaConfigured || connecting}
                size="lg"
                className="bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-md shadow-[#1877F2]/20"
              >
                <Facebook className="h-4 w-4 mr-2" />
                {connecting ? tCommon("loading") : t("connectButton")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSync} disabled={syncing} size="lg">
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  {t("syncPages")}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect} size="lg">
                  {t("disconnectButton")}
                </Button>
              </>
            )}
          </div>
          {!status.metaConfigured && (
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("connectDisabled")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pages */}
      {status.connected && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("yourPages")}</CardTitle>
            <CardDescription>
              {t("pagesConnected", { count: status.connectedPagesCount })} / {status.totalPagesCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.pages.length === 0 ? (
              <div className="text-center py-10 space-y-4 rounded-xl border border-dashed">
                <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-muted-foreground text-sm">{t("noPages")}</p>
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  {t("syncPages")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {status.pages.map((page) => (
                  <div
                    key={page.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 hover:border-[#1877F2]/30 hover:bg-[#1877F2]/[0.02] transition-all"
                  >
                    <div>
                      <p className="font-medium">{page.pageName}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        ID: {page.pageId}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={page.connected ? "success" : "secondary"}>
                        {page.connected ? tCommon("connected") : tCommon("notConnected")}
                      </Badge>
                      <Button
                        size="sm"
                        variant={page.connected ? "outline" : "default"}
                        className={!page.connected ? "bg-[#1877F2] hover:bg-[#166FE5] text-white" : ""}
                        onClick={() => togglePage(page.id, page.connected)}
                      >
                        {page.connected ? t("disconnectPage") : t("connectPage")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      {status.connected && (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/forms">
              <FileText className="h-4 w-4 mr-2" />
              {t("goToForms")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/telegram">
              <Send className="h-4 w-4 mr-2" />
              {t("goToTelegram")}
            </Link>
          </Button>
        </div>
      )}

      {/* Wiki link */}
      <Card className="rounded-2xl border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t("wikiCardTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("wikiCardDesc")}</p>
            </div>
          </div>
          <Button variant="outline" asChild className="rounded-xl shrink-0">
            <Link href="/wiki">
              {t("openWiki")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
