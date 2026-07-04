"use client";

import { cn } from "@/lib/utils";
import type { SetupStepStatus } from "@/lib/connections/facebook-setup-state";

export type SetupStepItem = {
  id: string;
  label: string;
  status: SetupStepStatus;
};

export function SetupStepper({
  steps,
  activeIndex,
  totalLabel,
  onStepClick,
  compact,
}: {
  steps: SetupStepItem[];
  activeIndex: number;
  totalLabel: string;
  onStepClick?: (index: number) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="space-y-3">
        <p className="type-caption text-muted-foreground text-center">{totalLabel}</p>
        <div className="flex justify-center gap-1.5">
          {steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              aria-label={step.label}
              aria-current={i === activeIndex ? "step" : undefined}
              onClick={() => onStepClick?.(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30",
                step.status === "completed" && i !== activeIndex && "bg-emerald-500/60",
                step.status === "error" && "bg-red-500"
              )}
            />
          ))}
        </div>
        <p className="type-body text-center font-medium">{steps[activeIndex]?.label}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="type-caption text-muted-foreground">{totalLabel}</p>
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((step, i) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              disabled={!onStepClick}
              className={cn(
                "w-full rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px]",
                step.status === "current" && "border-primary/35 bg-primary/[0.06] shadow-sm",
                step.status === "completed" && "border-border bg-background",
                step.status === "pending" && "border-border/60 opacity-60",
                step.status === "warning" && "border-amber-500/40 bg-amber-500/5",
                step.status === "error" && "border-destructive/40 bg-destructive/5",
                onStepClick && "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <span className="type-caption text-muted-foreground block">{i + 1}</span>
              <span className="type-caption font-medium text-foreground block truncate">
                {step.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
