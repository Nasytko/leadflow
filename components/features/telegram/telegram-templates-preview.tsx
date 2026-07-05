"use client";

import { useTranslations } from "next-intl";
import { TelegramMessagesGallery } from "./templates-gallery";

export function TelegramTemplatesPreview() {
  const t = useTranslations("connections.telegram.overview.templates");

  return (
    <section className="space-y-4">
      <div className="px-1">
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-caption text-muted-foreground mt-1">{t("description")}</p>
      </div>
      <TelegramMessagesGallery embedded />
    </section>
  );
}
