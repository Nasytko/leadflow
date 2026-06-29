"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook } from "lucide-react";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FacebookOAuthErrorAlert } from "@/components/facebook/facebook-oauth-error-alert";
import { FacebookLoginConfigCard } from "@/components/facebook/facebook-login-config-card";
import type { LastOAuthErrorData } from "@/components/facebook/facebook-oauth-error-alert";
import { apiFetch } from "@/lib/client-api";

async function fetchWithTimeout(url: string, ms = 10000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    return await apiFetch(url, { signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

export function MetaConnectSection() {
  const t = useTranslations("metaCenter.connect");
  const tFb = useTranslations("facebook");
  const [connecting, setConnecting] = useState(false);
  const [metaConfigured, setMetaConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [facebookName, setFacebookName] = useState<string | null>(null);
  const [lastOAuthError, setLastOAuthError] = useState<LastOAuthErrorData | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [configPresent, setConfigPresent] = useState(false);
  const [configValid, setConfigValid] = useState(false);

  useEffect(() => {
    void (async () => {
      const [statusRes, debugRes] = await Promise.all([
        fetchWithTimeout("/api/facebook/status"),
        fetchWithTimeout("/api/facebook/oauth-debug"),
      ]);
      const status = await statusRes.json();
      const debug = await debugRes.json();
      if (status.data) {
        setMetaConfigured(status.data.metaConfigured);
        setConnected(status.data.connected);
        setFacebookName(status.data.facebook?.facebookUserName ?? null);
        setLastOAuthError(status.data.lastOAuthError ?? null);
      }
      if (debug.data) {
        setConfigId(debug.data.configId ?? debug.data.loginConfigIdUsed);
        setConfigPresent(debug.data.configIdPresent ?? !!debug.data.loginConfigIdUsed);
        setConfigValid(debug.data.configIdValid ?? debug.data.isLoginConfigIdValid);
      }
    })();
  }, []);

  async function handleConnect() {
    if (!metaConfigured) {
      toast.error(tFb("connectDisabled"));
      return;
    }
    setConnecting(true);
    try {
      const res = await fetchWithTimeout("/api/facebook/connect");
      const data = await res.json();
      if (data.data?.url) window.location.href = data.data.url;
      else toast.error(data.error?.message ?? tFb("oauthFailed"));
    } catch {
      toast.error(tFb("oauthFailed"));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="connect">
      {lastOAuthError && !connected && (
        <FacebookOAuthErrorAlert
          error={lastOAuthError}
          onOpenDiagnostics={() => {
            window.location.href = "/meta/health";
          }}
        />
      )}

      <FacebookLoginConfigCard
        configId={configId}
        configIdPresent={configPresent}
        configIdValid={configValid}
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            {connected ? t("connectedTitle") : t("ctaTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && facebookName && (
            <p className="text-sm">
              {tFb("connectedAs")}: <strong>{facebookName}</strong>
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t("permissionsHint")}</p>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>{t("permPages")}</li>
            <li>{t("permLeads")}</li>
            <li>{t("permAds")}</li>
            <li>{t("permBusiness")}</li>
          </ul>
          <Button
            size="lg"
            onClick={() => void handleConnect()}
            disabled={!metaConfigured || connecting}
            className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
          >
            <Facebook className="h-4 w-4 mr-2" />
            {connecting ? t("connecting") : connected ? tFb("reconnectButton") : t("connectButton")}
          </Button>
        </CardContent>
      </Card>
    </MetaSectionShell>
  );
}
