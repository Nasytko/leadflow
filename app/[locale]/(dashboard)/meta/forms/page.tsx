import { Suspense } from "react";
import { MetaFormsSection } from "@/components/meta-center/sections/meta-forms-section";

export default function MetaFormsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaFormsSection />
    </Suspense>
  );
}
