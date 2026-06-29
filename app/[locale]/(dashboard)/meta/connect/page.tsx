import { Suspense } from "react";
import { MetaConnectSection } from "@/components/meta-center/sections/meta-connect-section";

export default function MetaConnectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaConnectSection />
    </Suspense>
  );
}
