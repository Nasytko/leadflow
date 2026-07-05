"use client";

import { useTranslations, useLocale } from "next-intl";
import { Send } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import { computeTelegramHealth } from "@/lib/connections/telegram-health";
import { mapTelegramErrorHint } from "@/lib/connections/telegram-setup-state";
import type { TelegramConnectionStatus } from "@/hooks/use-telegram-actions";
import { TelegramHealthPanel } from "./telegram-health-panel";
import { TelegramDeliveryStatus } from "./telegram-delivery-status";
import { TelegramTemplatesPreview } from "./telegram-templates-preview";
import { TelegramActivityLink } from "./telegram-activity-link";

type Props = {
  status: TelegramConnectionStatus;
  onSendTest: () => void | Promise<void>;
  onUpdateToken: () => void;
  onUpdateChat: () => void;
  testing?: boolean;
};

export function TelegramOverview({
  status,
  onSendTest,
  onUpdateToken,
  onUpdateChat,
  testing,
}: Props) {
  const t = useTranslations("connections.telegram");
  const tTelegram = useTranslations("telegram");
  const locale = useLocale();
  const errorHintKey = mapTelegramErrorHint(status.lastError);

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="type-title">{t("summaryTitle")}</h2>
            <StatusBadge
              status={status.connected && status.verified ? "ok" : "warning"}
              label={
                status.connected && status.verified
                  ? tTelegram("statusConnected")
                  : tTelegram("statusDisconnected")
              }
            />
          </div>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="type-label text-muted-foreground">{tTelegram("chatId")}</dt>
          <dd className="type-body mt-1 font-mono">{status.chatId ?? "—"}</dd>
        </div>
        <div>
          <dt className="type-label text-muted-foreground">{t("lastTest")}</dt>
          <dd className="type-body mt-1">
            {status.verified
              ? t("testVerified")
              : status.lastCheckedAt
                ? formatDate(status.lastCheckedAt, locale)
                : "—"}
          </dd>
        </div>
      </dl>

      {status.lastError && errorHintKey && (
        <p className="type-caption text-muted-foreground">{t(`errors.${errorHintKey}`)}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button className="min-h-11" disabled={testing} onClick={() => void onSendTest()}>
          {tTelegram("sendTest")}
        </Button>
        <Button variant="outline" className="min-h-11" onClick={onUpdateToken}>
          {t("updateToken")}
        </Button>
        <Button variant="outline" className="min-h-11" onClick={onUpdateChat}>
          {t("updateChat")}
        </Button>
        <Button variant="outline" className="min-h-11" asChild>
          <Link href="/activity">{t("viewActivity")}</Link>
        </Button>
      </div>
    </section>
  );
}

export function TelegramIntelligenceDashboard({
  status,
  onSendTest,
  onUpdateToken,
  onUpdateChat,
  testing,
}: Props) {
  const health = computeTelegramHealth({
    connected: status.connected,
    hasChatId: !!status.chatId,
    verified: !!status.verified,
    hasError: !!status.lastError || status.status === "error",
  });

  return (
    <div className="space-y-8">
      <TelegramOverview
        status={status}
        onSendTest={onSendTest}
        onUpdateToken={onUpdateToken}
        onUpdateChat={onUpdateChat}
        testing={testing}
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <TelegramHealthPanel health={health} />
        <TelegramDeliveryStatus status={status} />
      </div>
      <TelegramTemplatesPreview />
      <TelegramActivityLink />
    </div>
  );
}
