"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type HealthCard = {
  id: string;
  status: "ok" | "warning" | "error" | "unknown";
};

export function DashboardSystemHealth({
  cards,
}: {
  cards: HealthCard[];
}) {
  const t = useTranslations("dashboard");

  const okCount = cards.filter((c) => c.status === "ok").length;
  const allOk = okCount === cards.length && cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            allOk ? "bg-emerald-500" : "bg-amber-500"
          )}
        />
        <p className="type-body font-medium">
          {allOk ? t("allSystemsOperational") : t("systemStatusSummary", { ok: okCount, total: cards.length })}
        </p>
      </div>
      <ul className="space-y-3">
        {cards.map((card) => (
          <li key={card.id} className="flex items-center justify-between gap-3">
            <span className="type-caption text-foreground/85">
              {t(`health_${card.id}` as "health_facebook")}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  card.status === "ok" && "bg-emerald-500",
                  card.status === "warning" && "bg-amber-500",
                  card.status === "error" && "bg-red-500",
                  card.status === "unknown" && "bg-muted-foreground/40"
                )}
              />
              <span className="type-caption tabular-nums">
                {t(`healthStatus_${card.status}`)}
              </span>
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3">
          <span className="type-caption text-foreground/85">{t("health_database")}</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="type-caption">{t("healthStatus_ok")}</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
