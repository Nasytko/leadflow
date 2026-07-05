"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";
import { FacebookFormsOverview } from "./forms-overview";

export function FacebookFormsSetupPanel() {
  const [forms, setForms] = useState<FacebookOverviewData["forms"]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/facebook/overview");
      const json = await res.json();
      if (json.data?.forms) setForms(json.data.forms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return <FacebookFormsOverview forms={forms} onUpdated={load} />;
}
