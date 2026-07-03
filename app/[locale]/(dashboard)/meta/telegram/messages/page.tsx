import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaTelegramMessagesSection } from "@/components/meta-center/sections/meta-telegram-messages-section";

export default function MetaTelegramMessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaTelegramMessagesSection />
    </Suspense>
  );
}
