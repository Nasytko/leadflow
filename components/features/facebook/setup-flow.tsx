"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ConnectionPageShell } from "@/components/features/connections/connection-page-shell";
import { SetupStepper } from "@/components/features/connections/setup-stepper";
import { MetaAccountCard } from "@/components/features/facebook/account/account-card";
import { FacebookOAuthErrorAlert } from "@/components/features/facebook/account/oauth-error-alert";
import { FacebookLoginConfigCard } from "@/components/features/facebook/account/login-config-card";
import { FacebookBusinessesSection } from "@/components/features/facebook/business/business-setup-section";
import { FacebookPagesSection } from "@/components/features/facebook/pages/pages-setup-section";
import { FacebookTestLeadCard } from "@/components/features/facebook/health/test-lead-card";
import { FacebookWebhookDiagnostics } from "@/components/features/facebook/health/webhook-diagnostics";
import { WebhookSetupWizard } from "@/components/features/facebook/webhook/webhook-setup-wizard";
import { FacebookTestLeadExperience } from "@/components/features/facebook/testing/test-lead-experience";
import { FacebookFormsSetupPanel } from "@/components/features/facebook/forms/forms-setup-panel";
import { FacebookIntelligenceDashboard } from "@/components/features/facebook/intelligence-dashboard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import {
  FACEBOOK_SETUP_STEPS,
  resolveFacebookSetupState,
  type FacebookSetupStepId,
} from "@/lib/connections/facebook-setup-state";
import type { LastOAuthErrorData } from "@/components/features/facebook/account/oauth-error-alert";
import { useMetaFacebookStatus } from "@/hooks/use-meta-facebook-status";
import { ChevronLeft, ChevronRight } from "lucide-react";

