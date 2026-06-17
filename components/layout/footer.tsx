"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AppFooter({ compact }: { compact?: boolean }) {
  const t = useTranslations("footer");

  return (
    <footer
      className={
        compact
          ? "border-t border-border/60 bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground"
          : "border-t border-border/60 bg-muted/20 px-4 sm:px-6 lg:px-8 py-8 mt-auto"
      }
    >
      <div className={compact ? "space-y-2" : "mx-auto max-w-7xl space-y-4"}>
        <p className="text-sm font-medium text-foreground/90">{t("tagline")}</p>
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <span>{t("developer")}</span>
          <a href="mailto:paulnasytko@gmail.com" className="text-primary hover:underline">
            paulnasytko@gmail.com
          </a>
          <a
            href="https://t.me/paulnasytko"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Telegram
          </a>
          <a
            href="https://github.com/Nasytko/leadflow"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground/80">{t("copyright")}</p>
        {!compact && (
          <p className="text-[10px] text-muted-foreground/60">
            <Link href="/wiki" className="hover:underline">
              {t("helpLink")}
            </Link>
          </p>
        )}
      </div>
    </footer>
  );
}
