"use client";

import { useEffect } from "react";
import { ensureCsrfToken } from "@/lib/client-api";

/** Prefetch CSRF token when dashboard shell mounts. */
export function CsrfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void ensureCsrfToken();
  }, []);
  return <>{children}</>;
}
