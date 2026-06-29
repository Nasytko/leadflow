"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FacebookBusinessesSection } from "@/components/facebook/facebook-businesses-section";
import { useMetaFacebookStatus } from "@/hooks/use-meta-facebook-status";
import { Skeleton } from "@/components/ui/skeleton";

export function MetaBusinessesSection() {
  const t = useTranslations("metaCenter.businesses");
  const { status, loading, syncing, syncBusinesses } = useMetaFacebookStatus();

  if (loading && !status) {
    return (
      <MetaSectionShell title={t("title")} description={t("description")} helpKey="business">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </MetaSectionShell>
    );
  }

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="business">
      {!status?.connected ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6">
          {t("connectFirst")}
        </p>
      ) : (
        <FacebookBusinessesSection
          businesses={status.businesses}
          pagesCount={status.totalPagesCount}
          syncing={syncing === "businesses"}
          onSync={() => void syncBusinesses()}
        />
      )}
    </MetaSectionShell>
  );
}
