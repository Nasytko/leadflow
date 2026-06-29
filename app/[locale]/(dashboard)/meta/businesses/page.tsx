import { Suspense } from "react";
import { MetaBusinessesSection } from "@/components/meta-center/sections/meta-businesses-section";

export default function MetaBusinessesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaBusinessesSection />
    </Suspense>
  );
}
