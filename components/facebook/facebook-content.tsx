"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetaSettingsForm } from "@/components/integrations/meta-settings-form";
import { FacebookStatusCard } from "@/components/facebook/facebook-status-card";
import { FacebookSetupWizard } from "@/components/facebook/facebook-setup-wizard";
import { FacebookWebhookDiagnostics } from "@/components/facebook/facebook-webhook-diagnostics";
import { FacebookBusinessesSection } from "@/components/facebook/facebook-businesses-section";
import { FacebookPagesSection } from "@/components/facebook/facebook-pages-section";
import {
  Facebook,
  RefreshCw,
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
  pictureUrl?: string | null;
  category?: string | null;
  link?: string | null;
  tasks?: string[];
  connected: boolean;
  webhookStatus?: string;
  syncStatus?: string;
  activeFormsCount?: number;
  totalFormsCount?: number;
  business?: {
    name: string;
    businessId: string;
  } | null;
};

type Business = {
  id: string;
  businessId: string;
  name: string;
  verificationStatus: string | null;
  pictureUrl: string | null;
  link: string | null;
};

type FacebookInfo = {
  status: string;
  uiStatus?: string;
  diagnosis?: string;
  facebookUserId?: string | null;
  facebookUserName?: string | null;
  facebookUserPictureUrl?: string | null;
  appIdUsed?: string | null;
  loginConfigIdAtAuth?: string | null;
  grantedScopes?: string[];
  missingScopes?: string[];
  connectedAt?: string | null;
  lastCheckedAt?: string | null;
  lastError?: string | null;
  lastErrorCode?: string | null;
  connected?: boolean;
  tokenInvalid?: boolean;
  pagesAccessMissing?: boolean;
};

type StatusData = {
  metaConfigured: boolean;
  hasLoginConfigId?: boolean;
  connected: boolean;
  integrationStatus?: string;
  diagnosis?: string;
  connectionStatus: string;
  tokenInvalid?: boolean;
  facebook: FacebookInfo;
  pages: Page[];
  businesses: Business[];
  businessesCount: number;
  connectedPagesCount: number;
  totalPagesCount: number;
  activeFormsCount: number;
  failedFormsCount?: number;
  telegramConnected: boolean;
  webhookVerified?: boolean;
  showAdvancedMetaSettings?: boolean;
  webhookUrl: string;
  redirectUri: string;
  setupSteps: {
    facebookAccount: boolean;
    businessPortfolio: boolean;
    pagesSelected: boolean;
    formsEnabled: boolean;
    webhookVerified: boolean;
    telegram: boolean;
    testLead: boolean;
  };
};

