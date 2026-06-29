"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Copy, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type PlatformMeta = {
  metaAppId: string;
  metaAppSecretConfigured: boolean;
  metaLoginConfigId: string | null;
  metaLoginConfigIdValid: boolean;
  webhookVerifyTokenConfigured: boolean;
  redirectUri: string;
  webhookUrl: string;
  nextAuthUrl: string;
  oauthUrl: string | null;
  oauthUrlValid: boolean;
};

export function AdminPlatformMetaSettings() {
  const t = useTranslations("metaCenter.adminPlatform");
  const [data, setData] = useState<PlatformMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/platform/meta");
      const json = await res.json();
      if (json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }

  function StatusBadge({ ok }: { ok: boolean }) {
    return ok ? (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {t("configured")}
      </Badge>
    ) : (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        {t("missing")}
      </Badge>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {loading && !data ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : data ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("metaAppTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>{t("metaAppId")}</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{data.metaAppId || "—"}</code>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>{t("metaAppSecret")}</span>
              <StatusBadge ok={data.metaAppSecretConfigured} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>{t("loginConfigId")}</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {data.metaLoginConfigId ?? "—"}
                </code>
                <StatusBadge ok={data.metaLoginConfigIdValid} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>{t("webhookVerifyToken")}</span>
              <StatusBadge ok={data.webhookVerifyTokenConfigured} />
            </div>
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("redirectUri")}</span>
                <Button variant="ghost" size="sm" onClick={() => void copy(data.redirectUri)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block text-xs bg-muted p-2 rounded break-all">{data.redirectUri}</code>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("webhookUrl")}</span>
                <Button variant="ghost" size="sm" onClick={() => void copy(data.webhookUrl)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block text-xs bg-muted p-2 rounded break-all">{data.webhookUrl}</code>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/meta/diagnostics">{t("checkOAuth")}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/meta/diagnostics">{t("checkWebhook")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
