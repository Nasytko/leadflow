import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LogsContent } from "@/components/logs/logs-content";

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LogsContent />
    </Suspense>
  );
}
