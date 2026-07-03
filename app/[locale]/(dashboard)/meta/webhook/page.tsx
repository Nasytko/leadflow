import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaWebhookSection } from "@/components/meta-center/sections/meta-webhook-section";

export default function MetaWebhookPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaWebhookSection />
    </Suspense>
  );
}
