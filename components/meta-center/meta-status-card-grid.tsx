"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaCenterStatusCard } from "@/lib/meta-center-health";

function StatusIcon({ status }: { status: string }) {
  if (status === "ok")
    return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
  if (status === "warning")
    return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
  if (status === "error")
    return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
  return <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0" />;
}

export function MetaStatusCardGrid({ cards }: { cards: MetaCenterStatusCard[] }) {
  const t = useTranslations("metaCenter");

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "rounded-2xl transition-shadow hover:shadow-md",
            card.status === "ok" && "border-emerald-500/25",
            card.status === "warning" && "border-amber-500/25",
            card.status === "error" && "border-destructive/25"
          )}
        >
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <StatusIcon status={card.status} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{t(card.titleKey)}</p>
                  {card.detail && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {card.detail}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  card.status === "ok"
                    ? "success"
                    : card.status === "error"
                    ? "destructive"
                    : "warning"
                }
                className="shrink-0 text-[10px]"
              >
                {t(`statusLevel.${card.status}` as "statusLevel.ok")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(card.explanationKey)}
            </p>
            {card.lastError && (
              <p className="text-xs text-destructive/80 line-clamp-2">{card.lastError}</p>
            )}
            <Button variant="outline" size="sm" asChild className="w-full rounded-xl">
              <Link href={card.fixHref}>
                {t(card.fixLabelKey)}
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
