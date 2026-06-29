"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Activity } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MetaCenterNav } from "@/components/meta-center/meta-center-nav";
import { MetaStatusCardGrid } from "@/components/meta-center/meta-status-card-grid";
import { MetaOnboardingWizard } from "@/components/meta-center/meta-onboarding-wizard";
import type { MetaCenterStatusCard } from "@/lib/meta-center-health";
import type { WizardStepsState } from "@/components/facebook/facebook-setup-wizard";
import { apiFetch } from "@/lib/client-api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type CenterData = {
  wizardSteps: WizardStepsState;
  wizardProgress: number;
  wizardTotal: number;
  statusCards: MetaCenterStatusCard[];
  connected: boolean;
};

export function MetaCenterOverview() {
  const t = useTranslations("metaCenter");
  const [data, setData] = useState<CenterData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/meta/center");
      const json = await res.json();
      if (json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={Megaphone}
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </PageHeader>
      <MetaCenterNav />

      {loading && !data ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : data ? (
        <>
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">{t("healthTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("healthSubtitle")}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/meta/health">
                  <Activity className="h-4 w-4 mr-2" />
                  {t("nav.health")}
                </Link>
              </Button>
            </div>
            <MetaStatusCardGrid cards={data.statusCards} />
          </section>
          <MetaOnboardingWizard
            steps={data.wizardSteps}
            progress={data.wizardProgress}
            total={data.wizardTotal}
          />
        </>
      ) : null}
    </div>
  );
}
