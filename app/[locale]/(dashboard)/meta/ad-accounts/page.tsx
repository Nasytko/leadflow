import { Suspense } from "react";
import { MetaAdAccountsPageSection } from "@/components/meta-center/sections/meta-ad-accounts-section";

export default function MetaAdAccountsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaAdAccountsPageSection />
    </Suspense>
  );
}
