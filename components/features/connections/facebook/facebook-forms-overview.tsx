"use client";

import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type Form = FacebookOverviewData["forms"][number];

export function FacebookFormsOverview({
  forms,
  syncing,
  onSync,
}: {
  forms: Form[];
  syncing?: boolean;
  onSync?: () => void | Promise<void>;
}) {
  const t = useTranslations("connections.facebook.overview.forms");
  const locale = useLocale();

  const enabledForms = forms.filter((f) => f.enabled);

  if (forms.length === 0) {
    return (
      <section className="surface px-6 py-8 sm:px-8 space-y-3">
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-body font-medium">{t("emptyTitle")}</p>
        <p className="type-body text-muted-foreground">{t("emptyDesc")}</p>
        {onSync && (
          <Button className="min-h-11" disabled={syncing} onClick={() => void onSync()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {t("sync")}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="type-title">{t("title")}</h2>
        {onSync && (
          <Button variant="outline" size="sm" className="min-h-11" disabled={syncing} onClick={() => void onSync()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {t("syncAll")}
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {(enabledForms.length > 0 ? enabledForms : forms).slice(0, 12).map((form) => {
          const isArchived = form.status?.toUpperCase() === "ARCHIVED";
          return (
            <article key={form.id} className="surface px-5 py-5 sm:px-6 space-y-3">
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
                <StatusBadge
                  status={form.enabled && !isArchived ? "ok" : "unknown"}
                  label={
                    isArchived
                      ? t("statusArchived")
                      : form.enabled
                        ? t("statusActive")
                        : t("statusInactive")
                  }
                />
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
