"use client";

import { useTranslations, useLocale } from "next-intl";
import { BarChart3 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type AdAccount = FacebookOverviewData["adAccounts"][number];

function accountStatusLabel(status: number | null | undefined, t: (k: string) => string) {
  if (status === 1) return t("statusActive");
  if (status === 2) return t("statusDisabled");
  if (status === 3) return t("statusUnsettled");
  if (status != null) return t("statusOther");
  return t("statusUnknown");
}

export function FacebookAdAccountsOverview({ adAccounts }: { adAccounts: AdAccount[] }) {
  const t = useTranslations("connections.facebook.overview.adAccounts");
  const tOverview = useTranslations("connections.facebook.overview");
  const locale = useLocale();

  if (adAccounts.length === 0) {
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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="type-title">{t("title")}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adAccounts.map((account) => (
          <article key={account.id} className="surface px-5 py-5 sm:px-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="type-body font-semibold truncate">{account.name}</h3>
                <p className="type-caption text-muted-foreground font-mono">
                  {account.metaAdAccountId}
                </p>
                {account.businessName && (
                  <p className="type-caption text-muted-foreground">{account.businessName}</p>
                )}
              </div>
              <StatusBadge
                status={account.accountStatus === 1 ? "ok" : "warning"}
                label={accountStatusLabel(account.accountStatus, t)}
              />
            </div>

            <dl className="grid grid-cols-2 gap-2 type-caption">
              <div>
                <dt className="text-muted-foreground">{t("currency")}</dt>
                <dd className="type-body mt-0.5">{account.currency ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("timezone")}</dt>
                <dd className="type-body mt-0.5 truncate">{account.timezoneName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("campaigns")}</dt>
                <dd className="type-body mt-0.5">{account.campaignCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("spend")}</dt>
                <dd className="type-body mt-0.5">
                  {account.amountSpent
                    ? `${account.amountSpent}${account.currency ? ` ${account.currency}` : ""}`
                    : "—"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t("lastActivity")}</dt>
                <dd className="type-body mt-0.5">
                  {account.lastActivityAt
                    ? formatDate(account.lastActivityAt, locale)
                    : account.lastSyncedAt
                      ? formatDate(account.lastSyncedAt, locale)
                      : "—"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
