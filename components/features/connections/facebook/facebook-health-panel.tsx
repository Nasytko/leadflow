"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FacebookHealthResult } from "@/lib/connections/facebook-health";

function CheckIcon({ status }: { status: "ok" | "warning" | "error" }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
}

export function FacebookHealthPanel({ health }: { health: FacebookHealthResult }) {
  const t = useTranslations("connections.facebook.overview.health");

  const scoreColor =
    health.status === "healthy"
      ? "text-primary"
      : health.status === "attention"
        ? "text-amber-600"
        : "text-destructive";

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-title">{t("title")}</h2>
        <div className="text-right">
          <p className="type-caption text-muted-foreground">{t("score")}</p>
          <p className={cn("type-display font-semibold tabular-nums", scoreColor)}>
            {health.score}%
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {health.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5 type-body">
            <CheckIcon status={check.status} />
            <span className={cn(check.status === "error" && "text-destructive")}>
              {t(check.messageKey, check.messageParams ?? {})}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
