import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { WorkspaceHealthContent } from "@/components/features/health/workspace-health-content";

export default function HealthPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspaceHealthContent />
    </Suspense>
  );
}
