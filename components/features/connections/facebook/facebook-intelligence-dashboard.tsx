"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";
import { FacebookAccountOverview } from "./facebook-account-overview";
import { FacebookHealthPanel } from "./facebook-health-panel";
import { FacebookBusinessOverview } from "./facebook-business-overview";
import { FacebookPagesOverview } from "./facebook-pages-overview";
import { FacebookFormsOverview } from "./facebook-forms-overview";
import { FacebookAdAccountsOverview } from "./facebook-ad-accounts-overview";
import { FacebookActivityTimeline } from "./facebook-activity-timeline";

export function FacebookIntelligenceDashboard() {
  const t = useTranslations("connections.facebook.overview");
  const [data, setData] = useState<FacebookOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 15000);
      const res = await apiFetch("/api/facebook/overview", { signal: c.signal });
      clearTimeout(id);
      const json = await res.json();
      if (json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncResource(resource: "pages" | "forms" | "adAccounts") {
    setSyncing(resource);
    try {
      const url =
        resource === "pages"
          ? "/api/facebook/pages"
          : resource === "forms"
            ? "/api/forms"
            : "/api/meta/ad-accounts";
      const res = await apiFetch(url, { method: "POST" });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error.message ?? t("syncFailed"));
        return;
      }
      toast.success(t("syncSuccess"));
      await load();
    } catch {
      toast.error(t("syncFailed"));
    } finally {
      setSyncing(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!data?.connection) {
    return null;
  }

  return (
    <div className="space-y-8">
      {!data.setupComplete && (
        <div className="surface px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-amber-500/30 bg-amber-500/5">
          <div>
            <StatusBadge status="warning" label={t("setupIncomplete")} />
            <p className="type-caption text-muted-foreground mt-2">{t("setupIncompleteDesc")}</p>
          </div>
          <Button variant="outline" className="min-h-11 shrink-0" asChild>
            <Link href={`/connections/facebook?step=${data.setupStep}`}>{t("continueSetup")}</Link>
          </Button>
        </div>
      )}

      <FacebookAccountOverview connection={data.connection} onRefresh={load} />
      <FacebookHealthPanel health={data.health} />
      <FacebookActivityTimeline activity={data.activity} />
      <FacebookBusinessOverview
        businesses={data.businesses}
        primaryBusinessId={data.primaryBusinessId}
        onUpdated={load}
      />
      <FacebookPagesOverview
        pages={data.pages}
        syncing={syncing === "pages"}
        onSync={() => syncResource("pages")}
      />
      <FacebookFormsOverview
        forms={data.forms}
        syncing={syncing === "forms"}
        onSync={() => syncResource("forms")}
      />
      <FacebookAdAccountsOverview
        adAccounts={data.adAccounts}
        syncing={syncing === "adAccounts"}
        onSync={() => syncResource("adAccounts")}
      />
    </div>
  );
}
