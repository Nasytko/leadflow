import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OrvixLogo } from "@/components/brand/orvix-logo";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <OrvixLogo variant="symbol" className="mb-8 h-10 w-10" />
      <p className="type-label text-muted-foreground">404</p>
      <h1 className="type-display mt-2">{t("notFoundTitle")}</h1>
      <p className="type-body mt-3 max-w-md text-muted-foreground">{t("notFoundDesc")}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex min-h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
      >
        {t("notFoundCta")}
      </Link>
    </div>
  );
}
