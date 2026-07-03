import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaLeadsSection } from "@/components/meta-center/sections/meta-leads-section";

export default function MetaLeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaLeadsSection />
    </Suspense>
  );
}
