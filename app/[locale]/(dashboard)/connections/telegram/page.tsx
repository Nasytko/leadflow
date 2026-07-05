import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { TelegramSetupFlow } from "@/components/features/telegram/setup-flow";

export default function ConnectionsTelegramPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TelegramSetupFlow />
    </Suspense>
  );
}
