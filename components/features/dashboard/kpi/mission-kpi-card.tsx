"use client";

import { cn } from "@/lib/utils";

export type KpiBreakdownLine = {
  label: string;
  value: number | string;
};

export function MissionKpiCard({
  label,
  value,
  trend,
  trendLabel,
  breakdown,
  variant = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  breakdown?: KpiBreakdownLine[];
  variant?: "default" | "warning" | "success";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-5 py-5 shadow-sm transition-shadow hover:shadow-md",
        variant === "warning" && "border-amber-500/30 bg-amber-500/[0.03]",
        variant === "success" && "border-emerald-500/30 bg-emerald-500/[0.03]",
        className
      )}
    >
      <p className="type-caption mb-2 font-medium text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              "type-caption tabular-nums font-semibold",
              trend > 0 && "text-emerald-600",
              trend < 0 && "text-destructive",
              trend === 0 && "text-muted-foreground"
            )}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      {trendLabel && (
        <p className="type-caption mt-1 text-muted-foreground">{trendLabel}</p>
      )}
      {breakdown && breakdown.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
          {breakdown.map((line) => (
            <li key={line.label} className="flex items-center justify-between type-caption">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="tabular-nums font-medium text-foreground">{line.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
