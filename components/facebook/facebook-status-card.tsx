"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Shield, XCircle } from "lucide-react";
import { facebookUiStatusBadgeVariant } from "@/lib/facebook-diagnosis";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type FacebookStatusCardData = {
  uiStatus?: string;
  diagnosis?: string;
  facebookUserName?: string | null;
  facebookUserPictureUrl?: string | null;
  facebookUserId?: string | null;
  appIdUsed?: string | null;
  loginConfigIdAtAuth?: string | null;
  grantedScopes?: string[];
  missingScopes?: string[];
  connectedAt?: string | null;
  lastCheckedAt?: string | null;
  lastError?: string | null;
  lastErrorCode?: string | null;
  hasLoginConfigId?: boolean;
};

export function FacebookStatusCard({
  facebook,
  locale,
  hasLoginConfigId,
  className,
}: {
  facebook: FacebookStatusCardData;
  locale: string;
  hasLoginConfigId?: boolean;
  className?: string;
}) {
  const t = useTranslations("facebook");
  const uiStatus = facebook.uiStatus ?? "disconnected";
  const statusLabel = t(`uiStatus_${uiStatus}` as "uiStatus_disconnected");
  const variant = facebookUiStatusBadgeVariant(
    uiStatus as Parameters<typeof facebookUiStatusBadgeVariant>[0]
  );

  const diagnosis = facebook.diagnosis;
  const diagnosisHint =
    diagnosis && diagnosis !== "fully_connected" && diagnosis !== "disconnected"
      ? t(`diagnosis_${diagnosis}` as "diagnosis_connected_profile_only")
      : null;

  const granted = facebook.grantedScopes ?? [];
  const missing = facebook.missingScopes ?? [];
  const showScopes = granted.length > 0 || uiStatus !== "disconnected";

  const isSuccess = uiStatus === "fully_connected";
  const isWarning =
    uiStatus === "profile_connected" ||
    uiStatus === "permissions_missing" ||
    uiStatus === "pages_missing";
  const isError = uiStatus === "error";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-4",
        isError
          ? "border-destructive/30 bg-destructive/5"
          : isSuccess
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isWarning
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border/60 bg-card",
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
            <Badge variant={variant}>{statusLabel}</Badge>
            {isSuccess && (
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

      {(facebook.connectedAt || facebook.lastCheckedAt) && (
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {facebook.connectedAt && (
            <p>
              {t("connectedAtLabel")}: {formatDate(facebook.connectedAt, locale)}
            </p>
          )}
          {facebook.lastCheckedAt && (
            <p>
              {t("lastChecked")}: {formatDate(facebook.lastCheckedAt, locale)}
            </p>
          )}
        </div>
      )}

      {diagnosisHint && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">{diagnosisHint}</p>
        </div>
      )}

      {!hasLoginConfigId && uiStatus !== "disconnected" && (
        <div className="flex items-start gap-2 rounded-lg border border-[#1877F2]/20 bg-[#1877F2]/5 px-3 py-2.5">
          <Shield className="h-4 w-4 text-[#1877F2] shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{t("loginConfigHint")}</p>
        </div>
      )}

      {showScopes && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("grantedScopesTitle")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {granted.map((scope) => (
              <Badge
                key={scope}
                variant="secondary"
                className="text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              >
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                {scope}
              </Badge>
            ))}
            {missing.map((scope) => (
              <Badge
                key={scope}
                variant="warning"
                className="text-[10px] font-mono border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                <XCircle className="h-2.5 w-2.5 mr-1" />
                {scope}
              </Badge>
            ))}
            {granted.length === 0 && missing.length === 0 && (
              <span className="text-xs text-muted-foreground">{t("noScopesYet")}</span>
            )}
          </div>
        </div>
      )}

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
