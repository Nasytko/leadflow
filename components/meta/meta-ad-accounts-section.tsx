"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, RefreshCw, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetaAdAccountItem = {
  id: string;
  metaAdAccountId: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  timezoneName: string | null;
  businessName: string | null;
  amountSpent: string | null;
  lastSyncedAt: string | null;
};

function accountStatusLabel(status: number | null | undefined, t: (k: string) => string) {
  if (status === 1) return t("adAccountStatusActive");
  if (status === 2) return t("adAccountStatusDisabled");
  if (status == null) return t("adAccountStatusUnknown");
  return String(status);
}

export function MetaAdAccountsSection({
  accounts,
  syncing,
  syncingCampaignsId,
  onSync,
  onSyncCampaigns,
}: {
  accounts: MetaAdAccountItem[];
  syncing: boolean;
  syncingCampaignsId: string | null;
  onSync: () => void;
  onSyncCampaigns: (id: string) => void;
}) {
  const t = useTranslations("metaAds");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#1877F2]" />
            {t("adAccountsTitle")}
          </CardTitle>
          <CardDescription>{t("adAccountsDesc")}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {t("syncAdAccounts")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adAccountsEmpty")}</p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium truncate">{account.name}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {account.metaAdAccountId}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {accountStatusLabel(account.accountStatus, t)}
                  </Badge>
                  {account.currency && <span>{account.currency}</span>}
                  {account.timezoneName && <span>{account.timezoneName}</span>}
                  {account.businessName && (
                    <span>{t("adAccountBusiness", { name: account.businessName })}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncingCampaignsId === account.id}
                  onClick={() => onSyncCampaigns(account.id)}
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-2",
                      syncingCampaignsId === account.id && "animate-spin"
                    )}
                  />
                  {t("syncCampaigns")}
                </Button>
                <Button size="sm" asChild className="bg-[#1877F2] hover:bg-[#166FE5] text-white">
                  <Link href={`/ad-audit?adAccountId=${account.id}`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t("openAudit")}
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
