import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaAdAccountsPageSection } from "@/components/meta-center/sections/meta-ad-accounts-section";

export default function MetaAdAccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaAdAccountsPageSection />
    </Suspense>
  );
}
