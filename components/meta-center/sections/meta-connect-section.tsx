"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FacebookOAuthErrorAlert } from "@/components/facebook/facebook-oauth-error-alert";
import { FacebookLoginConfigCard } from "@/components/facebook/facebook-login-config-card";
import { MetaAccountCard } from "@/components/features/meta/meta-account-card";
import type { LastOAuthErrorData } from "@/components/facebook/facebook-oauth-error-alert";
import { apiFetch } from "@/lib/client-api";
import { Skeleton } from "@/components/ui/skeleton";

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
  activeFormsCount: number;
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
  };
  lastOAuthError?: LastOAuthErrorData | null;
};

export function MetaConnectSection() {
  const t = useTranslations("metaCenter.connect");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configPresent, setConfigPresent] = useState(false);
  const [configValid, setConfigValid] = useState(false);

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

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="connect">
      {loading && !status ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {status?.lastOAuthError && !status.connected && (
            <FacebookOAuthErrorAlert
              error={status.lastOAuthError}
              onOpenDiagnostics={() => {
                window.location.href = "/meta/health";
              }}
            />
          )}

          <MetaAccountCard
            account={account}
            metaConfigured={status?.metaConfigured ?? false}
            loading={loading}
            onRefresh={load}
          />

          {!status?.connected && (
            <>
              <FacebookLoginConfigCard
                configId={configId}
                configIdPresent={configPresent}
                configIdValid={configValid}
              />

              <div className="surface px-6 py-6 sm:px-8 space-y-3">
                <p className="type-body text-muted-foreground">{t("permissionsHint")}</p>
                <ul className="type-caption text-muted-foreground list-disc pl-5 space-y-1">
                  <li>{t("permPages")}</li>
                  <li>{t("permLeads")}</li>
                  <li>{t("permAds")}</li>
                  <li>{t("permBusiness")}</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </MetaSectionShell>
  );
}
