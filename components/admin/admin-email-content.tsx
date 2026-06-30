"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";
import { toast } from "sonner";
import { AdminKpi } from "@/components/admin/admin-shell";

export function AdminEmailContent() {
  const t = useTranslations("adminCenter.email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [stats, setStats] = useState({ sentToday: 0, failedToday: 0 });
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/admin/platform/email");
      const data = await res.json();
      setSettings(data.data?.settings ?? {});
      setStats(data.data?.stats ?? { sentToday: 0, failedToday: 0 });
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/platform/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.data?.settings) {
        setSettings(data.data.settings);
        toast.success(t("saved"));
      } else toast.error(t("saveFailed"));
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) return;
    const res = await apiFetch("/api/admin/platform/email/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo }),
    });
    const data = await res.json();
    if (data.data?.ok) toast.success(t("testSent"));
    else toast.error(data.error?.message ?? t("testFailed"));
  }

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;

  const s = settings as Record<string, string | number | boolean | null>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <AdminKpi label={t("sentToday")} value={stats.sentToday} variant="success" />
        <AdminKpi label={t("failedToday")} value={stats.failedToday} variant={stats.failedToday ? "warning" : "default"} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("enabled")}</Label>
            <Switch
              checked={!!s.enabled}
              onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("smtpHost")}</Label>
            <Input
              value={(s.smtpHost as string) ?? ""}
              onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("smtpPort")}</Label>
              <Input
                type="number"
                value={String(s.smtpPort ?? 587)}
                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value, 10) })}
              />
            </div>
            <div className="flex items-end pb-2 gap-2">
              <Switch
                checked={!!s.smtpSecure}
                onCheckedChange={(v) => setSettings({ ...settings, smtpSecure: v })}
              />
              <Label>{t("smtpSecure")}</Label>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("smtpUsername")}</Label>
            <Input
              value={(s.smtpUsername as string) ?? ""}
              onChange={(e) => setSettings({ ...settings, smtpUsername: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("smtpPassword")}</Label>
            <Input
              type="password"
              placeholder={s.passwordConfigured ? "••••••••" : ""}
              onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("fromEmail")}</Label>
            <Input
              value={(s.fromEmail as string) ?? ""}
              onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("fromName")}</Label>
            <Input
              value={(s.fromName as string) ?? ""}
              onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("source")}: {String(s.source ?? "none")}
          </p>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("testTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            type="email"
            placeholder="admin@example.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
          />
          <Button variant="outline" onClick={() => void sendTest()}>
            {t("sendTest")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
