import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { AdAuditContent } from "@/components/features/analytics/ad-audit-content";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdAuditContent />
    </Suspense>
  );
}
