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

  const trendBlock = (trend !== undefined || sublabel || trendLabel) && (
    <p className="type-caption mt-3">
      {trend !== undefined && (
        <span
          className={cn(
            "tabular-nums font-medium",
            trend > 0 && "text-emerald-600",
            trend < 0 && "text-destructive",
            trend === 0 && "text-muted-foreground"
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
  );

  if (minimal) {
    return (
      <Wrapper
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={cn(
          "surface px-6 py-6 text-left surface-hover",
          onClick && "cursor-pointer",
          className
        )}
      >
        <p className="type-caption mb-3 font-medium text-muted-foreground normal-case tracking-normal">
          {label}
        </p>
        <p className="text-[2rem] font-semibold tracking-[-0.03em] tabular-nums text-foreground leading-none">
          {value}
        </p>
        {trendBlock}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "surface px-6 py-6 text-left surface-hover w-full",
        onClick && "cursor-pointer",
        className
      )}
    >
      <p className="type-caption mb-3 font-medium text-muted-foreground normal-case tracking-normal">
        {label}
      </p>
      <p className="text-[1.875rem] font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      {trendBlock}
    </Wrapper>
  );
}
