"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field-label";
import { Copy, Shield, CheckCircle2, AlertTriangle, Sparkles, Link2, Facebook, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  facebookStatusBadgeVariant,
  telegramStatusBadgeVariant,
} from "@/lib/connection-status";

type IntegrationSettings = {
  metaAppId: string;
  metaLoginConfigId?: string;
  hasMetaLoginConfigId?: boolean;
  hasMetaAppSecret: boolean;
  hasWebhookToken: boolean;
  configured: boolean;
  redirectUri: string;
  webhookUrl: string;
};

function CopyBox({
  label,
  value,
  tooltip,
  onCopy,
  copyLabel,
}: {
  label: string;
  value: string;
  tooltip: string;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
      <FieldLabel label={label} tooltip={tooltip} />
      <div className="flex gap-2">
        <code className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-xs break-all font-mono">
          {value}
        </code>
        <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0 h-auto py-2.5">
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}

function IntegrationStatusRow({
  label,
  status,
  lastError,
  href,
  icon: Icon,
}: {
  label: string;
  status: string;
  lastError?: string | null;
  href: string;
  icon: React.ElementType;
}) {
  const variant =
    Icon === Facebook
      ? facebookStatusBadgeVariant(status)
      : telegramStatusBadgeVariant(status);

  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-xl border p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {lastError && (
            <p className="text-xs text-destructive mt-1 line-clamp-2">{lastError}</p>
          )}
        </div>
      </div>
      <Badge variant={variant} className="shrink-0">
        {status}
      </Badge>
    </Link>
  );
}

