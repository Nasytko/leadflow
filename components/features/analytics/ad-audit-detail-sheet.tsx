"use client";

import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { CampaignQuality } from "@/lib/ad-audit-analytics";

type DetailEntity = {
  type: "campaign" | "ad";
  name: string;
  metaId: string;
  status?: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number | null;
  ctr: number;
  cpm: number;
  quality: CampaignQuality;
  campaignName?: string;
  adSetName?: string;
  currency?: string;
  admin?: Record<string, unknown> | null;
};

const qualityVariant: Record<
  CampaignQuality,
  "success" | "warning" | "destructive" | "secondary"
> = {
  effective: "success",
  attention: "warning",
  wasting: "destructive",
  insufficient: "secondary",
};

export function AdAuditDetailSheet({
  open,
  onOpenChange,
  entity,
  periodLabel,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: DetailEntity | null;
  periodLabel: string;
  isAdmin?: boolean;
}) {
  const t = useTranslations("metaAds");

  if (!entity) return null;

  const cur = entity.currency ?? "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{entity.name === "unnamed_campaign" || entity.name === "unnamed_ad" ? entity.metaId : entity.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {entity.type === "campaign" ? t("detailCampaign") : t("detailAd")} · {periodLabel}
          </p>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Badge variant={qualityVariant[entity.quality]}>
            {t(`quality.${entity.quality}` as "quality.effective")}
          </Badge>
          <p className="text-xs text-muted-foreground font-mono">{entity.metaId}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              [t("kpiSpend"), `${entity.spend.toFixed(2)} ${cur}`],
              [t("kpiLeads"), String(entity.leads)],
              [t("kpiCpl"), entity.cpl != null ? `${entity.cpl.toFixed(2)} ${cur}` : "—"],
              [t("kpiCtr"), `${entity.ctr.toFixed(2)}%`],
              [t("kpiCpm"), `${entity.cpm.toFixed(2)} ${cur}`],
              [t("kpiImpressions"), String(entity.impressions)],
              [t("kpiClicks"), String(entity.clicks)],
              [t("colStatus"), entity.status ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {entity.type === "ad" && (
            <div className="text-sm space-y-1 border-t pt-3">
              <p>
                <span className="text-muted-foreground">{t("colCampaign")}: </span>
                {entity.campaignName}
              </p>
              <p>
                <span className="text-muted-foreground">{t("colAdSet")}: </span>
                {entity.adSetName}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground border-t pt-3">
            {t(`qualityHint.${entity.quality}` as "qualityHint.effective")}
          </p>

          {isAdmin && entity.admin && (
            <pre className="text-[10px] bg-muted p-3 rounded-lg overflow-auto max-h-40">
              {JSON.stringify(entity.admin, null, 2)}
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
