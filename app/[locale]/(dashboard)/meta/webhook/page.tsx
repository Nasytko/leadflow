import { Suspense } from "react";
import { MetaWebhookSection } from "@/components/meta-center/sections/meta-webhook-section";

export default function MetaWebhookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaWebhookSection />
    </Suspense>
  );
}
