"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { mapTelegramErrorHint } from "@/lib/connections/telegram-setup-state";

export type TelegramConnectionStatus = {
  connected: boolean;
  status: string;
  chatId?: string;
  notificationLocale?: string;
  verified?: boolean;
  lastError?: string | null;
  lastErrorAt?: string | null;
  lastCheckedAt?: string | null;
};

export function useTelegramActions(onStatusChange?: (status: TelegramConnectionStatus) => void) {
  const t = useTranslations("telegram");
  const tConn = useTranslations("connections.telegram");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const loadStatus = useCallback(async (): Promise<TelegramConnectionStatus | null> => {
    setLoading(true);
    try {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 10000);
      const res = await apiFetch("/api/telegram", { signal: c.signal });
      clearTimeout(id);
      const data = await res.json();
      if (data.data) {
        onStatusChange?.(data.data);
        return data.data;
      }
      return null;
    } catch {
      toast.error(tCommon("error"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [onStatusChange, tCommon]);

  const saveConnection = useCallback(
    async (input: { botToken: string; chatId: string; notificationLocale: string }) => {
      setSaving(true);
      try {
        const res = await apiFetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (data.data?.connected) {
          toast.success(t("connectionSaved"));
          onStatusChange?.(data.data);
          return { ok: true as const, data: data.data as TelegramConnectionStatus };
        }
        const hintKey = mapTelegramErrorHint(data.error?.message);
        toast.error(
          hintKey ? tConn(`errors.${hintKey}`) : (data.error?.message ?? t("saveFailed"))
        );
        return { ok: false as const };
      } catch {
        toast.error(tCommon("error"));
        return { ok: false as const };
      } finally {
        setSaving(false);
      }
    },
    [onStatusChange, t, tCommon, tConn]
  );

  const sendTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/api/telegram/test", { method: "POST" });
      const data = await res.json();
      if (data.data?.sent) {
        toast.success(t("testSuccess"));
        const status = await loadStatus();
        return { ok: true as const, status };
      }
      const hintKey = mapTelegramErrorHint(data.error?.message);
      toast.error(hintKey ? tConn(`errors.${hintKey}`) : (data.error?.message ?? t("testFailed")));
      await loadStatus();
      return { ok: false as const };
    } catch {
      toast.error(t("testFailed"));
      return { ok: false as const };
    } finally {
      setTesting(false);
    }
  }, [loadStatus, t, tConn]);

  return {
    loading,
    saving,
    testing,
    loadStatus,
    saveConnection,
    sendTest,
  };
}
