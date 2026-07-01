"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  gradient = false,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  gradient?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-6 sm:p-8",
        gradient
          ? "bg-gradient-to-br from-primary/8 via-card to-card border-primary/15"
          : "bg-card border-border/60",
        className
      )}
    >
      {gradient && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      )}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
