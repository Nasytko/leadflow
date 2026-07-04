"use client";

import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  className,
  size = "md",
}: {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showPercent && (
            <span className="text-muted-foreground">{percent}%</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
