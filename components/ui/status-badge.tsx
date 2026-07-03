import { cn } from "@/lib/utils";

type StatusLevel = "ok" | "warning" | "error" | "unknown";

const dotColors: Record<StatusLevel, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-muted-foreground/40",
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
    <span className={cn("inline-flex items-center gap-2 type-caption", className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColors[status])} />
      <span className="text-foreground/70">{label}</span>
    </span>
  );
}
