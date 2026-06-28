"use client";

import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";

export type LastOAuthErrorData = {
  safeMessage: string;
  reason: string;
  metaErrorType?: string | null;
  metaErrorCode?: number | null;
  createdAt: string;
  action: string;
};

const KNOWN_REASONS = [
  "invalid_app_secret",
  "invalid_client_secret",
  "redirect_uri_mismatch",
  "invalid_state",
  "missing_permissions",
  "token_exchange_failed",
  "invalid_config_id",
  "missing_code",
  "oauth_denied",
  "oauth_failed",
  "sync_failed",
] as const;

const WARNING_REASONS = new Set([
  "invalid_state",
  "missing_permissions",
  "missing_code",
  "oauth_denied",
]);

function normalizeReason(reason: string): string {
  return reason === "invalid_client_secret" ? "invalid_app_secret" : reason;
}

function isSafeDetail(message: string, title: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes("secret") || lower.includes("token") || lower.includes("password")) {
    return false;
  }
  return message.trim() !== title.trim();
}

export function FacebookOAuthErrorAlert({
  error,
  onOpenDiagnostics,
  diagnosticsLoading,
  className,
}: {
  error: LastOAuthErrorData;
  onOpenDiagnostics: () => void;
  diagnosticsLoading?: boolean;
  className?: string;
}) {
  const t = useTranslations("facebook");
  const locale = useLocale();

  const reason = normalizeReason(error.reason);
  const isWarning = WARNING_REASONS.has(reason);
  const title = KNOWN_REASONS.includes(reason as (typeof KNOWN_REASONS)[number])
    ? t(`oauthErrors.${reason}` as "oauthErrors.invalid_app_secret")
    : t("oauthErrorAlertTitle");

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 space-y-3",
        isWarning
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-destructive/40 bg-destructive/10",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            isWarning ? "text-amber-600" : "text-destructive"
          )}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={cn(
              "font-medium text-sm",
              isWarning
                ? "text-amber-900 dark:text-amber-200"
                : "text-destructive"
            )}
          >
            {title}
          </p>
          {isSafeDetail(error.safeMessage, title) && (
            <p className="text-sm text-muted-foreground break-words">
              {error.safeMessage}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
            {error.metaErrorType && (
              <span>
                {t("oauthErrorMetaType")}: {error.metaErrorType}
              </span>
            )}
            {error.metaErrorCode != null && (
              <span>
                {t("oauthErrorMetaCode")}: {error.metaErrorCode}
              </span>
            )}
            <span>{formatDate(error.createdAt, locale)}</span>
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenDiagnostics}
        disabled={diagnosticsLoading}
        className={cn(
          "shrink-0",
          isWarning
            ? "border-amber-500/40 hover:bg-amber-500/10"
            : "border-destructive/30 hover:bg-destructive/10"
        )}
      >
        <Stethoscope className="h-4 w-4 mr-2" />
        {t("openOAuthDiagnostics")}
      </Button>
    </div>
  );
}
