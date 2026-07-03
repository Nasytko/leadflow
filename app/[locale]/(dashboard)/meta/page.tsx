import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaCenterOverview } from "@/components/meta-center/meta-center-overview";

export default function MetaCenterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaCenterOverview />
    </Suspense>
  );
}
