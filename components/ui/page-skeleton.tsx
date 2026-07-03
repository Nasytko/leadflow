import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1080px] space-y-8 animate-in fade-in duration-300", className)}>
      <div className="space-y-3">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
