"use client";

import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/client-api";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type Form = FacebookOverviewData["forms"][number];

export function FacebookFormsOverview({
  forms,
  onUpdated,
  facebookBroken,
}: {
  forms: Form[];
  onUpdated?: () => void | Promise<void>;
  facebookBroken?: boolean;
}) {
  const t = useTranslations("connections.facebook.overview.forms");
  const tOverview = useTranslations("connections.facebook.overview");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  async function toggleForm(formId: string, enabled: boolean) {
    const res = await apiFetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) {
      toast.success(!enabled ? t("formEnabled") : t("formDisabled"));
      await onUpdated?.();
    } else {
      toast.error(tCommon("error"));
    }
  }

  if (forms.length === 0) {
    return (
      <section className="surface px-6 py-8 sm:px-8 space-y-3">
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-body font-medium">{t("emptyTitle")}</p>
        <p className="type-body text-muted-foreground">{t("emptyDesc")}</p>
        <p className="type-caption text-muted-foreground">{tOverview("actionCenterHint")}</p>
      </section>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="type-title">{t("title")}</h2>
        </div>

        <div className="grid gap-4">
          {forms.slice(0, 24).map((form) => {
            const isArchived = form.status?.toUpperCase() === "ARCHIVED";
            return (
              <article key={form.id} className="surface px-5 py-5 sm:px-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="type-body font-semibold">{form.formName}</h3>
                    <p className="type-caption text-muted-foreground">
                      {form.pageName} · {form.formId}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge
                      status={isArchived ? "unknown" : "ok"}
                      label={
                        isArchived ? t("statusArchived") : t("statusActiveMeta")
                      }
                    />
                    <StatusBadge
                      status={form.enabled && !isArchived ? "ok" : "unknown"}
                      label={
                        form.enabled && !isArchived
                          ? t("deliveryEnabled")
                          : t("deliveryDisabled")
                      }
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 type-caption">
                  <div>
                    <dt className="text-muted-foreground">{t("created")}</dt>
                    <dd className="type-body mt-0.5">
                      {form.metaCreatedAt ? formatDate(form.metaCreatedAt, locale) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("leadsCollected")}</dt>
                    <dd className="type-body mt-0.5">{form.leadCount}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <dt className="text-muted-foreground">{t("lastLead")}</dt>
                    <dd className="type-body mt-0.5">
                      {form.lastLeadAt ? formatDate(form.lastLeadAt, locale) : t("noLeadsYet")}
                    </dd>
                  </div>
                </dl>

                {form.warnings.length > 0 && (
                  <ul className="space-y-1.5">
                    {form.warnings.includes("noLeads") && (
                      <li className="flex items-start gap-2 type-caption text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {t("warningNoLeads")}
                      </li>
                    )}
                    {form.warnings.includes("webhookNotSubscribed") && (
                      <li className="flex items-start gap-2 type-caption text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {t("warningWebhook")}
                      </li>
                    )}
                  </ul>
                )}

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 pt-1 border-t">
                  <div className="flex items-center gap-2 min-h-11">
                    <Switch
                      checked={form.enabled}
                      disabled={facebookBroken || isArchived}
                      onCheckedChange={() => void toggleForm(form.id, form.enabled)}
                    />
                    <span className="type-caption">
                      {form.enabled ? t("deliveryEnabled") : t("deliveryDisabled")}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
                    <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" asChild>
                      <Link href={`/leads?formId=${encodeURIComponent(form.formId)}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("viewLeads")}
                      </Link>
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex flex-1 sm:flex-none">
                          <Button variant="outline" className="min-h-11 w-full" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            {t("importFromForm")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t("importFromFormSoon")}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </TooltipProvider>
  );
}
