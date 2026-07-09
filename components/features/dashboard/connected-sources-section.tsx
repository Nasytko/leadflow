"use client";

import { useTranslations, useLocale } from "next-intl";
import { Megaphone, Send, RefreshCw, Download, Settings2, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatTimeAgo } from "@/lib/utils";
import type { FormOverviewRow } from "@/lib/dashboard-analytics";

type FacebookCardProps = {
  connected: boolean;
  accountName: string | null;
  connectedPages: number;
  activeForms: number;
  forms: FormOverviewRow[];
};

export function FacebookSourceCard({
  connected,
  accountName,
  connectedPages,
  activeForms,
  forms,
}: FacebookCardProps) {
  const t = useTranslations("dashboard.sources.facebook");
  const locale = useLocale();

  return (
    <article className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1877F2]/10">
            <Megaphone className="h-5 w-5 text-[#1877F2]" />
          </div>
          <div className="min-w-0">
            <h3 className="type-title">{t("title")}</h3>
            <p className="type-caption text-muted-foreground truncate">
              {connected && accountName ? accountName : t("notConnected")}
            </p>
          </div>
        </div>
        <StatusBadge
          status={connected ? "ok" : "unknown"}
          label={connected ? t("statusConnected") : t("statusDisconnected")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 type-caption">
        <div>
          <p className="text-muted-foreground">{t("pages")}</p>
          <p className="type-body font-semibold tabular-nums mt-0.5">{connectedPages}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("activeForms")}</p>
          <p className="type-body font-semibold tabular-nums mt-0.5">{activeForms}</p>
        </div>
      </div>

      {forms.length > 0 && (
        <div className="border-t border-border/60 px-5 py-3">
          <p className="type-caption font-medium text-muted-foreground mb-2">{t("formsList")}</p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {forms.slice(0, 5).map((form) => (
              <li key={form.id} className="flex items-center justify-between gap-2 type-caption">
                <span className={cn("truncate", !form.enabled && "text-muted-foreground")}>
                  {form.formName}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {t("formLeads", { today: form.todayLeads, total: form.totalLeads })}
                </span>
              </li>
            ))}
          </ul>
          {forms[0]?.lastSyncAt && (
            <p className="type-caption text-muted-foreground mt-2">
              {t("lastSync")}: {formatTimeAgo(forms[0].lastSyncAt, locale)}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4 bg-muted/20">
        <Button size="sm" variant="outline" asChild className="gap-1.5">
          <Link href="/connections/facebook">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("sync")}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5">
          <Link href="/connections/facebook">
            <Download className="h-3.5 w-3.5" />
            {t("import")}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild className="gap-1.5 ml-auto">
          <Link href="/connections/facebook">
            <Settings2 className="h-3.5 w-3.5" />
            {t("manage")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

type TelegramProps = {
  connected: boolean;
  deliveredToday: number;
  errorsToday: number;
};

export function TelegramSourceCard({ connected, deliveredToday, errorsToday }: TelegramProps) {
  const t = useTranslations("dashboard.sources.telegram");

  return (
    <article className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
            <Send className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h3 className="type-title">{t("title")}</h3>
            <p className="type-caption text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <StatusBadge
          status={connected ? "ok" : "unknown"}
          label={connected ? t("statusConnected") : t("statusDisconnected")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4">
        <div>
          <p className="type-caption text-muted-foreground">{t("deliveredToday")}</p>
          <p className="text-2xl font-semibold tabular-nums mt-1 text-emerald-600">{deliveredToday}</p>
        </div>
        <div>
          <p className="type-caption text-muted-foreground">{t("errorsToday")}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums mt-1",
              errorsToday > 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {errorsToday}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/60 px-5 py-4 bg-muted/20">
        <Button size="sm" variant="outline" asChild className="gap-1.5">
          <Link href="/connections/telegram">
            <Play className="h-3.5 w-3.5" />
            {t("test")}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild className="gap-1.5 ml-auto">
          <Link href="/connections/telegram">
            <Settings2 className="h-3.5 w-3.5" />
            {t("manage")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function ConnectedSourcesSection({
  facebookConnected,
  telegramConnected,
  accountName,
  connectedPages,
  activeForms,
  forms,
  deliveredToday,
  errorsToday,
}: {
  facebookConnected: boolean;
  telegramConnected: boolean;
  accountName: string | null;
  connectedPages: number;
  activeForms: number;
  forms: FormOverviewRow[];
  deliveredToday: number;
  errorsToday: number;
}) {
  const t = useTranslations("dashboard.sources");
  return (
    <section className="space-y-4">
      <h2 className="type-title">{t("title")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <FacebookSourceCard
          connected={facebookConnected}
          accountName={accountName}
          connectedPages={connectedPages}
          activeForms={activeForms}
          forms={forms}
        />
        <TelegramSourceCard
          connected={telegramConnected}
          deliveredToday={deliveredToday}
          errorsToday={errorsToday}
        />
      </div>
    </section>
  );
}
