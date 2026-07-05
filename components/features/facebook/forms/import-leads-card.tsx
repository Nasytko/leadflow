"use client";

import { useTranslations } from "next-intl";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import type { useFacebookLeadImport } from "@/hooks/use-facebook-lead-import";

type LeadImport = ReturnType<typeof useFacebookLeadImport>;

type Props = {
  enabledFormsCount: number;
  totalFormsCount: number;
  telegramConnected: boolean;
  facebookBroken?: boolean;
  leadImport: LeadImport;
};

export function FacebookImportLeadsCard({
  enabledFormsCount,
  totalFormsCount,
  telegramConnected,
  facebookBroken,
  leadImport,
}: Props) {
  const t = useTranslations("connections.facebook.overview.import");
  const tForms = useTranslations("forms");
  const {
    importing,
    sendToTelegram,
    setSendToTelegram,
    importLeads,
    lastImportSummary,
  } = leadImport;

  const noEnabledForms = enabledFormsCount === 0;
  const canImport = !facebookBroken && !noEnabledForms;

  return (
    <section id="import-leads" className="surface px-6 py-6 sm:px-8 space-y-5 border-primary/20">
      <div className="space-y-2">
        <h3 className="type-title flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          {t("title")}
        </h3>
        <p className="type-body text-muted-foreground">{t("description")}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 type-body">
        <div>
          <dt className="type-caption text-muted-foreground">{t("enabledForms")}</dt>
          <dd className="font-semibold mt-0.5">{enabledFormsCount}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("totalForms")}</dt>
          <dd className="font-semibold mt-0.5">{totalFormsCount}</dd>
        </div>
      </dl>

      {lastImportSummary && !lastImportSummary.queued && (
        <p className="type-caption rounded-lg bg-muted px-3 py-2">
          {tForms("importReport", {
            imported: lastImportSummary.imported,
            skipped: lastImportSummary.duplicates,
            failed: lastImportSummary.failed,
          })}
        </p>
      )}

      {noEnabledForms && totalFormsCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 type-caption text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{t("noEnabledFormsWarning")}</p>
        </div>
      )}

      {noEnabledForms && totalFormsCount === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 type-caption text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{t("syncFormsFirst")}</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="fb-import-telegram"
            checked={sendToTelegram}
            disabled={!telegramConnected || importing}
            onCheckedChange={(v) => setSendToTelegram(!!v)}
          />
          <div className="space-y-1">
            <Label htmlFor="fb-import-telegram" className="type-body cursor-pointer">
              {tForms("sendToTelegram")}
            </Label>
            {!telegramConnected && (
              <p className="type-caption text-muted-foreground">
                {t("telegramNotConnected")}{" "}
                <Link href="/connections/telegram" className="text-primary underline-offset-2 hover:underline">
                  {t("connectTelegram")}
                </Link>
              </p>
            )}
          </div>
        </div>

        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={!canImport || importing}
          onClick={() => void importLeads()}
        >
          <Download className={`h-4 w-4 mr-2 ${importing ? "animate-pulse" : ""}`} />
          {importing ? tForms("importInProgress") : t("importButton")}
        </Button>
      </div>
    </section>
  );
}
