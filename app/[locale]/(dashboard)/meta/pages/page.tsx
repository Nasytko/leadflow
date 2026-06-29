import { Suspense } from "react";
import { MetaPagesSection } from "@/components/meta-center/sections/meta-pages-section";

export default function MetaPagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaPagesSection />
    </Suspense>
  );
}
