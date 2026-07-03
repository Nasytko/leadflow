import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaAuditSection } from "@/components/meta-center/sections/meta-audit-section";

export default function MetaAuditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaAuditSection />
    </Suspense>
  );
}
