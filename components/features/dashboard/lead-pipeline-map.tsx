"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineNode } from "@/lib/dashboard-analytics";

const NODE_LABELS: Record<PipelineNode["id"], string> = {
  source: "nodeSource",
  processing: "nodeProcessing",
  delivery: "nodeDelivery",
};

const STATUS_KEYS = {
  ok: "statusHealthy",
  warning: "statusAttention",
  error: "statusIssue",
  unknown: "statusUnknown",
} as const;

export function LeadPipelineMap({ nodes }: { nodes: PipelineNode[] }) {
  const t = useTranslations("dashboard.pipelineMap");

  return (
    <section className="rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-6">
      <h2 className="type-title mb-5">{t("title")}</h2>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col lg:flex-1 lg:flex-row lg:items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex-1 rounded-xl border px-4 py-4 min-h-[120px] flex flex-col justify-between",
                node.status === "ok" && "border-emerald-500/25 bg-emerald-500/[0.04]",
                node.status === "warning" && "border-amber-500/25 bg-amber-500/[0.04]",
                node.status === "error" && "border-destructive/25 bg-destructive/[0.04]",
                node.status === "unknown" && "border-border bg-muted/20"
              )}
            >
              <div>
                <p className="type-caption text-muted-foreground">{t(NODE_LABELS[node.id])}</p>
                <p className="type-body font-semibold mt-1">{t(node.healthLabelKey)}</p>
                <p className={cn("type-caption mt-2", node.status === "ok" ? "text-emerald-600" : "text-muted-foreground")}>
                  {t(STATUS_KEYS[node.status])}
                </p>
              </div>
              <p className="type-caption mt-3 tabular-nums">
                {t("todayCount", { count: node.todayCount })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild className="h-8">
                  <Link href={node.manageHref}>{t("manage")}</Link>
                </Button>
                {node.fixHref && (
                  <Button size="sm" variant="secondary" asChild className="h-8 gap-1">
                    <Link href={node.fixHref}>
                      <Wrench className="h-3.5 w-3.5" />
                      {t("fixIssue")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {index < nodes.length - 1 && (
              <>
                <ArrowDown className="h-5 w-5 shrink-0 text-muted-foreground mx-auto lg:hidden" />
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground hidden lg:block" />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
