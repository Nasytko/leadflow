import { Suspense } from "react";
import { MetaTelegramSection } from "@/components/meta-center/sections/meta-telegram-section";

export default function MetaTelegramPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaTelegramSection />
    </Suspense>
  );
}
