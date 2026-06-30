import { Suspense } from "react";
import { MetaTelegramMessagesSection } from "@/components/meta-center/sections/meta-telegram-messages-section";

export default function MetaTelegramMessagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaTelegramMessagesSection />
    </Suspense>
  );
}
