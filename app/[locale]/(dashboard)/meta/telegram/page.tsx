import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetaTelegramSection } from "@/components/meta-center/sections/meta-telegram-section";

export default function MetaTelegramPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MetaTelegramSection />
    </Suspense>
  );
}
