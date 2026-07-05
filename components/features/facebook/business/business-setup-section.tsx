"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Building2, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessItem = {
  id: string;
  businessId: string;
  name: string;
  verificationStatus: string | null;
  pictureUrl: string | null;
  link: string | null;
  pagesCount?: number;
  formsCount?: number;
};

export function FacebookBusinessesSection({
  businesses,
  pagesCount,
  syncing,
  onSync,
}: {
  businesses: BusinessItem[];
  pagesCount: number;
  syncing?: boolean;
  onSync?: () => void;
}) {
  const t = useTranslations("facebook");

  const showPagesWithoutBusinessWarning =
    pagesCount > 0 && businesses.length === 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1877F2]" />
              {t("businessesTitle")}
            </CardTitle>
            <CardDescription>{t("businessesDesc")}</CardDescription>
          </div>
          {onSync && (
            <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
              {t("syncBusinesses")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showPagesWithoutBusinessWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t("businessesMissingWarning")}
            </p>
          </div>
        )}

        {businesses.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto opacity-50 mb-3" />
            <p className="text-sm text-muted-foreground">{t("businessesEmpty")}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="flex gap-3 rounded-xl border p-4 hover:border-[#1877F2]/30 transition-colors"
              >
                {business.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business.pictureUrl}
                    alt={business.name}
                    className="h-12 w-12 rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-[#1877F2]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{business.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {t("businessIdLabel")}: {business.businessId}
                  </p>
                  {business.verificationStatus && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {business.verificationStatus}
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {t("businessPagesCount", { count: business.pagesCount ?? 0 })}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {t("businessFormsCount", { count: business.formsCount ?? 0 })}
                    </Badge>
                  </div>
                  {business.link && (
                    <a
                      href={business.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#1877F2] mt-2 hover:underline"
                    >
                      {t("openOnFacebook")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
