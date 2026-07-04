"use client";

import { useTranslations, useLocale } from "next-intl";
import { ExternalLink, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";
import { formatTimeAgo } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type Page = FacebookOverviewData["pages"][number];

export function FacebookPagesOverview({
  pages,
  syncing,
  onSync,
}: {
  pages: Page[];
  syncing?: boolean;
  onSync?: () => void | Promise<void>;
}) {
  const t = useTranslations("connections.facebook.overview.pages");
  const locale = useLocale();

  if (pages.length === 0) {
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

      <div className="grid gap-4 md:grid-cols-2">
        {pages.map((page) => (
          <article key={page.id} className="surface px-5 py-5 sm:px-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted">
                {page.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.pictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="type-body font-semibold truncate">{page.pageName}</h3>
                <p className="type-caption text-muted-foreground font-mono">{page.pageId}</p>
                {page.category && (
                  <p className="type-caption text-muted-foreground">{page.category}</p>
                )}
              </div>
              <StatusBadge
                status={page.connected ? "ok" : "unknown"}
                label={page.connected ? t("connected") : t("notConnected")}
              />
            </div>

            <dl className="grid grid-cols-2 gap-2 type-caption">
              <div>
                <dt className="text-muted-foreground">{t("leadAccess")}</dt>
                <dd className="type-body mt-0.5">
                  {page.connected ? t("leadAccessEnabled") : t("leadAccessDisabled")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("forms")}</dt>
                <dd className="type-body mt-0.5">
                  {t("activeForms", { count: page.activeFormsCount ?? 0 })}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">{t("lastSync")}</dt>
                <dd className="type-body mt-0.5">
                  {formatTimeAgo(page.lastSyncedAt, locale)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="min-h-11" asChild>
                <Link href={`/connections/facebook?step=forms`}>{t("viewForms")}</Link>
              </Button>
              {page.link && (
                <Button variant="ghost" size="sm" className="min-h-11" asChild>
                  <a href={page.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Facebook
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
