"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FacebookPagesSection } from "@/components/facebook/facebook-pages-section";
import { useMetaFacebookStatus } from "@/hooks/use-meta-facebook-status";
import { Skeleton } from "@/components/ui/skeleton";

export function MetaPagesSection() {
  const t = useTranslations("metaCenter.pages");
  const { status, loading, syncing, syncPages, togglePage } = useMetaFacebookStatus();

  if (loading && !status) {
    return (
      <MetaSectionShell title={t("title")} description={t("description")} helpKey="page">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </MetaSectionShell>
    );
  }

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="page">
      {!status?.connected ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6">
          {t("connectFirst")}
        </p>
      ) : (
        <FacebookPagesSection
          pages={status.pages}
          connectedPagesCount={status.connectedPagesCount}
          hasFacebookSession={!!status.facebook?.facebookUserId}
          syncing={syncing === "pages"}
          onSync={() => void syncPages()}
          onTogglePage={(pageId, isConnected) => void togglePage(pageId, isConnected)}
        />
      )}
    </MetaSectionShell>
  );
}
