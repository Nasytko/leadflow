import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaHealthCenter } from "@/components/meta-center/meta-health-center";

export default function MetaHealthPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaHealthCenter />
    </Suspense>
  );
}
