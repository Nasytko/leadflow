import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LeadsContent } from "@/components/features/leads/leads-content";

export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadsContent />
    </Suspense>
  );
}
