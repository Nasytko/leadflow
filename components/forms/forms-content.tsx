"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { RefreshCw, Download, FileText, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";

type Form = {
  id: string;
  formId: string;
  formName: string;
  enabled: boolean;
  status: string;
  syncStatus: string;
  lastSyncError: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  pageName: string;
};

export function FormsContent() {
  const t = useTranslations("forms");
  const tFacebook = useTranslations("facebook");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [forms, setForms] = useState<Form[]>([]);
  const [facebookStatus, setFacebookStatus] = useState("disconnected");
  const [facebookLastError, setFacebookLastError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formFilter, setFormFilter] = useState<"all" | "enabled" | "active" | "archived" | "errors">("all");
  const [sendToTelegram, setSendToTelegram] = useState(false);

  async function loadForms() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/forms", { signal: controller.signal });
      clearTimeout(id);
      const data = await res.json();
      if (data.data?.forms) setForms(data.data.forms);
      if (data.data?.facebookStatus) setFacebookStatus(data.data.facebookStatus);
      if (data.data?.facebookLastError !== undefined) {
        setFacebookLastError(data.data.facebookLastError);
      }
    } catch {
      toast.error(tCommon("error"));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadForms();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/forms", { method: "POST" });
      const data = await res.json();
      if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
        toast.error(tFacebook("tokenInvalid"));
      } else if (data.error) {
        toast.error(data.error.message ?? t("syncFailed"));
      } else {
        toast.success(t("syncSuccess", { count: data.data?.synced ?? 0 }));
      }
      await loadForms();
    } catch {
      toast.error(t("syncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  async function toggleForm(formId: string, enabled: boolean) {
    const res = await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) {
      toast.success(!enabled ? t("formEnabled") : t("formDisabled"));
    } else {
      toast.error(tCommon("error"));
    }
    loadForms();
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendToTelegram }),
      });
      const data = await res.json();
      if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
        toast.error(tFacebook("tokenInvalid"));
      } else if (data.error) {
        toast.error(data.error.message ?? t("importFailed"));
      } else {
        toast.success(t("importSuccess", { count: data.data?.imported ?? 0 }));
      }
    } catch {
      toast.error(t("importFailed"));
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const enabledCount = forms.filter((f) => f.enabled).length;
  const failedSyncCount = forms.filter((f) => f.syncStatus === "failed").length;
  const filteredForms = forms.filter((f) => {
    if (formFilter === "enabled") return f.enabled;
    if (formFilter === "active") return f.status?.toUpperCase() === "ACTIVE";
    if (formFilter === "archived") return f.status?.toUpperCase() === "ARCHIVED";
    if (formFilter === "errors") return f.syncStatus === "failed";
    return true;
  });
  const facebookBroken =
    facebookStatus === "invalid" ||
    facebookStatus === "expired" ||
    facebookStatus === "error";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={FileText} gradient>
        <Button onClick={handleSync} disabled={syncing || facebookBroken} variant="outline" className="rounded-xl">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {t("syncForms")}
        </Button>
      </PageHeader>

      {(facebookBroken || facebookLastError) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {facebookLastError ?? tFacebook("tokenInvalid")}
          </p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/facebook">{tFacebook("reconnectButton")}</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label={t("activeFormsKpi")} value={enabledCount} variant="success" icon={FileText} />
        <KpiCard
          label={t("totalFormsKpi")}
          value={forms.length}
          sublabel={failedSyncCount > 0 ? t("syncFailedCount", { count: failedSyncCount }) : undefined}
          icon={FileText}
          variant={failedSyncCount > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("importLeads")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("importLeadsDescription")}</p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="send-telegram"
              checked={sendToTelegram}
              onCheckedChange={(v) => setSendToTelegram(!!v)}
            />
            <Label htmlFor="send-telegram">{t("sendToTelegram")}</Label>
          </div>
          <Button onClick={handleImport} disabled={importing || facebookBroken}>
            <Download className="h-4 w-4 mr-2" />
            {t("importLeads")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-2">
            {(["all", "enabled", "active", "archived", "errors"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={formFilter === key ? "default" : "outline"}
                onClick={() => setFormFilter(key)}
              >
                {t(`filter${key.charAt(0).toUpperCase()}${key.slice(1)}` as "filterAll")}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {forms.length === 0 ? (
            <EmptyState icon={FileText} title={t("noForms")} description={t("noFormsDesc")}>
              <Button onClick={handleSync} disabled={syncing || facebookBroken}>
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {t("syncForms")}
              </Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left font-medium">{t("formName")}</th>
                    <th className="p-4 text-left font-medium">{t("page")}</th>
                    <th className="p-4 text-left font-medium">{t("status")}</th>
                    <th className="p-4 text-left font-medium">{t("syncStatus")}</th>
                    <th className="p-4 text-left font-medium">{t("createdAt")}</th>
                    <th className="p-4 text-left font-medium">{tCommon("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{form.formName}</td>
                      <td className="p-4 text-muted-foreground">{form.pageName}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{form.status}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <Badge
                            variant={
                              form.syncStatus === "success"
                                ? "success"
                                : form.syncStatus === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {t(`syncStatus_${form.syncStatus}`)}
                          </Badge>
                          {form.lastSyncError && (
                            <p className="text-xs text-destructive max-w-xs">{form.lastSyncError}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(form.createdAt, locale)}
                      </td>
                      <td className="p-4">
                        <Switch
                          checked={form.enabled}
                          onCheckedChange={() => toggleForm(form.id, form.enabled)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
