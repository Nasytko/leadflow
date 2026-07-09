"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { mapConnectionApiError } from "@/lib/connections/action-errors";

export type FacebookSyncResource = "pages" | "forms" | "adAccounts";

const SYNC_URL: Record<FacebookSyncResource, string> = {
  pages: "/api/facebook/pages",
  forms: "/api/forms",
  adAccounts: "/api/meta/ad-accounts",
};

function syncCount(resource: FacebookSyncResource, data: Record<string, unknown> | undefined) {
  if (!data) return null;
  if (resource === "pages") return (data.pages as unknown[] | undefined)?.length;
  if (resource === "forms") return data.synced as number | undefined;
  return (data.synced as number | undefined) ?? (data.adAccounts as unknown[] | undefined)?.length;
}

export function useFacebookSyncActions(onComplete?: () => void | Promise<void>) {
  const tOverview = useTranslations("connections.facebook.overview");
  const tAccount = useTranslations("connections.facebook.accountCard");
  const tFb = useTranslations("facebook");
  const [syncing, setSyncing] = useState<FacebookSyncResource | null>(null);

  const sync = useCallback(
    async (resource: FacebookSyncResource) => {
      setSyncing(resource);
      try {
        const res = await apiFetch(SYNC_URL[resource], { method: "POST" });
        const json = await res.json();
        if (json.error) {
          if (json.error.code === "INVALID_FACEBOOK_TOKEN") {
            toast.error(tFb("tokenInvalid"), { description: tAccount("errors.reconnectHint") });
            return;
          }
          toast.error(mapConnectionApiError(json.error, "facebook", tOverview));
          return;
        }
        const count = syncCount(resource, json.data);
        if (resource === "pages") {
          toast.success(tAccount("pagesSynced", { count: count ?? 0 }));
        } else if (resource === "forms") {
          toast.success(tAccount("formsSynced", { count: count ?? 0 }));
        } else {
          toast.success(
            count != null ? tOverview("syncSuccessWithCount", { count }) : tOverview("syncSuccess")
          );
        }
        await onComplete?.();
      } catch {
        toast.error(tOverview("syncFailed"));
      } finally {
        setSyncing(null);
      }
    },
    [onComplete, tAccount, tFb, tOverview]
  );

  return {
    syncing,
    sync,
    isSyncing: (resource: FacebookSyncResource) => syncing === resource,
  };
}
