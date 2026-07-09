"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn, formatTimeAgo } from "@/lib/utils";

export type ActivityEvent = {
  id: string;
  at: string;
  type: "lead" | "webhook" | "delivery";
  messageKey: string;
  messageParams?: Record<string, string>;
  status: "ok" | "warning" | "error";
};

const ICONS = {
  lead: UserPlus,
  webhook: Zap,
  delivery: Send,
} as const;

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const t = useTranslations("dashboard.activity");
  const locale = useLocale();

  if (!events.length) {
    return (
      <div className="rounded-2xl border bg-card px-5 py-10 text-center shadow-sm">
        <p className="type-body font-medium">{t("emptyTitle")}</p>
        <p className="type-caption text-muted-foreground mt-1">{t("emptyDesc")}</p>
      </div>
    );
  }

  return (
    <ul className="rounded-2xl border bg-card shadow-sm divide-y divide-border/60 overflow-hidden">
      {events.map((ev) => {
        const Icon = ICONS[ev.type];
        return (
          <li key={ev.id}>
            <Link
              href="/activity"
              className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/30 min-h-[44px]"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  ev.status === "ok" && "bg-emerald-500/10 text-emerald-600",
                  ev.status === "warning" && "bg-amber-500/10 text-amber-600",
                  ev.status === "error" && "bg-destructive/10 text-destructive"
                )}
              >
                {ev.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : ev.status === "error" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="type-body leading-snug">
                  {t(ev.messageKey as "eventNewLeadFacebook", ev.messageParams ?? {})}
                </p>
                <time className="type-caption text-muted-foreground tabular-nums">
                  {formatTimeAgo(ev.at, locale)}
                </time>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 sm:opacity-40" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
