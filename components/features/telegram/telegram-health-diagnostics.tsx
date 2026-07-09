"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mapTelegramDiagnostic } from "@/lib/connections/telegram-diagnostics";

export function TelegramHealthDiagnostics({ lastError }: { lastError: string | null | undefined }) {
  const t = useTranslations("connections.telegram.diagnostics");
  const diag = mapTelegramDiagnostic(lastError);

  if (!lastError) return null;

  const key =
    diag.kind === "token_invalid"
      ? "tokenInvalid"
      : diag.kind === "chat_not_found"
        ? "chatNotFound"
        : diag.kind === "forbidden"
          ? "forbidden"
          : diag.kind === "bot_not_started"
            ? "botNotStarted"
            : "unknown";

  return (
    <div className={cn("rounded-xl border border-amber-500/25 bg-amber-500/[0.04] px-4 py-3")}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="type-body font-medium">{t(`${key}.title`)}</p>
          <p className="type-caption text-muted-foreground whitespace-pre-line">{t(`${key}.desc`)}</p>
        </div>
      </div>
    </div>
  );
}

