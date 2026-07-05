"use client";

import { useTranslations } from "next-intl";
import type { TelegramHealthResult } from "@/lib/connections/telegram-health";

export function TelegramHealthPanel({ health }: { health: TelegramHealthResult }) {
  const t = useTranslations("connections.telegram.overview.health");

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-title">{t("title")}</h2>
        <span className="type-body font-semibold tabular-nums">
          {health.score}% · {t(`status_${health.status}`)}
        </span>
      </div>
      <ul className="space-y-2">
        {health.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 type-caption">
            <span
              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                check.status === "ok"
                  ? "bg-emerald-500"
                  : check.status === "warning"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
            {t(`checks.${check.messageKey}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
