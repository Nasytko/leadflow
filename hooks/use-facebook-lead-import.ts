"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { safeToastId } from "@/lib/safe-toast-id";

export type LeadImportSummary = {
  imported: number;
  duplicates: number;
  failed: number;
  telegramFailed: number;
  queued?: boolean;
  message?: string;
};

export function useFacebookLeadImport(onComplete?: () => void | Promise<void>) {
  const t = useTranslations("forms");
  const [importing, setImporting] = useState(false);
  const [sendToTelegram, setSendToTelegram] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<LeadImportSummary | null>(null);

  const importLeads = useCallback(async () => {
    setImporting(true);
    try {
      const res = await apiFetch("/api/meta/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendImportedToTelegram: sendToTelegram,
          async: false,
        }),
      });
      const data = await res.json();
      const payload = data.data;

      if (data.error?.code === "CSRF_INVALID") {
        toast.error(t("importFailed"), {
          description: t("importSessionExpired"),
          id: safeToastId("import_csrf"),
        });
        return;
      }

      if (!payload) {
        toast.error(data.error?.message ?? t("importFailed"), {
          id: safeToastId("import_error"),
        });
        return;
      }

      if (payload.success === false) {
        toast.error(payload.message ?? t("importFailed"), {
          id: safeToastId(`import_error_${payload.code ?? "unknown"}`),
        });
        return;
      }

      if (payload.queued) {
        toast.success(payload.message ?? t("importQueued"), {
          id: safeToastId("import_queued"),
        });
        setLastImportSummary({ imported: 0, duplicates: 0, failed: 0, telegramFailed: 0, queued: true });
        return;
      }

      const imported = payload.imported ?? 0;
      const duplicates = payload.duplicates ?? 0;
      const failed = payload.failed ?? 0;
      const telegramFailed = payload.telegramFailed ?? 0;

      setLastImportSummary({
        imported,
        duplicates,
        failed,
        telegramFailed,
        message: payload.message,
      });

      if (imported === 0 && duplicates === 0 && failed === 0) {
        toast.info(payload.message ?? t("importNoLeads"), {
          id: safeToastId("import_no_leads"),
        });
      } else if (imported === 0 && duplicates > 0) {
        toast.info(t("importDuplicatesOnly", { duplicates }), {
          id: safeToastId("import_duplicates"),
        });
      } else {
        toast.success(
          payload.message ??
            t("importReport", {
              imported,
              skipped: duplicates,
              failed,
            }),
          { id: safeToastId("import_success") }
        );
      }

      if (sendToTelegram && telegramFailed > 0 && imported > 0) {
        toast.warning(t("importTelegramPartial", { telegramFailed }), {
          id: safeToastId("import_telegram_partial"),
        });
      }

      await onComplete?.();
    } catch {
      toast.error(t("importFailed"), { id: safeToastId("import_error") });
    } finally {
      setImporting(false);
    }
  }, [onComplete, sendToTelegram, t]);

  return {
    importing,
    sendToTelegram,
    setSendToTelegram,
    importLeads,
    lastImportSummary,
  };
}
