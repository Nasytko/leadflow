"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AppFooter({ compact }: { compact?: boolean }) {
  const t = useTranslations("footer");

  if (compact) {
    return (
      <footer className="border-t border-border/70 px-6 py-5 text-center type-caption">
        {t("copyright")}
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/70 mt-20 px-6 sm:px-8 lg:px-12 py-10">
      <div className="mx-auto max-w-[1080px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 type-caption">
        <p>{t("copyright")}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/wiki" className="hover:text-foreground transition-colors">
            {t("helpLink")}
          </Link>
          <a
            href="https://github.com/Nasytko/leadflow"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
