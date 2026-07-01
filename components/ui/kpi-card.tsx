"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

type KpiVariant = "default" | "success" | "warning" | "brand" | "facebook";

const variantStyles: Record<KpiVariant, { card: string; icon: string }> = {
  default: { card: "border-border/60", icon: "bg-muted text-muted-foreground" },
  success: { card: "border-emerald-500/25 bg-emerald-500/[0.04]", icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  warning: { card: "border-amber-500/25 bg-amber-500/[0.04]", icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  brand: { card: "border-primary/25 bg-primary/[0.04]", icon: "bg-primary/15 text-primary" },
  facebook: { card: "border-[#1877F2]/25 bg-[#1877F2]/[0.04]", icon: "bg-[#1877F2]/15 text-[#1877F2]" },
};

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  variant = "default",
  trend,
  trendLabel,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
}) {
  const styles = variantStyles[variant];
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border p-4 text-left transition-all hover:shadow-sm",
        styles.card,
        onClick && "cursor-pointer hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
          {sublabel && (
            <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
          )}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                {trend > 0 ? "+" : ""}{trend}%
              </span>
              {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
