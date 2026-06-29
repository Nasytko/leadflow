import { Suspense } from "react";
import { MetaLeadsSection } from "@/components/meta-center/sections/meta-leads-section";

export default function MetaLeadsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaLeadsSection />
    </Suspense>
  );
}
