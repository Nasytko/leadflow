"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  resolveMetaConnectionStatus,
  resolveTokenStatus,
  type MetaConnectionSeverity,
} from "@/lib/meta/meta-connection-status";
import {
  useMetaAccountActions,
  type MetaAccountAction,
} from "@/hooks/use-meta-account-actions";
import {
  RefreshCw,
  Link2,
  Unplug,
  Layers,
  FileText,
  FlaskConical,
  ScrollText,
  MoreHorizontal,
} from "lucide-react";

export type MetaAccountCardData = {
  connected: boolean;
  status?: string;
  uiStatus?: string;
  tokenInvalid?: boolean;
  facebookUserId?: string | null;
  facebookUserName?: string | null;
  facebookUserEmail?: string | null;
  facebookUserPictureUrl?: string | null;
  connectedAt?: string | null;
  lastCheckedAt?: string | null;
  updatedAt?: string | null;
  tokenExpiresAt?: string | null;
  connectedPagesCount?: number;
  activeFormsCount?: number;
  lastError?: string | null;
};

function severityToStatusLevel(severity: MetaConnectionSeverity) {
  if (severity === "ok") return "ok" as const;
  if (severity === "warning") return "warning" as const;
  if (severity === "error") return "error" as const;
  return "unknown" as const;
}

type ActionButtonProps = {
  action: MetaAccountAction | "testLead" | "logs";
  label: string;
  icon: React.ElementType;
  variant?: "default" | "outline" | "ghost" | "destructive";
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

function ActionButton({
  label,
  icon: Icon,
  variant = "outline",
  loading,
  disabled,
  onClick,
  className,
}: ActionButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn("min-h-11 w-full justify-start gap-2 sm:w-auto sm:min-h-9", className)}
    >
      <Icon className={cn("h-4 w-4 shrink-0", loading && "animate-spin")} strokeWidth={1.5} />
      {label}
    </Button>
  );
}

