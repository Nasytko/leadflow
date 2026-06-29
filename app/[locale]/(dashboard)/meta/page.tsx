import { Suspense } from "react";
import { MetaCenterOverview } from "@/components/meta-center/meta-center-overview";

export default function MetaCenterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaCenterOverview />
    </Suspense>
  );
}
