import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LeadsContent } from "@/components/leads/leads-content";

export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeadsContent />
    </Suspense>
  );
}
