import { cn } from "@/lib/utils";

type StatusLevel = "ok" | "warning" | "error" | "unknown";

const styles: Record<StatusLevel, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusLevel;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        styles[status],
        className
      )}
    >
      {label}
    </span>
  );
}
