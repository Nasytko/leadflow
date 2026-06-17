"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { facebookStatusBadgeVariant } from "@/lib/connection-status";
import { cn } from "@/lib/utils";

export type FacebookIdentity = {
  status: string;
  facebookUserId?: string | null;
  facebookUserName?: string | null;
  facebookUserPictureUrl?: string | null;
  connectedAt?: string | null;
  lastCheckedAt?: string | null;
  lastError?: string | null;
  lastErrorCode?: string | null;
  appIdUsed?: string | null;
};

export function FacebookIdentityCard({
  facebook,
  locale,
  className,
}: {
  facebook: FacebookIdentity;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("facebook");

  if (facebook.status === "disconnected") {
    return null;
  }

  const statusKey = `status_${facebook.status}` as
    | "status_connected"
    | "status_pending_pages"
    | "status_invalid"
    | "status_expired"
    | "status_error"
    | "status_disconnected";

  const statusLabel = [
    "connected",
    "pending_pages",
    "invalid",
    "expired",
    "error",
    "disconnected",
  ].includes(facebook.status)
    ? t(statusKey)
    : facebook.status;

  const hasError =
    facebook.status === "invalid" ||
    facebook.status === "expired" ||
    facebook.status === "error";

  const isPendingPages = facebook.status === "pending_pages";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        hasError
          ? "border-destructive/30 bg-destructive/5"
          : isPendingPages
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-emerald-500/30 bg-emerald-500/5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {facebook.facebookUserPictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={facebook.facebookUserPictureUrl}
            alt={facebook.facebookUserName ?? "Facebook"}
            width={48}
            height={48}
            className="rounded-full border shrink-0 h-12 w-12 object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-[#1877F2]/15 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-[#1877F2]">
              {facebook.facebookUserName?.[0] ?? "?"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={facebookStatusBadgeVariant(facebook.status)}>
              {statusLabel}
            </Badge>
            {facebook.status === "connected" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("connectionActive")}
              </span>
            )}
          </div>
          {facebook.facebookUserName && (
            <p className="font-medium mt-1.5">
              {t("connectedAs")}: {facebook.facebookUserName}
            </p>
          )}
          {facebook.facebookUserId && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {t("facebookId")}: {facebook.facebookUserId}
            </p>
          )}
          {facebook.appIdUsed && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {t("appIdUsed")}: {facebook.appIdUsed}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {facebook.connectedAt && (
          <p>
            {t("connectedAtLabel")}:{" "}
            {formatDate(facebook.connectedAt, locale)}
          </p>
        )}
        {facebook.lastCheckedAt && (
          <p>
            {t("lastChecked")}:{" "}
            {formatDate(facebook.lastCheckedAt, locale)}
          </p>
        )}
      </div>

      {facebook.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">{t("connectionError")}</p>
            <p className="text-muted-foreground mt-0.5">{facebook.lastError}</p>
            {facebook.lastErrorCode && (
              <p className="text-xs font-mono mt-1">Code: {facebook.lastErrorCode}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
