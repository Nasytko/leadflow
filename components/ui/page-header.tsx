"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  icon: _icon,
  badge,
  children,
  gradient: _gradient = false,
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
        "mb-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="space-y-2 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="type-display">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="type-body text-muted-foreground">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
