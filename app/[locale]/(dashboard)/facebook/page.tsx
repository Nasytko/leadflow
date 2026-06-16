import { Suspense } from "react";
import { FacebookContent } from "@/components/facebook/facebook-content";

export default function FacebookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FacebookContent />
    </Suspense>
  );
}
