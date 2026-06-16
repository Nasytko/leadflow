"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import { RefreshCw, Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Form = {
  id: string;
  formId: string;
  formName: string;
  enabled: boolean;
  status: string;
  createdAt: string;
  pageName: string;
};

export function FormsContent() {
  const t = useTranslations("forms");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sendToTelegram, setSendToTelegram] = useState(false);

  async function loadForms() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/forms", { signal: controller.signal });
      clearTimeout(id);
      const data = await res.json();
      if (data.data?.forms) setForms(data.data.forms);
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
    await fetch("/api/forms", { method: "POST" });
    await loadForms();
    setSyncing(false);
  }

  async function toggleForm(formId: string, enabled: boolean) {
    await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    toast.success(!enabled ? t("formEnabled") : t("formDisabled"));
    loadForms();
  }

  async function handleImport() {
    setImporting(true);
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sendToTelegram }),
    });
    toast.success(t("importLeads"));
    setImporting(false);
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon={FileText} gradient>
        <Button onClick={handleSync} disabled={syncing} variant="outline" className="rounded-xl">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {t("syncForms")}
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label={t("activeFormsKpi")} value={enabledCount} variant="success" icon={FileText} />
        <KpiCard label={t("totalFormsKpi")} value={forms.length} icon={FileText} />
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
          <Button onClick={handleImport} disabled={importing}>
            <Download className="h-4 w-4 mr-2" />
            {t("importLeads")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {forms.length === 0 ? (
            <EmptyState icon={FileText} title={t("noForms")} description={t("noFormsDesc")}>
              <Button onClick={handleSync} disabled={syncing}>
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
                    <th className="p-4 text-left font-medium">{t("createdAt")}</th>
                    <th className="p-4 text-left font-medium">{tCommon("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b">
                      <td className="p-4 font-medium">{form.formName}</td>
                      <td className="p-4 text-muted-foreground">{form.pageName}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{form.status}</Badge>
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
