"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className
      )}
    >
      {Icon && <Icon className="mb-4 h-8 w-8 text-muted-foreground/30" strokeWidth={1.25} />}
      <p className="type-title text-foreground/80">{title}</p>
      {description && (
        <p className="type-caption mt-2 max-w-xs">{description}</p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
