"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";

async function fetchWithTimeout(url: string, init?: RequestInit, ms = 20000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  try {
    return await apiFetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

export type MetaAccountAction = "refresh" | "reconnect" | "disconnect" | "syncPages" | "syncForms";

export function useMetaAccountActions(onComplete?: () => void | Promise<void>) {
  const t = useTranslations("metaCenter.accountCard");
  const tFb = useTranslations("facebook");
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<MetaAccountAction | null>(null);

  const run = useCallback(
    async (action: MetaAccountAction) => {
      setLoadingAction(action);
      try {
        if (action === "reconnect") {
          const res = await fetchWithTimeout("/api/facebook/connect");
          const data = await res.json();
          if (data.data?.url) {
            window.location.href = data.data.url;
            return;
          }
          toast.error(data.error?.message ?? tFb("oauthFailed"));
          return;
        }

        if (action === "disconnect") {
          const res = await fetchWithTimeout("/api/facebook/reset", { method: "POST" });
          const data = await res.json();
          if (data.error) {
            toast.error(data.error.message ?? t("errors.disconnect"));
            return;
          }
          toast.success(tFb("resetConnectionSuccess"));
          await onComplete?.();
          return;
        }

        if (action === "refresh") {
          const res = await fetchWithTimeout("/api/facebook/refresh", { method: "POST" });
          const data = await res.json();
          if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
            toast.error(tFb("tokenInvalid"), { description: t("errors.reconnectHint") });
            return;
          }
          if (data.error) {
            toast.error(data.error.message ?? t("errors.refresh"), {
              description: t("errors.reconnectHint"),
            });
            return;
          }
          if (!data.data?.ok) {
            toast.warning(t("refreshPartial"), {
              description: data.data?.facebook?.lastError ?? t("errors.reconnectHint"),
            });
          } else {
            const parts = [
              t("refreshSuccess"),
              data.data.pagesSynced != null
                ? t("pagesSynced", { count: data.data.pagesSynced })
                : null,
              data.data.formsSynced != null
                ? t("formsSynced", { count: data.data.formsSynced })
                : null,
            ].filter(Boolean);
            toast.success(parts.join(" · "));
          }
          await onComplete?.();
          return;
        }

        if (action === "syncPages") {
          const res = await fetchWithTimeout("/api/facebook/pages", { method: "POST" });
          const data = await res.json();
          if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
            toast.error(tFb("tokenInvalid"), { description: t("errors.reconnectHint") });
            return;
          }
          if (data.error) {
            toast.error(data.error.message ?? t("errors.syncPages"), {
              description: t("errors.reconnectHint"),
            });
            return;
          }
          toast.success(t("pagesSynced", { count: data.data?.pages?.length ?? 0 }));
          await onComplete?.();
          return;
        }

        if (action === "syncForms") {
          const res = await fetchWithTimeout("/api/forms", { method: "POST" });
          const data = await res.json();
          if (data.error?.code === "INVALID_FACEBOOK_TOKEN") {
            toast.error(tFb("tokenInvalid"), { description: t("errors.reconnectHint") });
            return;
          }
          if (data.error) {
            toast.error(data.error.message ?? t("errors.syncForms"), {
              description: t("errors.reconnectHint"),
            });
            return;
          }
          toast.success(t("formsSynced", { count: data.data?.synced ?? 0 }));
          await onComplete?.();
        }
      } catch {
        toast.error(t("errors.network"), { description: t("errors.retryHint") });
      } finally {
        setLoadingAction(null);
      }
    },
    [onComplete, t, tFb]
  );

  const viewConnectionLogs = useCallback(() => {
    router.push("/activity");
  }, [router]);

  const sendTestLead = useCallback(() => {
    router.push("/connections/webhook");
  }, [router]);

  return { loadingAction, run, viewConnectionLogs, sendTestLead };
}