async function fetchWithTimeout(url: string, ms = 10000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    return await apiFetch(url, { signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

type StatusPayload = {
  metaConfigured: boolean;
  connected: boolean;
  connectedPagesCount: number;
  totalPagesCount: number;
  activeFormsCount: number;
  businessesCount: number;
  webhookVerified: boolean;
  facebook: {
    status: string;
    uiStatus: string;
    tokenInvalid?: boolean;
    facebookUserId?: string | null;
    facebookUserName?: string | null;
    facebookUserEmail?: string | null;
    facebookUserPictureUrl?: string | null;
    connectedAt?: string | null;
    lastCheckedAt?: string | null;
    updatedAt?: string | null;
    tokenExpiresAt?: string | null;
    connectedPagesCount?: number;
    activeFormsCount?: number;
    lastError?: string | null;
    pagesAccessMissing?: boolean;
  };
  lastOAuthError?: LastOAuthErrorData | null;
};

export function FacebookSetupFlow() {
  const t = useTranslations("connections.facebook");
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") as FacebookSetupStepId | null;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configPresent, setConfigPresent] = useState(false);
  const [configValid, setConfigValid] = useState(false);
  const [manualStepIndex, setManualStepIndex] = useState<number | null>(null);

  const {
    status: metaStatus,
    loading: metaLoading,
    syncing,
    syncBusinesses,
    syncPages,
    togglePage,
    reload: reloadMeta,
  } = useMetaFacebookStatus();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, debugRes] = await Promise.all([
        fetchWithTimeout("/api/facebook/status"),
        fetchWithTimeout("/api/facebook/oauth-debug"),
      ]);
      const statusJson = await statusRes.json();
      const debug = await debugRes.json();
      if (statusJson.data) setStatus(statusJson.data);
      if (debug.data) {
        setConfigId(debug.data.configId ?? debug.data.loginConfigIdUsed);
        setConfigPresent(debug.data.configIdPresent ?? !!debug.data.loginConfigIdUsed);
        setConfigValid(debug.data.configIdValid ?? debug.data.isLoginConfigIdValid);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setupInput = status
    ? {
        connected: status.connected,
        businessesCount: status.businessesCount ?? 0,
        connectedPagesCount: status.connectedPagesCount,
        totalPagesCount: status.totalPagesCount,
        activeFormsCount: status.activeFormsCount,
        webhookVerified: status.webhookVerified,
        hasConnectionError: !!status.facebook?.lastError,
        pagesAccessMissing: status.facebook?.uiStatus === "pages_missing",
      }
    : null;

  const setupState = setupInput ? resolveFacebookSetupState(setupInput) : null;

  const resolvedIndex =
    stepParam && FACEBOOK_SETUP_STEPS.includes(stepParam)
      ? FACEBOOK_SETUP_STEPS.indexOf(stepParam)
      : (setupState?.stepIndex ?? 0);

  const activeIndex = manualStepIndex ?? resolvedIndex;
  const activeStepId = FACEBOOK_SETUP_STEPS[activeIndex] ?? "connect";

  const stepItems =
    setupState?.stepStatuses
      ? FACEBOOK_SETUP_STEPS.map((id) => ({
          id,
          label: t(`steps.${id}`),
          status: setupState.stepStatuses[id],
        }))
      : [];

  const account = status?.facebook
    ? {
        connected: status.connected,
        status: status.facebook.status,
        uiStatus: status.facebook.uiStatus,
        tokenInvalid: status.facebook.tokenInvalid,
        facebookUserId: status.facebook.facebookUserId,
        facebookUserName: status.facebook.facebookUserName,
        facebookUserEmail: status.facebook.facebookUserEmail,
        facebookUserPictureUrl: status.facebook.facebookUserPictureUrl,
        connectedAt: status.facebook.connectedAt,
        lastCheckedAt: status.facebook.lastCheckedAt,
        updatedAt: status.facebook.updatedAt,
        tokenExpiresAt: status.facebook.tokenExpiresAt,
        connectedPagesCount:
          status.facebook.connectedPagesCount ?? status.connectedPagesCount,
        activeFormsCount: status.facebook.activeFormsCount ?? status.activeFormsCount,
        lastError: status.facebook.lastError,
      }
    : null;

  const onRefresh = useCallback(async () => {
    await load();
    await reloadMeta();
  }, [load, reloadMeta]);

  const showSummary = status?.connected && !!status.facebook?.facebookUserId;

  if (loading && !status) {
    return (
      <ConnectionPageShell title={t("title")} description={t("description")}>
        <Skeleton className="h-56 w-full rounded-lg" />
      </ConnectionPageShell>
    );
  }

  return (
    <ConnectionPageShell title={t("title")} description={t("description")} helpKey="connect">
      {status?.lastOAuthError && !status.connected && (
        <FacebookOAuthErrorAlert
          error={status.lastOAuthError}
          onOpenDiagnostics={() => {
            window.location.href = "/health";
          }}
        />
      )}

      {showSummary ? (
        <FacebookIntelligenceDashboard />
      ) : (
        <div className="space-y-8">
          <div className="hidden md:block">
            <SetupStepper
              steps={stepItems}
              activeIndex={activeIndex}
              totalLabel={t("stepProgress", {
                current: activeIndex + 1,
                total: FACEBOOK_SETUP_STEPS.length,
              })}
              onStepClick={(i) => setManualStepIndex(i)}
            />
          </div>
          <div className="md:hidden">
            <SetupStepper
              compact
              steps={stepItems}
              activeIndex={activeIndex}
              totalLabel={t("stepProgress", {
                current: activeIndex + 1,
                total: FACEBOOK_SETUP_STEPS.length,
              })}
            />
          </div>

          <div className="surface px-6 py-8 sm:px-8 min-h-[200px]">
            {activeStepId === "connect" && (
              <div className="space-y-6">
                <MetaAccountCard
                  account={account}
                  metaConfigured={status?.metaConfigured ?? false}
                  loading={loading}
                  onRefresh={onRefresh}
                />
                {!status?.connected && (
                  <>
                    <FacebookLoginConfigCard
                      configId={configId}
                      configIdPresent={configPresent}
                      configIdValid={configValid}
                    />
                    <p className="type-caption text-muted-foreground">{t("connectHint")}</p>
                  </>
                )}
              </div>
            )}

            {activeStepId === "business" && (
              <div className="space-y-4">
                <p className="type-body text-muted-foreground">{t("stepsDesc.business")}</p>
                {!status?.connected ? (
                  <p className="type-caption text-muted-foreground">{t("connectFirst")}</p>
                ) : (
                  <FacebookBusinessesSection
                    businesses={metaStatus?.businesses ?? []}
                    pagesCount={metaStatus?.totalPagesCount ?? 0}
                    syncing={syncing === "businesses"}
                    onSync={() => void syncBusinesses()}
                  />
                )}
              </div>
            )}

            {activeStepId === "pages" && (
              <div className="space-y-4">
                <p className="type-body text-muted-foreground">{t("stepsDesc.pages")}</p>
                {!status?.connected ? (
                  <p className="type-caption text-muted-foreground">{t("connectFirst")}</p>
                ) : metaLoading && !metaStatus ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : (
                  <FacebookPagesSection
                    pages={metaStatus?.pages ?? []}
                    connectedPagesCount={metaStatus?.connectedPagesCount ?? 0}
                    hasFacebookSession={!!status.facebook?.facebookUserId}
                    syncing={syncing === "pages"}
                    onSync={() => void syncPages()}
                    onTogglePage={(pageId, isConnected) => void togglePage(pageId, isConnected)}
                  />
                )}
              </div>
            )}

            {activeStepId === "forms" && (
              <div className="space-y-4">
                <p className="type-body text-muted-foreground">{t("stepsDesc.forms")}</p>
                <FacebookFormsSetupPanel />
              </div>
            )}

            {activeStepId === "webhook" && (
              <div className="space-y-6">
                <p className="type-body text-muted-foreground">{t("stepsDesc.webhook")}</p>
                <WebhookSetupWizard />
                <FacebookTestLeadCard />
                <FacebookTestLeadExperience />
                <FacebookWebhookDiagnostics />
              </div>
            )}

            {activeStepId === "complete" && (
              <div className="text-center space-y-4 py-8">
                <StatusBadge status="ok" label={t("steps.complete")} />
                <p className="type-body text-muted-foreground">{t("completeDesc")}</p>
                <Button asChild className="min-h-11">
                  <Link href="/dashboard">{t("goMissionControl")}</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex md:hidden justify-between gap-3">
            <Button
              variant="outline"
              className="min-h-11 flex-1"
              disabled={activeIndex <= 0}
              onClick={() => setManualStepIndex(Math.max(0, activeIndex - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("back")}
            </Button>
            <Button
              className="min-h-11 flex-1"
              disabled={activeIndex >= FACEBOOK_SETUP_STEPS.length - 1}
              onClick={() =>
                setManualStepIndex(Math.min(FACEBOOK_SETUP_STEPS.length - 1, activeIndex + 1))
              }
            >
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </ConnectionPageShell>
  );
}
