"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import {
  MetaAdAccountsSection,
  type MetaAdAccountItem,
} from "@/components/meta/meta-ad-accounts-section";
import { useMetaFacebookStatus } from "@/hooks/use-meta-facebook-status";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";

export function MetaAdAccountsPageSection() {
  const t = useTranslations("metaCenter.adAccounts");
  const { status, loading: statusLoading } = useMetaFacebookStatus();
  const [accounts, setAccounts] = useState<MetaAdAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCampaignsId, setSyncingCampaignsId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/meta/ad-accounts");
      const data = await res.json();
      setAccounts(data.data?.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/meta/ad-accounts", { method: "POST" });
      const data = await res.json();
      if (data.data?.accounts) {
        setAccounts(data.data.accounts);
        toast.success(t("synced"));
      } else {
        toast.error(data.error?.message ?? t("syncFailed"));
      }
    } catch {
      toast.error(t("syncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncCampaigns(id: string) {
    setSyncingCampaignsId(id);
    try {
      const res = await apiFetch(`/api/meta/ad-accounts/${id}/sync-campaigns`, {
        method: "POST",
      });
      if (res.ok) toast.success(t("campaignsSynced"));
      else toast.error(t("campaignsSyncFailed"));
    } catch {
      toast.error(t("campaignsSyncFailed"));
    } finally {
      setSyncingCampaignsId(null);
    }
  }

  if ((loading || statusLoading) && !accounts.length) {
    return (
      <MetaSectionShell title={t("title")} description={t("description")} helpKey="adAccount">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </MetaSectionShell>
    );
  }

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="adAccount">
      {!status?.connected ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6">
          {t("connectFirst")}
        </p>
      ) : (
        <MetaAdAccountsSection
          accounts={accounts}
          syncing={syncing}
          syncingCampaignsId={syncingCampaignsId}
          onSync={() => void handleSync()}
          onSyncCampaigns={(id) => void handleSyncCampaigns(id)}
        />
      )}
    </MetaSectionShell>
  );
}
