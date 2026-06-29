"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { TelegramContent } from "@/components/telegram/telegram-content";

export function MetaTelegramSection() {
  const t = useTranslations("metaCenter.telegram");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="telegram">
      <TelegramContent embedded />
    </MetaSectionShell>
  );
}
