"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatTimeAgo } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

export function FacebookActivityTimeline({
  activity,
}: {
  activity: FacebookOverviewData["activity"];
}) {
  const t = useTranslations("connections.facebook.overview.activity");
  const locale = useLocale();

  if (activity.length === 0) {
    return (
      <section className="surface px-6 py-6 sm:px-8 space-y-2">
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-body text-muted-foreground">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-4">
      <h2 className="type-title">{t("title")}</h2>
      <ol className="space-y-3">
        {activity.map((item) => (
          <li key={item.id} className="flex gap-3 type-body">
            <time
              className="type-caption text-muted-foreground shrink-0 w-20 sm:w-24 tabular-nums"
              dateTime={item.at}
            >
              {formatTimeAgo(item.at, locale)}
            </time>
            <span>{t(item.messageKey, item.messageParams ?? {})}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
