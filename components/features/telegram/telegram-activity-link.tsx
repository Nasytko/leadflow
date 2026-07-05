"use client";

import { useTranslations } from "next-intl";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function TelegramActivityLink() {
  const t = useTranslations("connections.telegram.overview.activity");

  return (
    <section className="surface px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-caption text-muted-foreground mt-1">{t("description")}</p>
      </div>
      <Button variant="outline" className="min-h-11" asChild>
        <Link href="/activity">
          <ScrollText className="h-4 w-4 mr-2" />
          {t("viewActivity")}
        </Link>
      </Button>
    </section>
  );
}
