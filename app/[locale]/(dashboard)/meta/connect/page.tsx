import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaConnectSection } from "@/components/meta-center/sections/meta-connect-section";

export default function MetaConnectPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaConnectSection />
    </Suspense>
  );
}
