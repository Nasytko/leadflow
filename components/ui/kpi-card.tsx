"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  sublabel,
  icon: _icon,
  variant: _variant = "default",
  trend,
  trendLabel,
  onClick,
  className,
  minimal = false,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "brand" | "facebook";
  trend?: number;
  trendLabel?: string;
  onClick?: () => void;
  className?: string;
  minimal?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";

  if (minimal) {
    return (
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "text-left",
          onClick && "cursor-pointer hover:opacity-80 transition-opacity",
          className
        )}
      >
        <p className="type-label mb-4">{label}</p>
        <p className="text-[2rem] font-medium tracking-[-0.03em] tabular-nums text-foreground leading-none">
          {value}
        </p>
        {(trend !== undefined || sublabel || trendLabel) && (
          <p className="type-caption mt-3">
            {trend !== undefined && (
              <span
                className={cn(
                  "tabular-nums",
                  trend >= 0 ? "text-foreground/70" : "text-destructive"
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend}%
              </span>
            )}
            {trendLabel && (
              <span className="text-muted-foreground">
                {trend !== undefined ? " · " : ""}
                {trendLabel}
              </span>
            )}
            {sublabel && !trendLabel && (
              <span className="text-muted-foreground">{sublabel}</span>
            )}
          </p>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border border-border/70 bg-card p-6 text-left transition-colors",
        onClick && "cursor-pointer hover:border-border",
        className
      )}
    >
      <p className="type-label mb-4">{label}</p>
      <p className="text-[1.75rem] font-medium tracking-[-0.03em] tabular-nums">{value}</p>
      {(sublabel || trend !== undefined) && (
        <p className="type-caption mt-3">
          {trend !== undefined && (
            <span className="tabular-nums">
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          )}
          {trendLabel && <span> · {trendLabel}</span>}
          {sublabel && !trendLabel && sublabel}
        </p>
      )}
    </Wrapper>
  );
}