export function MetaSettingsForm({
  compact = false,
  onSaved,
}: {
  compact?: boolean;
  onSaved?: () => void;
}) {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [initialMetaAppId, setInitialMetaAppId] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaLoginConfigId, setMetaLoginConfigId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.settings) {
          setSettings(res.data.settings);
          setMetaAppId(res.data.settings.metaAppId ?? "");
          setMetaLoginConfigId(res.data.settings.metaLoginConfigId ?? "");
          setInitialMetaAppId(res.data.settings.metaAppId ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaAppId,
          metaLoginConfigId,
          ...(metaAppSecret && { metaAppSecret }),
          ...(webhookToken && { metaWebhookVerifyToken: webhookToken }),
        }),
      });
      const data = await res.json();
      if (data.data?.settings) {
        setSettings(data.data.settings);
        setMetaAppSecret("");
        setWebhookToken("");
        setInitialMetaAppId(data.data.settings.metaAppId ?? metaAppId);
        toast.success(t("saved"));
        onSaved?.();
      } else {
        toast.error(data.error?.message ?? tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!metaAppSecret && !settings?.hasMetaAppSecret) {
      toast.error(t("secretRequired"));
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaAppId, metaAppSecret: metaAppSecret || "use-stored" }),
      });
      const data = await res.json();
      if (data.data?.valid) {
        toast.success(t("testSuccess", { name: data.data.appName ?? "" }));
      } else {
        toast.error(data.error?.message ?? t("testFailed"));
      }
    } catch {
      toast.error(t("testFailed"));
    } finally {
      setTesting(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }

  const showMetaChangeWarning =
    (initialMetaAppId && metaAppId !== initialMetaAppId) || metaAppSecret.length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        {tCommon("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#1877F2]/10 to-transparent border border-[#1877F2]/20 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#1877F2]" />
            <p className="text-sm text-muted-foreground">{t("securityNote")}</p>
          </div>
          <Badge variant={settings?.configured ? "success" : "warning"}>
            {settings?.configured ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {t("configured")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {t("notConfigured")}
              </span>
            )}
          </Badge>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {showMetaChangeWarning && (
          <div className="sm:col-span-2 flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {t("metaChangeWarning")}
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <FieldLabel
            htmlFor="metaAppId"
            label={t("metaAppId")}
            tooltip={t("tooltipMetaAppId")}
            required
          />
          <Input
            id="metaAppId"
            value={metaAppId}
            onChange={(e) => setMetaAppId(e.target.value)}
            placeholder="1543348640634245"
            className="font-mono text-sm h-11"
          />
          <p className="text-xs text-muted-foreground">{t("metaAppIdHint")}</p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <FieldLabel
            htmlFor="metaLoginConfigId"
            label={t("metaLoginConfigId")}
            tooltip={t("tooltipMetaLoginConfigId")}
          />
          <Input
            id="metaLoginConfigId"
            value={metaLoginConfigId}
            onChange={(e) => setMetaLoginConfigId(e.target.value)}
            placeholder="1234567890123456"
            className="font-mono text-sm h-11"
          />
          <p className="text-xs text-muted-foreground">{t("metaLoginConfigIdHint")}</p>
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="metaAppSecret"
            label={t("metaAppSecret")}
            tooltip={t("tooltipMetaAppSecret")}
            required={!settings?.hasMetaAppSecret}
          />
          <Input
            id="metaAppSecret"
            type="password"
            value={metaAppSecret}
            onChange={(e) => setMetaAppSecret(e.target.value)}
            placeholder={settings?.hasMetaAppSecret ? t("secretPlaceholder") : "••••••••••••••••"}
            className="h-11"
          />
          {settings?.hasMetaAppSecret && !metaAppSecret && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {t("secretStored")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel
            htmlFor="webhookToken"
            label={t("webhookToken")}
            tooltip={t("tooltipWebhookToken")}
          />
          <Input
            id="webhookToken"
            type="password"
            value={webhookToken}
            onChange={(e) => setWebhookToken(e.target.value)}
            placeholder={settings?.hasWebhookToken ? t("secretPlaceholder") : "my_secret_token_2026"}
            className="h-11"
          />
          {settings?.hasWebhookToken && !webhookToken && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {t("webhookStored")}
            </p>
          )}
        </div>
      </div>

      {settings && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CopyBox
            label={t("redirectUri")}
            value={settings.redirectUri}
            tooltip={t("tooltipRedirectUri")}
            onCopy={() => copyText(settings.redirectUri)}
            copyLabel={t("copyShort")}
          />
          <CopyBox
            label={t("webhookUrl")}
            value={settings.webhookUrl}
            tooltip={t("tooltipWebhookUrl")}
            onCopy={() => copyText(settings.webhookUrl)}
            copyLabel={t("copyShort")}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || !metaAppId}
          className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {saving ? tCommon("loading") : tCommon("save")}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing || !metaAppId}>
          <Link2 className="h-4 w-4 mr-2" />
          {testing ? tCommon("loading") : t("testConnection")}
        </Button>
      </div>
    </div>
  );
}

export function IntegrationsSettingsCard({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations("integrations");
  const [status, setStatus] = useState<{
    facebook: { status: string; lastError?: string | null };
    telegram: { status: string; lastError?: string | null };
  } | null>(null);

  useEffect(() => {
    fetch("/api/facebook/status")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setStatus({
            facebook: {
              status: res.data.facebook?.status ?? res.data.connectionStatus ?? "disconnected",
              lastError: res.data.facebook?.lastError,
            },
            telegram: {
              status: res.data.telegram?.status ?? "disconnected",
              lastError: res.data.telegram?.lastError,
            },
          });
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      {status && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("integrationsStatusTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <IntegrationStatusRow
              label={t("facebookIntegration")}
              status={status.facebook.status}
              lastError={status.facebook.lastError}
              href="/facebook"
              icon={Facebook}
            />
            <IntegrationStatusRow
              label={t("telegramIntegration")}
              status={status.telegram.status}
              lastError={status.telegram.lastError}
              href="/telegram"
              icon={Send}
            />
          </CardContent>
        </Card>
      )}
      <MetaSettingsForm onSaved={onSaved} />
    </div>
  );
}
