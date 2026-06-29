import { Suspense } from "react";
import { AdminPlatformMetaSettings } from "@/components/admin/admin-platform-meta-settings";

export default function AdminPlatformPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPlatformMetaSettings />
    </Suspense>
  );
}
