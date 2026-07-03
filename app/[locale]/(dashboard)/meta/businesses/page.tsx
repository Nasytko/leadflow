import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaBusinessesSection } from "@/components/meta-center/sections/meta-businesses-section";

export default function MetaBusinessesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaBusinessesSection />
    </Suspense>
  );
}
