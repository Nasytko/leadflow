import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaFormsSection } from "@/components/meta-center/sections/meta-forms-section";

export default function MetaFormsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaFormsSection />
    </Suspense>
  );
}
