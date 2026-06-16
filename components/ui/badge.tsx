import { cn } from "@/lib/utils";
import * as React from "react";

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "success" | "warning" | "destructive" | "secondary" }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "success" && "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        variant === "warning" && "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        variant === "destructive" && "border-transparent bg-destructive/15 text-destructive",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
