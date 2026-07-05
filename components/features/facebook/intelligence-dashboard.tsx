"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";
import { FacebookAccountOverview } from "./account/account-overview";
import { FacebookHealthPanel } from "./health/health-panel";
import { FacebookNextSteps } from "./health/next-steps";
import { FacebookActionCenter } from "./account/action-center";
import { FacebookBusinessOverview } from "./business/business-overview";
import { FacebookPagesOverview } from "./pages/pages-overview";
import { FacebookFormsOverview } from "./forms/forms-overview";
import { FacebookImportLeadsCard } from "./forms/import-leads-card";
import { FacebookAdAccountsOverview } from "./ads/ad-accounts-overview";
import { FacebookActivityTimeline } from "./activity/activity-timeline";
import { useFacebookLeadImport } from "@/hooks/use-facebook-lead-import";
import { useFacebookSyncActions } from "@/hooks/use-facebook-sync-actions";

export function FacebookIntelligenceDashboard() {
  const t = useTranslations("connections.facebook.overview");
  const [data, setData] = useState<FacebookOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const leadImport = useFacebookLeadImport(load);
  const { syncing, sync } = useFacebookSyncActions(load);

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

  const facebookBroken =
    data.connection.tokenInvalid ||
    data.connection.connectionStatus === "expired" ||
    data.connection.connectionStatus === "error" ||
    data.connection.connectionStatus === "needs_reconnect";

  const actionContext = {
    connected: data.connected,
    tokenInvalid: data.connection.tokenInvalid,
    facebookBroken,
    totalPagesCount: data.counts.pages,
    totalFormsCount: data.counts.forms,
    activeFormsCount: data.counts.activeForms,
  };

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

      <div className="grid gap-8 lg:grid-cols-2">
        <FacebookAccountOverview connection={data.connection} />
        <FacebookHealthPanel health={data.health} />
      </div>

      <FacebookNextSteps
        connected={data.connected}
        totalPagesCount={data.counts.pages}
        connectedPagesCount={data.counts.connectedPages}
        totalFormsCount={data.counts.forms}
        activeFormsCount={data.counts.activeForms}
        webhookVerified={data.webhookVerified}
        telegramConnected={data.telegramConnected}
      />

      <FacebookActionCenter
        context={actionContext}
        onRefresh={load}
        syncingResource={syncing}
        onSyncResource={(resource) => sync(resource)}
        onImportLeads={() => void leadImport.importLeads()}
        importingLeads={leadImport.importing}
      />

      <FacebookBusinessOverview
        businesses={data.businesses}
        primaryBusinessId={data.primaryBusinessId}
        onUpdated={load}
      />

      <FacebookPagesOverview pages={data.pages} />

      <div className="space-y-6">
        <FacebookFormsOverview
          forms={data.forms}
          onUpdated={load}
          facebookBroken={facebookBroken}
        />
        <FacebookImportLeadsCard
          enabledFormsCount={data.counts.activeForms}
          totalFormsCount={data.counts.forms}
          telegramConnected={data.telegramConnected}
          facebookBroken={facebookBroken}
          leadImport={leadImport}
        />
      </div>

      <FacebookAdAccountsOverview adAccounts={data.adAccounts} />

      <FacebookActivityTimeline activity={data.activity} />
    </div>
  );
}
