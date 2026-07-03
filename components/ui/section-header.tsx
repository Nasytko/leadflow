import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-6", className)}>
      <div className="space-y-1.5 min-w-0">
        <h2 className="type-title">{title}</h2>
        {description && <p className="type-caption max-w-lg">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
