import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LogsContent } from "@/components/features/activity/logs-content";

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LogsContent />
    </Suspense>
  );
}
