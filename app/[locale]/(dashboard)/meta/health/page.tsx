import { Suspense } from "react";
import { MetaHealthCenter } from "@/components/meta-center/meta-health-center";

export default function MetaHealthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MetaHealthCenter />
    </Suspense>
  );
}
