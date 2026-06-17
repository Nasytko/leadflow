"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Webhook, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type VerificationLog = {
  id: string;
  mode: string;
  tokenMasked: string;
  challengePresent: boolean;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type WebhookDiagnostics = {
  webhookVerified: boolean;
  hasWebhookVerifyToken?: boolean;
  lastVerificationAt: string | null;
  lastWebhookAt: string | null;
  lastWebhookStatus: string | null;
  lastWebhookError: string | null;
  webhookCount24h?: number;
  lastLeadgenId?: string | null;
  lastLeadgenAt?: string | null;
  lastLeadgenStatus?: string | null;
  verificationLogs: VerificationLog[];
};

async function fetchDiagnostics(): Promise<WebhookDiagnostics | null> {
  const res = await fetch("/api/webhooks/diagnostics");
  const data = await res.json();
  return data.data ?? null;
}

export function FacebookWebhookDiagnostics() {
  const t = useTranslations("facebook");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [data, setData] = useState<WebhookDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDiagnostics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-[#1877F2]" />
              {t("webhookDiagnosticsTitle")}
            </CardTitle>
            <CardDescription>{t("webhookDiagnosticsDesc")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            {t("webhookRefresh")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <p className="text-sm text-muted-foreground">{t("webhookLoading")}</p>
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookTokenConfigured")}</p>
                <div className="flex items-center gap-2 mt-1">
                  {data.hasWebhookVerifyToken ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">
                    {data.hasWebhookVerifyToken ? tCommon("yes") : tCommon("no")}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookVerifyStatus")}</p>
                <div className="flex items-center gap-2 mt-1">
                  {data.webhookVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">
                    {data.webhookVerified ? t("webhookVerifiedYes") : t("webhookVerifiedNo")}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookLastVerification")}</p>
                <p className="text-sm font-medium mt-1">
                  {data.lastVerificationAt
                    ? formatDate(data.lastVerificationAt, locale)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookLastEvent")}</p>
                <p className="text-sm font-medium mt-1">
                  {data.lastWebhookAt ? formatDate(data.lastWebhookAt, locale) : "—"}
                </p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookLastEventStatus")}</p>
                <p className="text-sm font-medium mt-1">{data.lastWebhookStatus ?? "—"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookCount24h")}</p>
                <p className="text-sm font-medium mt-1">{data.webhookCount24h ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{t("webhookLastLeadgenId")}</p>
                <p className="text-sm font-medium mt-1 font-mono truncate" title={data.lastLeadgenId ?? undefined}>
                  {data.lastLeadgenId ?? "—"}
                </p>
              </div>
            </div>

            {!data.webhookVerified && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t("webhookNotVerifiedHint")}
                </p>
              </div>
            )}

            {data.lastWebhookError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
                <p className="font-medium text-destructive">{t("webhookLastError")}</p>
                <p className="text-muted-foreground mt-1">{data.lastWebhookError}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("webhookVerificationAttempts")}</p>
              {data.verificationLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("webhookNoAttempts")}</p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">{t("webhookColTime")}</th>
                          <th className="text-left p-2 font-medium">{t("webhookColMode")}</th>
                          <th className="text-left p-2 font-medium">{t("webhookColToken")}</th>
                          <th className="text-left p-2 font-medium">{t("webhookColChallenge")}</th>
                          <th className="text-left p-2 font-medium">{t("webhookColIp")}</th>
                          <th className="text-left p-2 font-medium">{t("webhookColResult")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.verificationLogs.slice(0, 8).map((log) => (
                          <tr key={log.id} className="border-t border-border/50">
                            <td className="p-2 whitespace-nowrap">
                              {formatDate(log.createdAt, locale)}
                            </td>
                            <td className="p-2 font-mono">{log.mode}</td>
                            <td className="p-2 font-mono">{log.tokenMasked}</td>
                            <td className="p-2">
                              {log.challengePresent ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </td>
                            <td className="p-2 font-mono max-w-[120px] truncate" title={log.ipAddress ?? undefined}>
                              {log.ipAddress ?? "—"}
                            </td>
                            <td className="p-2">
                              <Badge
                                variant={log.success ? "default" : "destructive"}
                                className="text-[10px]"
                              >
                                {log.success ? "OK" : log.errorMessage ?? "FAIL"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("webhookLoadError")}</p>
        )}
      </CardContent>
    </Card>
  );
}
