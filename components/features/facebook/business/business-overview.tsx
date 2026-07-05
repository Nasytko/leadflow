"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type Business = FacebookOverviewData["businesses"][number];

function healthBadge(status: Business["health"]) {
  if (status === "ready") return "ok" as const;
  if (status === "warning") return "warning" as const;
  return "unknown" as const;
}

export function FacebookBusinessOverview({
  businesses,
  primaryBusinessId,
  onUpdated,
}: {
  businesses: Business[];
  primaryBusinessId: string | null;
  onUpdated: () => void | Promise<void>;
}) {
  const t = useTranslations("connections.facebook.overview.business");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setPrimary(businessId: string) {
    setSavingId(businessId);
    try {
      const res = await apiFetch("/api/facebook/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPrimaryBusiness", businessId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error.message ?? t("setPrimaryFailed"));
        return;
      }
      toast.success(t("setPrimarySuccess"));
      await onUpdated();
    } catch {
      toast.error(t("setPrimaryFailed"));
    } finally {
      setSavingId(null);
    }
  }

  if (businesses.length === 0) {
    return (
      <section className="surface px-6 py-8 sm:px-8 space-y-3">
        <h2 className="type-title">{t("title")}</h2>
        <p className="type-body font-medium">{t("emptyTitle")}</p>
        <p className="type-body text-muted-foreground">{t("emptyDesc")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="type-title px-1">{t("title")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {businesses.map((business) => {
          const isPrimary = business.businessId === primaryBusinessId || business.isPrimary;
          return (
            <article
              key={business.id}
              className={cn(
                "surface px-5 py-5 sm:px-6 space-y-4",
                isPrimary && "ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {business.pictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.pictureUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="type-body font-semibold truncate">{business.name}</h3>
                    {isPrimary && (
                      <Star className="h-4 w-4 text-amber-500 shrink-0 fill-amber-500" aria-hidden />
                    )}
                  </div>
                  <p className="type-caption text-muted-foreground font-mono">
                    {t("id")}: {business.businessId}
                  </p>
                  {business.verificationStatus && (
                    <p className="type-caption text-muted-foreground">
                      {t("verification")}: {business.verificationStatus}
                    </p>
                  )}
                </div>
                <StatusBadge
                  status={healthBadge(business.health)}
                  label={t(`health.${business.health}`)}
                />
              </div>

              <dl className="grid grid-cols-3 gap-3 type-caption">
                <div>
                  <dt className="text-muted-foreground">{t("assets.pages")}</dt>
                  <dd className="type-body font-medium mt-0.5">{business.pagesCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("assets.adAccounts")}</dt>
                  <dd className="type-body font-medium mt-0.5">{business.adAccountsCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("assets.forms")}</dt>
                  <dd className="type-body font-medium mt-0.5">{business.formsCount}</dd>
                </div>
              </dl>

              {!isPrimary && businesses.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={savingId === business.businessId}
                  onClick={() => void setPrimary(business.businessId)}
                >
                  {t("setPrimary")}
                </Button>
              )}
              {isPrimary && businesses.length > 1 && (
                <p className="type-caption text-muted-foreground">{t("primaryLabel")}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
