"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Copy, CheckCircle2, AlertTriangle, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type IntegrationSettingsPublic = {
  metaAppId: string;
  webhookUrl: string;
  redirectUri: string;
  hasWebhookToken: boolean;
};

type Diagnostics = {
  webhookVerified: boolean;
  lastVerificationAt: string | null;
  lastLeadgenAt?: string | null;
  lastLeadgenStatus?: string | null;
  lastWebhookError: string | null;
};

async function fetchIntegrationSettings(): Promise<IntegrationSettingsPublic | null> {
  const res = await fetch("/api/settings/integrations");
  const json = await res.json();
  return json.data?.settings ?? null;
}

async function fetchDiagnostics(): Promise<Diagnostics | null> {
  const res = await fetch("/api/webhooks/diagnostics");
  const json = await res.json();
  return json.data ?? null;
}

function buildVerifyUrl(webhookUrl: string, token: string) {
  const url = new URL(webhookUrl);
  url.searchParams.set("hub.mode", "subscribe");
  url.searchParams.set("hub.verify_token", token);
  url.searchParams.set("hub.challenge", "orvix");
  return url.toString();
}

export function WebhookSetupWizard() {
  const t = useTranslations("connections.facebook.webhookWizard");
  const [settings, setSettings] = useState<IntegrationSettingsPublic | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyResult, setVerifyResult] = useState<
    | { ok: true; message: string }
    | { ok: false; message: string; reason?: string }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([fetchIntegrationSettings(), fetchDiagnostics()]);
      setSettings(s);
      setDiag(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const callbackUrl = settings?.webhookUrl ?? "";
  const appId = settings?.metaAppId ?? "";

  const verifyUrl = useMemo(() => {
    if (!callbackUrl || !verifyToken) return null;
    try {
      return buildVerifyUrl(callbackUrl, verifyToken);
    } catch {
      return null;
    }
  }, [callbackUrl, verifyToken]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function runVerifyTest() {
    if (!settings?.webhookUrl) return;
    if (!verifyToken.trim()) {
      setVerifyResult({ ok: false, message: t("testMissingToken") });
      return;
    }

    setTesting(true);
    setVerifyResult(null);
    try {
      const url = buildVerifyUrl(settings.webhookUrl, verifyToken.trim());
      const res = await fetch(url, { method: "GET" });
      const body = await res.text().catch(() => "");
      if (res.ok && body) {
        setVerifyResult({ ok: true, message: t("testReachableOk") });
      } else if (res.status === 403) {
        setVerifyResult({
          ok: false,
          message: t("testForbidden"),
          reason: t("testForbiddenReason"),
        });
      } else {
        setVerifyResult({
          ok: false,
          message: t("testFailed"),
          reason: `${res.status}${body ? ` · ${body.slice(0, 120)}` : ""}`,
        });
      }
    } catch {
      setVerifyResult({
        ok: false,
        message: t("testFailed"),
        reason: t("testNetwork"),
      });
    } finally {
      setTesting(false);
      await load();
    }
  }

  return (
    <section className="rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-title">{t("title")}</h2>
          <p className="type-body text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border px-4 py-4 space-y-3">
          <p className="type-title">{t("step1Title")}</p>
          <p className="type-body text-muted-foreground">{t("step1Desc")}</p>

          <div className="grid gap-3">
            <div>
              <Label>{t("appId")}</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input readOnly value={appId || "—"} className="min-h-11 font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3"
                  onClick={() => void copy(appId)}
                  disabled={!appId}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>{t("callbackUrl")}</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input readOnly value={callbackUrl || "—"} className="min-h-11 font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3"
                  onClick={() => void copy(callbackUrl)}
                  disabled={!callbackUrl}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="type-caption text-muted-foreground mt-1">{t("callbackUrlHint")}</p>
            </div>

            <div>
              <Label>{t("verifyToken")}</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="min-h-11 font-mono"
                  placeholder={t("verifyTokenPlaceholder")}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3"
                  onClick={() => void copy(verifyToken)}
                  disabled={!verifyToken.trim()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="type-caption text-muted-foreground mt-1">
                {settings?.hasWebhookToken ? t("verifyTokenConfigured") : t("verifyTokenNotConfigured")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border px-4 py-4 space-y-3">
          <p className="type-title">{t("step2Title")}</p>
          <p className="type-body text-muted-foreground">{t("step2Desc")}</p>

          <ol className="type-body text-muted-foreground list-decimal pl-5 space-y-2">
            <li>{t("step2Item1")}</li>
            <li>{t("step2Item2")}</li>
            <li>{t("step2Item3")}</li>
            <li>{t("step2Item4")}</li>
            <li>{t("step2Item5")}</li>
            <li>{t("step2Item6")}</li>
            <li>{t("step2Item7")}</li>
          </ol>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" className="min-h-11" asChild>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("openConsole")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            {verifyUrl ? (
              <Button variant="ghost" className="min-h-11" onClick={() => void copy(verifyUrl)}>
                {t("copyVerifyLink")}
                <Copy className="h-4 w-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border px-4 py-4 space-y-3">
        <p className="type-title">{t("step3Title")}</p>
        <p className="type-body text-muted-foreground">{t("step3Desc")}</p>
        <ul className="type-body text-muted-foreground space-y-2">
          <li>✓ {t("step3Leadgen")}</li>
        </ul>
      </div>

      <div className="rounded-xl border px-4 py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="type-title">{t("step4Title")}</p>
            <p className="type-body text-muted-foreground">{t("step4Desc")}</p>
          </div>
          <Button className="min-h-11" disabled={testing} onClick={() => void runVerifyTest()}>
            <Play className="h-4 w-4 mr-2" />
            {t("testConnection")}
          </Button>
        </div>

        {verifyResult ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 space-y-1.5",
              verifyResult.ok
                ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                : "border-amber-500/25 bg-amber-500/[0.04]"
            )}
          >
            <div className="flex items-start gap-2">
              {verifyResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <p className="type-body font-medium">{verifyResult.message}</p>
            </div>
            {verifyResult.ok ? null : verifyResult.reason ? (
              <p className="type-caption text-muted-foreground pl-6 whitespace-pre-line">{verifyResult.reason}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 type-caption text-muted-foreground">
          <div className="rounded-xl border px-3 py-3">
            <p>{t("statusVerified")}</p>
            <p className="type-body font-semibold mt-1 text-foreground">
              {diag?.webhookVerified ? t("yes") : t("no")}
            </p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p>{t("statusLastLead")}</p>
            <p className="type-body font-semibold mt-1 text-foreground">{diag?.lastLeadgenAt ?? "—"}</p>
          </div>
          <div className="rounded-xl border px-3 py-3">
            <p>{t("statusLastError")}</p>
            <p className="type-body font-semibold mt-1 text-foreground line-clamp-2">
              {diag?.lastWebhookError ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

