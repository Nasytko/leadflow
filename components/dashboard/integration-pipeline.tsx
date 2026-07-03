"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowRight } from "lucide-react";

export function IntegrationPipeline({
  facebookConnected,
  telegramConnected,
  activeForms,
  webhookVerified,
}: {
  facebookConnected: boolean;
  telegramConnected: boolean;
  activeForms: number;
  webhookVerified: boolean;
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="type-title">{t("pipelineMeta")}</p>
        <p className="type-caption">{t("pipelineMetaDesc")}</p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <StatusBadge
            status={facebookConnected ? "ok" : "error"}
            label={facebookConnected ? t("pipelineConnected") : t("pipelineDisconnected")}
          />
          {activeForms > 0 && (
            <span className="type-caption">{t("pipelineForms", { count: activeForms })}</span>
          )}
          {webhookVerified && (
            <StatusBadge status="ok" label={t("webhookVerified")} />
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center text-muted-foreground/40 px-4">
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1 space-y-2 sm:text-right">
        <p className="type-title">{t("pipelineTelegram")}</p>
        <p className="type-caption sm:ml-auto sm:max-w-xs">{t("pipelineTelegramDesc")}</p>
        <div className="flex flex-wrap items-center gap-4 pt-2 sm:justify-end">
          <StatusBadge
            status={telegramConnected ? "ok" : "warning"}
            label={telegramConnected ? t("pipelineConnected") : t("pipelineDisconnected")}
          />
        </div>
      </div>
    </div>
  );
}