export function MetaAccountCard({
  account,
  metaConfigured,
  loading,
  onRefresh,
}: {
  account: MetaAccountCardData | null;
  metaConfigured: boolean;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  const t = useTranslations("connections.facebook.accountCard");
  const locale = useLocale();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const { loadingAction, run, viewConnectionLogs, sendTestLead } = useMetaAccountActions(onRefresh);

  if (loading) {
    return <Skeleton className="h-56 w-full rounded-lg" />;
  }

  const hasConnection = !!account?.connected && account?.status !== "disconnected";
  const connectionStatus = resolveMetaConnectionStatus({
    hasConnection,
    connectionStatus: account?.status,
    uiStatus: account?.uiStatus,
    tokenInvalid: account?.tokenInvalid,
    tokenExpiresAt: account?.tokenExpiresAt,
  });
  const tokenStatus = resolveTokenStatus({
    tokenExpiresAt: account?.tokenExpiresAt,
    tokenInvalid: account?.tokenInvalid,
  });

  const isBusy = loadingAction !== null;

  async function handleAction(action: MetaAccountAction) {
    setMobileActionsOpen(false);
    if (action === "disconnect") {
      if (!confirmDisconnect) {
        setConfirmDisconnect(true);
        return;
      }
      setConfirmDisconnect(false);
    }
    await run(action);
  }

  const primaryActions = (
    <>
      <ActionButton
        action="refresh"
        label={t("actions.refresh")}
        icon={RefreshCw}
        loading={loadingAction === "refresh"}
        disabled={!hasConnection || isBusy}
        onClick={() => void handleAction("refresh")}
      />
      <ActionButton
        action="reconnect"
        label={t("actions.reconnect")}
        icon={Link2}
        variant="default"
        loading={loadingAction === "reconnect"}
        disabled={!metaConfigured || isBusy}
        onClick={() => void handleAction("reconnect")}
      />
    </>
  );

  const secondaryActions = (
    <>
      <ActionButton
        action="syncPages"
        label={t("actions.syncPages")}
        icon={Layers}
        loading={loadingAction === "syncPages"}
        disabled={!hasConnection || isBusy}
        onClick={() => void handleAction("syncPages")}
      />
      <ActionButton
        action="syncForms"
        label={t("actions.syncForms")}
        icon={FileText}
        loading={loadingAction === "syncForms"}
        disabled={!hasConnection || isBusy}
        onClick={() => void handleAction("syncForms")}
      />
      <ActionButton
        action="testLead"
        label={t("actions.testLead")}
        icon={FlaskConical}
        loading={false}
        disabled={!hasConnection}
        onClick={() => {
          setMobileActionsOpen(false);
          sendTestLead();
        }}
      />
      <ActionButton
        action="logs"
        label={t("actions.logs")}
        icon={ScrollText}
        loading={false}
        onClick={() => {
          setMobileActionsOpen(false);
          viewConnectionLogs();
        }}
      />
    </>
  );

  if (!hasConnection) {
    return (
      <div className="surface px-6 py-8 sm:px-8 space-y-6">
        <div className="space-y-2">
          <h2 className="type-title">{t("notConnectedTitle")}</h2>
          <p className="type-body text-muted-foreground">{t("notConnectedDesc")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton
            action="reconnect"
            label={t("actions.connect")}
            icon={Link2}
            variant="default"
            loading={loadingAction === "reconnect"}
            disabled={!metaConfigured || isBusy}
            onClick={() => void handleAction("reconnect")}
            className="sm:w-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="surface px-6 py-8 sm:px-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 min-w-0">
          {account?.facebookUserPictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.facebookUserPictureUrl}
              alt={account.facebookUserName ?? "Facebook"}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full border border-border object-cover shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/[0.04] text-lg font-medium">
              {account?.facebookUserName?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <p className="type-title truncate">{account?.facebookUserName ?? "—"}</p>
            {account?.facebookUserEmail && (
              <p className="type-caption truncate">{account.facebookUserEmail}</p>
            )}
            {account?.facebookUserId && (
              <p className="type-caption font-mono truncate">
                {t("facebookId")}: {account.facebookUserId}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <StatusBadge
                status={severityToStatusLevel(connectionStatus.severity)}
                label={t(connectionStatus.labelKey)}
              />
              <StatusBadge
                status={severityToStatusLevel(tokenStatus.severity)}
                label={t(tokenStatus.labelKey)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 hairline-y py-4">
        <div>
          <p className="type-label text-muted-foreground">{t("stats.pages")}</p>
          <p className="type-title mt-1">{account?.connectedPagesCount ?? 0}</p>
        </div>
        <div>
          <p className="type-label text-muted-foreground">{t("stats.forms")}</p>
          <p className="type-title mt-1">{account?.activeFormsCount ?? 0}</p>
        </div>
        <div>
          <p className="type-label text-muted-foreground">{t("stats.connectedAt")}</p>
          <p className="type-body mt-1">
            {account?.connectedAt ? formatDate(account.connectedAt, locale) : "—"}
          </p>
        </div>
        <div>
          <p className="type-label text-muted-foreground">{t("stats.updatedAt")}</p>
          <p className="type-body mt-1">
            {account?.updatedAt
              ? formatDate(account.updatedAt, locale)
              : account?.lastCheckedAt
                ? formatDate(account.lastCheckedAt, locale)
                : "—"}
          </p>
        </div>
      </div>

      {account?.tokenExpiresAt && (
        <p className="type-caption text-muted-foreground">
          {t("tokenExpires")}: {formatDate(account.tokenExpiresAt, locale)}
        </p>
      )}

      {account?.lastError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 space-y-1">
          <p className="type-body font-medium text-destructive">{t("lastError")}</p>
          <p className="type-caption text-muted-foreground">{account.lastError}</p>
          <p className="type-caption text-muted-foreground">{t(connectionStatus.recommendedActionKey)}</p>
        </div>
      )}

      {/* Desktop actions */}
      <div className="hidden sm:block space-y-4">
        <div className="flex flex-wrap gap-2">{primaryActions}</div>
        <div className="flex flex-wrap gap-2">{secondaryActions}</div>
        {confirmDisconnect ? (
          <div className="rounded-lg border border-destructive/30 px-4 py-4 space-y-3">
            <p className="type-body">{t("disconnectConfirm")}</p>
            <p className="type-caption text-muted-foreground">{t("disconnectConfirmDesc")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                className="min-h-11"
                disabled={isBusy}
                onClick={() => void handleAction("disconnect")}
              >
                <Unplug className="h-4 w-4 mr-2" />
                {loadingAction === "disconnect" ? t("actions.disconnecting") : t("actions.disconnectConfirm")}
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirmDisconnect(false)}
              >
                {t("actions.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="min-h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
            disabled={isBusy}
            onClick={() => setConfirmDisconnect(true)}
          >
            <Unplug className="h-4 w-4 mr-2" />
            {t("actions.disconnect")}
          </Button>
        )}
      </div>

      {/* Mobile actions */}
      <div className="sm:hidden space-y-2">
        <div className="grid grid-cols-1 gap-2">{primaryActions}</div>
        <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="min-h-11 w-full">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              {t("moreActions")}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-6">
            <SheetHeader className="text-left mb-4">
              <SheetTitle>{t("moreActions")}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 pb-6">
              {secondaryActions}
              {confirmDisconnect ? (
                <div className="rounded-lg border border-destructive/30 p-4 space-y-3 mt-2">
                  <p className="type-body">{t("disconnectConfirm")}</p>
                  <p className="type-caption text-muted-foreground">{t("disconnectConfirmDesc")}</p>
                  <div className="grid gap-2">
                    <Button
                      variant="destructive"
                      className="min-h-11 w-full"
                      disabled={isBusy}
                      onClick={() => void handleAction("disconnect")}
                    >
                      {loadingAction === "disconnect"
                        ? t("actions.disconnecting")
                        : t("actions.disconnectConfirm")}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11 w-full"
                      onClick={() => setConfirmDisconnect(false)}
                    >
                      {t("actions.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="min-h-11 w-full text-destructive border-destructive/30"
                  disabled={isBusy}
                  onClick={() => setConfirmDisconnect(true)}
                >
                  <Unplug className="h-4 w-4 mr-2" />
                  {t("actions.disconnect")}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <p className="type-caption text-muted-foreground">
        {t(connectionStatus.descriptionKey)}{" "}
        <Link href="/health" className="text-foreground hover:underline">
          {t("healthLink")}
        </Link>
      </p>
    </div>
  );
}
