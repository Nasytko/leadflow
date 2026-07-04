import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { FacebookSetupFlow } from "@/components/features/connections/facebook/facebook-setup-flow";

export default function ConnectionsFacebookPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FacebookSetupFlow />
    </Suspense>
  );
}
