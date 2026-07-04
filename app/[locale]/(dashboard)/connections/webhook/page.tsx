import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { WebhookConnectionContent } from "@/components/features/connections/webhook/webhook-connection-content";

export default function ConnectionsWebhookPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WebhookConnectionContent />
    </Suspense>
  );
}
