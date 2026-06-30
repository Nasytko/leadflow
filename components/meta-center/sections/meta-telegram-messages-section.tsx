"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { TelegramMessagesGallery } from "@/components/telegram/telegram-messages-gallery";

export function MetaTelegramMessagesSection() {
  const t = useTranslations("metaCenter.telegramMessages");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="telegram">
      <TelegramMessagesGallery embedded />
    </MetaSectionShell>
  );
}
