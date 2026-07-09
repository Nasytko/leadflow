"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TelegramMessagePreview } from "@/components/features/telegram/telegram-message-preview";
import { TELEGRAM_MESSAGE_TEMPLATES } from "@/lib/telegram-message-templates";
import {
  DEFAULT_TELEGRAM_TEMPLATE_SETTINGS,
  type TelegramMessageTemplateSettings,
  type TelegramTemplateId,
} from "@/lib/telegram-template-settings";
import {
  renderTelegramMessage,
  SAMPLE_LEAD_CONTEXT,
  TELEGRAM_FIELD_OPTIONS,
  TELEGRAM_INLINE_BUTTON_OPTIONS,
} from "@/lib/telegram-template-renderer";
import { apiFetch } from "@/lib/client-api";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { safeToastId } from "@/lib/safe-toast-id";

export function TelegramMessagesGallery({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("telegramMessages");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [locale, setLocale] = useState<"ru" | "en">("ru");
  const [settings, setSettings] = useState<TelegramMessageTemplateSettings>(
    DEFAULT_TELEGRAM_TEMPLATE_SETTINGS
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/telegram/templates");
      const data = await res.json();
      if (data.data?.settings) {
        setSettings(data.data.settings);
      }
      if (data.data?.connection?.notificationLocale) {
        setLocale(data.data.connection.notificationLocale);
      }
      setConnected(!!data.data?.connected);
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }, [tCommon]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(
    () => renderTelegramMessage(locale, SAMPLE_LEAD_CONTEXT, settings),
    [locale, settings]
  );

  async function persist(next: TelegramMessageTemplateSettings) {
    setSettings(next);
    setSaving(true);
    try {
      await apiFetch("/api/telegram/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function selectTemplate(id: TelegramTemplateId) {
    const def = TELEGRAM_MESSAGE_TEMPLATES.find((x) => x.id === id);
    if (!def) return;
    void persist({
      ...settings,
      templateId: id,
      styling: { ...settings.styling, ...def.defaultStyling },
    });
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await apiFetch("/api/telegram/template-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.data?.sent) toast.success(t("testSent"));
      else toast.error(data.error?.message ?? t("testFailed"));
    } catch {
      toast.error(t("testFailed"));
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <EmptyState icon={Send} title={t("notConnectedTitle")} description={t("notConnectedDesc")}>
        <Button asChild>
          <Link href="/connections/telegram">{t("goConnect")}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Send className="h-7 w-7 text-[#229ED9]" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("templatesTitle")}</CardTitle>
              <CardDescription>{t("templatesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {TELEGRAM_MESSAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                    settings.templateId === tpl.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{tpl.icon}</span>
                    {tpl.premium && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium mt-2 text-sm">{t(tpl.nameKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(tpl.descriptionKey)}</p>
                  {tpl.badgeKey && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {t(tpl.badgeKey)}
                    </Badge>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("fieldsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {TELEGRAM_FIELD_OPTIONS.map((field) => (
                <div key={field.id} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`field-${field.id}`} className="text-sm">
                    {t(field.labelKey)}
                  </Label>
                  <Switch
                    id={`field-${field.id}`}
                    checked={settings.fields[field.id]}
                    onCheckedChange={(checked) =>
                      void persist({
                        ...settings,
                        fields: { ...settings.fields, [field.id]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("buttonsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TELEGRAM_INLINE_BUTTON_OPTIONS.map((btn) => (
                <div key={btn.id} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`btn-${btn.id}`} className="text-sm">
                    {t(btn.labelKey)}
                  </Label>
                  <Switch
                    id={`btn-${btn.id}`}
                    checked={settings.inlineButtons[btn.id]}
                    onCheckedChange={(checked) =>
                      void persist({
                        ...settings,
                        inlineButtons: { ...settings.inlineButtons, [btn.id]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("stylingTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["useEmoji", t("styleEmoji")],
                  ["minimal", t("styleMinimal")],
                  ["dividers", t("styleDividers")],
                  ["emptyLines", t("styleEmptyLines")],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <Label className="text-sm">{label}</Label>
                  <Switch
                    checked={settings.styling[key]}
                    onCheckedChange={(checked) =>
                      void persist({
                        ...settings,
                        styling: { ...settings.styling, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
              <div className="pt-2 border-t">
                <Label className="text-sm mb-2 block">{t("signatureTitle")}</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={settings.signature === "leadbridge" ? "default" : "outline"}
                    onClick={() => void persist({ ...settings, signature: "leadbridge" })}
                  >
                    {t("signatureLeadbridge")}
                  </Button>
                  <Button
                    size="sm"
                    variant={settings.signature === "none" ? "default" : "outline"}
                    onClick={() => void persist({ ...settings, signature: "none" })}
                  >
                    {t("signatureNone")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="rounded-2xl border-[#229ED9]/30">
            <CardHeader>
              <CardTitle className="text-base">{t("previewTitle")}</CardTitle>
              <CardDescription>{t("previewDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramMessagePreview
                html={preview.html}
                buttons={preview.inlineButtons.map((b) => ({ label: b.label }))}
              />
            </CardContent>
          </Card>
          <Button
            className="w-full"
            size="lg"
            onClick={() => void sendTest()}
            disabled={testing || saving}
          >
            <Send className="h-4 w-4 mr-2" />
            {testing ? t("testSending") : t("sendTest")}
          </Button>
          {saving && (
            <p className="text-xs text-center text-muted-foreground">{t("saving")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