type DebugData = {
  diagnosis?: string;
  uiStatus?: string;
  missingScopes?: string[];
  pagesCount?: number;
  granularPageIds?: string[];
  hasLoginConfigId?: boolean;
  debug?: { scopes?: string[]; granularScopes?: Array<{ scope: string; target_ids?: string[] }> };
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

export function FacebookContent() {
  const t = useTranslations("facebook");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingBusinesses, setSyncingBusinesses] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(false);
      const res = await fetchWithTimeout("/api/facebook/status");
      const data = await res.json();
      if (data.data) {
        setStatus(data.data);
        return data.data as StatusData;
      }
      setError(true);
      return null;
    } catch {
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const oauthFullSuccess = searchParams.get("success") === "connected";
    const oauthNoPages = searchParams.get("success") === "connected_no_pages";
    const err = searchParams.get("error");
    if (err === "oauth_denied") toast.error(t("oauthDenied"));
    if (err === "oauth_failed" || err === "invalid_state") {
      const reason = searchParams.get("reason");
      toast.error(reason ?? t("oauthFailed"));
    }
    if (oauthFullSuccess || oauthNoPages) {
      loadData().then((data) => {
        if (oauthNoPages || data?.integrationStatus === "pages_missing" || data?.integrationStatus === "permissions_missing") {
          toast.warning(t("pagesAccessMissing"));
        } else if (data?.connected) {
          toast.success(t("connectedSuccess"));
        } else if (data?.facebook?.lastError) {
          toast.error(data.facebook.lastError);
        } else if (oauthFullSuccess) {
          toast.success(t("connectedSuccess"));
        }
      });
    } else if (err) {
      loadData();
    }
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

  async function handleCheckConnection() {
    setChecking(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/check", { method: "POST" });
      const data = await res.json();
      if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
        toast.error(t("tokenInvalid"));
      } else if (data.error) {
        toast.error(data.error.message ?? t("checkConnectionFailed"));
      } else if (data.data?.ok) {
        toast.success(t("checkConnectionSuccess"));
      } else if (data.data?.facebook?.uiStatus === "pages_missing" || data.data?.facebook?.uiStatus === "permissions_missing") {
        toast.warning(t("pagesAccessMissing"));
      } else {
        toast.error(data.data?.facebook?.lastError ?? t("checkConnectionFailed"));
      }
      loadData();
    } catch {
      toast.error(t("checkConnectionFailed"));
    } finally {
      setChecking(false);
    }
  }

  async function handleDebugPermissions() {
    setDebugging(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/debug-permissions");
      const data = await res.json();
      if (data.data) {
        setDebugData(data.data);
        const d = data.data;
        toast.message(t("debugPermissionsTitle"), {
          description: t(`diagnosis_${d.diagnosis}` as "diagnosis_fully_connected"),
          duration: 8000,
        });
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setDebugging(false);
    }
  }

  async function handleResetFacebook(successMessage?: string) {
    setResetting(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/reset", { method: "POST" });
      const data = await res.json();
      if (data.data?.reset) {
        toast.success(successMessage ?? t("resetConnectionSuccess"));
        loadData();
      } else {
        toast.error(data.error?.message ?? tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setResetting(false);
    }
  }

  async function handleDisconnect() {
    await handleResetFacebook(t("disconnectedSuccess"));
  }

  async function handleSyncBusinesses() {
    setSyncingBusinesses(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/businesses", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error.message);
      } else {
        toast.success(tCommon("success"));
        loadData();
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setSyncingBusinesses(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/pages", { method: "POST" });
      const data = await res.json();
      if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
        toast.error(t("tokenInvalid"));
        loadData();
      } else if (data.error?.code === "PAGES_ACCESS_MISSING") {
        toast.warning(t("pagesAccessMissing"));
        loadData();
      } else if (data.error) {
        toast.error(data.error.message);
      } else {
        toast.success(tCommon("success"));
        loadData();
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setSyncing(false);
    }
  }

  async function togglePage(pageId: string, isConnected: boolean) {
    try {
      const res = await fetchWithTimeout(`/api/facebook/pages/${pageId}`, {
        method: isConnected ? "DELETE" : "POST",
      });
      const data = await res.json();
      if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
        toast.error(t("tokenInvalid"));
        loadData();
        return;
      }
      if (data.error) {
        toast.error(data.error.message ?? tCommon("error"));
        loadData();
        return;
      }
      toast.success(isConnected ? t("pageDisconnected") : t("pageConnected"));
      loadData();
    } catch {
      toast.error(tCommon("error"));
    }
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

  const pagesAccessMissing =
    status.integrationStatus === "pages_missing" ||
    status.integrationStatus === "permissions_missing" ||
    status.facebook?.pagesAccessMissing;

  const hasFacebookSession =
    status.integrationStatus !== "disconnected" &&
    !!status.facebook?.facebookUserId;

  const wizardSteps = status.setupSteps;

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("onboardingTitle")}</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">{t("onboardingSubtitle")}</p>
          </div>
        </div>
        <div className="relative mt-8 pt-6 border-t border-border/50">
          <FacebookSetupWizard steps={wizardSteps} />
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
          value={
            status.integrationStatus
              ? t(`uiStatus_${status.integrationStatus}` as "uiStatus_disconnected")
              : status.connected
              ? t("fbConnected")
              : t("fbNotConnected")
          }
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

      {/* Connect Facebook — primary flow */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            {t("connectSectionTitle")}
          </CardTitle>
          <CardDescription>{t("connectSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(hasFacebookSession || status.integrationStatus !== "disconnected") && (
            <FacebookStatusCard
              facebook={status.facebook}
              locale={locale}
              hasLoginConfigId={status.hasLoginConfigId}
            />
          )}

          {debugData && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium">{t("debugPanelTitle")}</p>
              <p className="text-muted-foreground">
                {t(`diagnosis_${debugData.diagnosis}` as "diagnosis_fully_connected")}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {t("debugPagesCount", { count: debugData.pagesCount ?? 0 })}
                {" · "}
                {t("debugGranularPages", {
                  count: debugData.granularPageIds?.length ?? 0,
                })}
              </p>
            </div>
          )}

          {(status.tokenInvalid ||
            status.connectionStatus === "invalid" ||
            status.connectionStatus === "expired") && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t("tokenInvalid")}
              </p>
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={!status.metaConfigured || connecting}
                className="bg-[#1877F2] hover:bg-[#166FE5] text-white shrink-0"
              >
                {t("reconnectButton")}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {!status.connected ? (
              <>
                <Button
                  onClick={handleConnect}
                  disabled={!status.metaConfigured || connecting}
                  size="lg"
                  className="bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-md shadow-[#1877F2]/20"
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  {connecting
                    ? tCommon("loading")
                    : hasFacebookSession
                    ? t("reconnectButton")
                    : t("connectButton")}
                </Button>
                {hasFacebookSession && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void handleCheckConnection()}
                      disabled={checking}
                      size="lg"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", checking && "animate-spin")} />
                      {t("checkConnection")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleDebugPermissions()}
                      disabled={debugging}
                      size="lg"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", debugging && "animate-spin")} />
                      {t("debugPermissions")}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleSync} disabled={syncing} size="lg">
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  {t("syncPages")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleCheckConnection()}
                  disabled={checking}
                  size="lg"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", checking && "animate-spin")} />
                  {t("checkConnection")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleDebugPermissions()}
                  disabled={debugging}
                  size="lg"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", debugging && "animate-spin")} />
                  {t("debugPermissions")}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect} size="lg">
                  {t("disconnectButton")}
                </Button>
              </>
            )}
            {(status.connected ||
              hasFacebookSession ||
              status.connectionStatus === "invalid" ||
              status.connectionStatus === "expired" ||
              status.connectionStatus === "error" ||
              status.totalPagesCount > 0) && (
              <Button
                variant="outline"
                onClick={() => void handleResetFacebook()}
                disabled={resetting}
                size="lg"
                className="border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", resetting && "animate-spin")} />
                {t("resetConnection")}
              </Button>
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

      {/* Businesses */}
      {hasFacebookSession && (
        <FacebookBusinessesSection
          businesses={status.businesses ?? []}
          pagesCount={status.totalPagesCount}
          syncing={syncingBusinesses}
          onSync={() => void handleSyncBusinesses()}
        />
      )}

      {/* Pages */}
      {(status.connected || status.totalPagesCount > 0 || hasFacebookSession) && (
        <FacebookPagesSection
          pages={status.pages}
          connectedPagesCount={status.connectedPagesCount}
          hasFacebookSession={hasFacebookSession}
          syncing={syncing}
          onSync={() => void handleSync()}
          onTogglePage={(id, connected) => void togglePage(id, connected)}
        />
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

      <FacebookWebhookDiagnostics />

      {status.showAdvancedMetaSettings !== false && (
      <Card className="rounded-2xl border-dashed">
        <CardHeader
          className="cursor-pointer"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("advancedSettingsTitle")}</CardTitle>
              <CardDescription>{t("advancedSettingsDesc")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" type="button">
              {advancedOpen ? t("advancedCollapse") : t("advancedExpand")}
            </Button>
          </div>
        </CardHeader>
        {advancedOpen && (
          <CardContent className="pt-0">
            <MetaSettingsForm compact onSaved={loadData} />
          </CardContent>
        )}
      </Card>
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
