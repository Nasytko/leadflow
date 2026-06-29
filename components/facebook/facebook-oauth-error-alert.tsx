"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { getMetaUserErrorMessage } from "@/lib/meta-user-errors";

export type LastOAuthErrorData = {
  safeMessage: string;
  reason: string;
  metaErrorType?: string | null;
  metaErrorCode?: number | null;
  createdAt: string;
  action: string;
};

const WARNING_REASONS = new Set([
  "invalid_state",
  "missing_permissions",
  "missing_code",
  "oauth_denied",
  "no_pages",
  "no_ad_accounts",
  "webhook_not_verified",
]);

function normalizeReason(reason: string): string {
  return reason === "invalid_client_secret" ? "invalid_app_secret" : reason;
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
  const tMeta = useTranslations("metaCenter");
  const tFb = useTranslations("facebook");
  const locale = useLocale();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const reason = normalizeReason(error.reason);
  const isWarning = WARNING_REASONS.has(reason);
  const title = getMetaUserErrorMessage(
    reason,
    isAdmin,
    (key) => tMeta(key as "errors.invalid_app_secret.user"),
    error.safeMessage
  );

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
          {isAdmin && error.safeMessage && error.safeMessage !== title && (
            <p className="text-sm text-muted-foreground break-words">
              {error.safeMessage}
            </p>
          )}
          {isAdmin && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
              {error.metaErrorType && (
                <span>
                  {tFb("oauthErrorMetaType")}: {error.metaErrorType}
                </span>
              )}
              {error.metaErrorCode != null && (
                <span>
                  {tFb("oauthErrorMetaCode")}: {error.metaErrorCode}
                </span>
              )}
              <span>{formatDate(error.createdAt, locale)}</span>
            </div>
          )}
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
        {tFb("openOAuthDiagnostics")}
      </Button>
    </div>
  );
}
