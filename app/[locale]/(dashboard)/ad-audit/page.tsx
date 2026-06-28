import { Suspense } from "react";
import { AdAuditContent } from "@/components/meta/ad-audit-content";

export default function AdAuditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdAuditContent />
    </Suspense>
  );
}
