"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, Layers, RefreshCw } from "lucide-react";
import { pageHasLimitedAccess } from "@/lib/facebook-diagnosis";
import { cn } from "@/lib/utils";

export type PageItem = {
  id: string;
  pageId: string;
  pageName: string;
  pictureUrl?: string | null;
  category?: string | null;
  link?: string | null;
  tasks?: string[];
  connected: boolean;
  webhookStatus?: string;
  syncStatus?: string;
  activeFormsCount?: number;
  totalFormsCount?: number;
  business?: {
    name: string;
    businessId: string;
  } | null;
};

export function FacebookPagesSection({
  pages,
  connectedPagesCount,
  hasFacebookSession,
  syncing,
  onSync,
  onTogglePage,
}: {
  pages: PageItem[];
  connectedPagesCount: number;
  hasFacebookSession: boolean;
  syncing?: boolean;
  onSync: () => void;
  onTogglePage: (pageId: string, isConnected: boolean) => void;
}) {
  const t = useTranslations("facebook");
  const tCommon = useTranslations("common");

  const showNoPagesWarning = hasFacebookSession && pages.length === 0;

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#1877F2]" />
          {t("yourPages")}
        </CardTitle>
        <CardDescription>
          {t("pagesConnected", { count: connectedPagesCount })} / {pages.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNoPagesWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {t("pagesEmptyWarning")}
            </p>
          </div>
        )}

        {pages.length === 0 ? (
          <div className="text-center py-10 space-y-4 rounded-xl border border-dashed">
            <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground text-sm">{t("noPages")}</p>
            <Button onClick={onSync} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              {t("syncPages")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <div
                key={page.id}
                className="group flex flex-col gap-3 rounded-xl border p-4 hover:border-[#1877F2]/30 hover:bg-[#1877F2]/[0.02] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {page.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.pictureUrl}
                        alt={page.pageName}
                        className="h-12 w-12 rounded-full object-cover border shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                        <Layers className="h-5 w-5 text-[#1877F2]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{page.pageName}</p>
                      {page.category && (
                        <p className="text-xs text-muted-foreground mt-0.5">{page.category}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {t("pageId")}: {page.pageId}
                      </p>
                      {page.business && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("pageBusinessLabel")}: {page.business.name}
                        </p>
                      )}
                      {page.tasks && page.tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {page.tasks.map((task) => (
                            <Badge key={task} variant="secondary" className="text-[10px] font-mono">
                              {task}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {pageHasLimitedAccess(page.tasks) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          {t("pageLimitedAccessWarning")}
                        </p>
                      )}
                      {page.link && (
                        <a
                          href={page.link}
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
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant={page.connected ? "success" : "secondary"}>
                      {page.connected ? tCommon("connected") : tCommon("notConnected")}
                    </Badge>
                    {page.webhookStatus && (
                      <Badge
                        variant={page.webhookStatus === "success" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        webhook: {page.webhookStatus}
                      </Badge>
                    )}
                    {(page.activeFormsCount ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("pageFormsActive", { count: page.activeFormsCount ?? 0 })}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={page.connected ? "outline" : "default"}
                      className={
                        !page.connected ? "bg-[#1877F2] hover:bg-[#166FE5] text-white" : ""
                      }
                      onClick={() => onTogglePage(page.id, page.connected)}
                    >
                      {page.connected ? t("disconnectPage") : t("connectPage")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
