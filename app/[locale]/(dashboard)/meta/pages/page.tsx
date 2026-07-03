import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaPagesSection } from "@/components/meta-center/sections/meta-pages-section";

export default function MetaPagesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaPagesSection />
    </Suspense>
  );
}
