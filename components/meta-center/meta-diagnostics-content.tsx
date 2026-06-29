"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy, Send } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { getMetaUserErrorMessage } from "@/lib/meta-user-errors";

type CheckRow = { label: string; ok: boolean | null; detail?: string | null };

function CheckList({ rows }: { rows: CheckRow[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-start gap-2 text-sm">
          {row.ok === true ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : row.ok === false ? (
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <span className="font-medium">{row.label}</span>
            {row.detail && (
              <p className="text-xs text-muted-foreground break-all mt-0.5">{row.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

type DiagnosticsData = {
  showPlatformDetails?: boolean;
  platform?: {
    nextAuthUrl?: string;
    redirectUri?: string;
    metaAppIdPresent?: boolean;
    metaAppSecretPresent?: boolean;
    metaLoginConfigIdPresent?: boolean;
    metaLoginConfigIdValid?: boolean;
    metaWebhookVerifyTokenPresent?: boolean;
  } | null;
  oauth?: {
    redirectUri?: string;
    oauthUrl?: string | null;
    configIdValid?: boolean;
    lastOAuthError?: { reason?: string; safeMessage?: string } | null;
  } | null;
  facebookApi?: Record<string, { ok: boolean; message?: string }>;
  permissions?: { grantedScopes: string[]; missingScopes: string[]; valid: boolean };
  database?: Record<string, number | boolean>;
  webhook?: Record<string, string | boolean | null>;
  worker?: Record<string, number | boolean>;
  telegram?: Record<string, string | boolean | null>;
};

export function MetaDiagnosticsContent() {
  const t = useTranslations("metaCenter.diagnostics");
  const locale = useLocale();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingTelegram, setTestingTelegram] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/meta/diagnostics");
      const json = await res.json();
      if (json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }

  async function testTelegram() {
    setTestingTelegram(true);
    try {
      const res = await apiFetch("/api/telegram/test", { method: "POST" });
      const json = await res.json();
      if (json.data?.ok) toast.success(t("telegramTestOk"));
      else toast.error(json.error?.message ?? t("telegramTestFailed"));
      await load();
    } catch {
      toast.error(t("telegramTestFailed"));
    } finally {
      setTestingTelegram(false);
    }
  }

  const platform = data?.platform;
  const oauth = data?.oauth;
  const facebookApi = data?.facebookApi;
  const permissions = data?.permissions;
  const database = data?.database;
  const webhook = data?.webhook;
  const worker = data?.worker;
  const telegram = data?.telegram;
  const lastOAuthError = oauth?.lastOAuthError;

  const oauthErrorMessage =
    lastOAuthError?.reason &&
    getMetaUserErrorMessage(
      lastOAuthError.reason,
      isAdmin,
      (key) => t(key as "errors.invalid_app_secret.user"),
      lastOAuthError.safeMessage
    );

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="diagnostics">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {loading && !data ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Boolean(data?.showPlatformDetails) && platform && (
            <Card className="rounded-2xl md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{t("platformTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckList
                  rows={[
                    { label: "NEXTAUTH_URL", ok: !!platform.nextAuthUrl, detail: String(platform.nextAuthUrl ?? "") },
                    { label: "FACEBOOK_REDIRECT_URI", ok: !!platform.redirectUri, detail: String(platform.redirectUri ?? "") },
                    { label: "META_APP_ID", ok: !!platform.metaAppIdPresent },
                    { label: "META_APP_SECRET", ok: !!platform.metaAppSecretPresent },
                    { label: "META_LOGIN_CONFIG_ID", ok: !!platform.metaLoginConfigIdPresent && !!platform.metaLoginConfigIdValid },
                    { label: "META_WEBHOOK_VERIFY_TOKEN", ok: !!platform.metaWebhookVerifyTokenPresent },
                  ]}
                />
                {oauth?.redirectUri && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void copyText(String(oauth.redirectUri))}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      {t("copyRedirectUri")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("oauthTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckList
                rows={[
                  { label: t("oauthUrlGenerated"), ok: !!oauth?.oauthUrl },
                  { label: t("configIdValid"), ok: !!oauth?.configIdValid },
                  { label: t("redirectUriValid"), ok: !!oauth?.redirectUri },
                ]}
              />
              {oauthErrorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  {oauthErrorMessage}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("apiTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckList
                rows={[
                  { label: "/me", ok: facebookApi?.me?.ok ?? false },
                  { label: "/me/businesses", ok: facebookApi?.businesses?.ok ?? false },
                  { label: "/me/accounts", ok: facebookApi?.accounts?.ok ?? false },
                  { label: "/me/adaccounts", ok: facebookApi?.adaccounts?.ok ?? false },
                  {
                    label: t("permissionsValid"),
                    ok: permissions?.valid ?? false,
                    detail: permissions?.missingScopes?.length
                      ? `${t("missing")}: ${permissions.missingScopes.join(", ")}`
                      : undefined,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("databaseTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckList
                rows={[
                  { label: t("connectionExists"), ok: !!database?.connectionExists },
                  { label: t("businessesCount"), ok: (Number(database?.businessesCount) ?? 0) >= 0, detail: String(database?.businessesCount ?? 0) },
                  { label: t("pagesCount"), ok: true, detail: String(database?.pagesCount ?? 0) },
                  { label: t("formsCount"), ok: true, detail: String(database?.formsCount ?? 0) },
                  { label: t("leadsCount"), ok: true, detail: String(database?.leadsCount ?? 0) },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("webhookTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckList
                rows={[
                  { label: t("webhookVerified"), ok: !!webhook?.verified },
                  {
                    label: t("lastVerification"),
                    ok: webhook?.lastVerificationAt ? true : null,
                    detail: webhook?.lastVerificationAt
                      ? formatDate(String(webhook.lastVerificationAt), locale)
                      : t("never"),
                  },
                  {
                    label: t("lastLeadgenEvent"),
                    ok: webhook?.lastEventAt ? true : null,
                    detail: webhook?.lastLeadgenId
                      ? String(webhook.lastLeadgenId)
                      : undefined,
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("workerTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckList
                rows={[
                  { label: t("redisConnected"), ok: !!worker?.redisConnected },
                  { label: t("queueReady"), ok: !!worker?.queueReady },
                  {
                    label: t("failedJobs"),
                    ok: Number(worker?.failedWebhookJobs) === 0,
                    detail: String(worker?.failedWebhookJobs ?? 0),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("telegramTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckList
                rows={[
                  { label: t("telegramConnected"), ok: !!telegram?.connected },
                  {
                    label: t("lastDelivery"),
                    ok: telegram?.lastDeliveryStatus === "success" ? true : telegram?.lastDeliveryStatus ? false : null,
                    detail: telegram?.lastDeliveryAt
                      ? formatDate(String(telegram.lastDeliveryAt), locale)
                      : undefined,
                  },
                ]}
              />
              <Button size="sm" onClick={() => void testTelegram()} disabled={testingTelegram}>
                <Send className={cn("h-4 w-4 mr-2", testingTelegram && "animate-pulse")} />
                {t("testTelegram")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </MetaSectionShell>
  );
}
