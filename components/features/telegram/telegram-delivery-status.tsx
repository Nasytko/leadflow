"use client";

import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { mapTelegramErrorHint } from "@/lib/connections/telegram-setup-state";
import type { TelegramConnectionStatus } from "@/hooks/use-telegram-actions";

export function TelegramDeliveryStatus({ status }: { status: TelegramConnectionStatus }) {
  const t = useTranslations("connections.telegram.overview.delivery");
  const tErrors = useTranslations("connections.telegram.errors");
  const locale = useLocale();
  const hintKey = mapTelegramErrorHint(status.lastError);

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-4">
      <h2 className="type-title">{t("title")}</h2>
      <dl className="grid gap-4 sm:grid-cols-2 type-body">
        <div>
          <dt className="type-caption text-muted-foreground">{t("verified")}</dt>
          <dd className="mt-0.5">{status.verified ? t("yes") : t("no")}</dd>
        </div>
        <div>
          <dt className="type-caption text-muted-foreground">{t("lastChecked")}</dt>
          <dd className="mt-0.5">
            {status.lastCheckedAt ? formatDate(status.lastCheckedAt, locale) : "—"}
          </dd>
        </div>
      </dl>
      {status.lastError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="type-body text-destructive">{status.lastError}</p>
          </div>
          {hintKey && (
            <p className="type-caption text-muted-foreground pl-6">{tErrors(hintKey)}</p>
          )}
        </div>
      )}
    </section>
  );
}
