import { Suspense } from "react";
import { MetaAuditSection } from "@/components/meta-center/sections/meta-audit-section";

export default function MetaAuditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaAuditSection />
    </Suspense>
  );
}
