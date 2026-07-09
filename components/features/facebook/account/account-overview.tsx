"use client";

import { useTranslations, useLocale } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import type { FacebookOverviewData } from "@/services/facebook-overview.service";

type Props = {
  connection: NonNullable<FacebookOverviewData["connection"]>;
};

export function FacebookAccountOverview({ connection }: Props) {
  const t = useTranslations("connections.facebook.overview.account");
  const tCard = useTranslations("connections.facebook.accountCard");
  const locale = useLocale();

  const initials =
    connection.facebookUserName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "FB";

  const statusLevel =
    connection.connectionStatusSeverity === "ok"
      ? "ok"
      : connection.connectionStatusSeverity === "warning"
        ? "warning"
        : connection.connectionStatusSeverity === "error"
          ? "error"
          : "unknown";

  return (
    <section className="surface px-6 py-6 sm:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {connection.facebookUserPictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={connection.facebookUserPictureUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium text-muted-foreground">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="type-title truncate">
            {connection.facebookUserName ?? t("unknownUser")}
          </h2>
          {connection.facebookUserEmail && (
            <p className="type-body text-muted-foreground truncate">
              {connection.facebookUserEmail}
            </p>
          )}
          <p className="type-caption text-muted-foreground font-mono">
            {t("userId")}: {connection.facebookUserId ?? "—"}
          </p>
        </div>
        <StatusBadge
          status={statusLevel}
          label={tCard(`status.${connection.connectionStatus}.label`)}
        />
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="type-label text-muted-foreground">{t("token")}</dt>
          <dd className="type-body mt-1">
            {tCard(`token.${connection.tokenStatus === "connected" ? "valid" : connection.tokenStatus === "needs_reconnect" ? "expiringSoon" : connection.tokenStatus}`)}
            {connection.tokenExpiresInDays != null && connection.tokenExpiresInDays > 0 && (
              <span className="type-caption text-muted-foreground block">
                {t("expiresIn", { days: connection.tokenExpiresInDays })}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="type-label text-muted-foreground">{t("permissions")}</dt>
          <dd className="type-body mt-1">{connection.permissionsCount}</dd>
        </div>
        <div>
          <dt className="type-label text-muted-foreground">{t("connectedAt")}</dt>
          <dd className="type-body mt-1">
            {connection.connectedAt ? formatDate(connection.connectedAt, locale) : "—"}
          </dd>
        </div>
        <div>
          <dt className="type-label text-muted-foreground">{t("lastChecked")}</dt>
          <dd className="type-body mt-1">
            {connection.lastCheckedAt ? formatDate(connection.lastCheckedAt, locale) : "—"}
          </dd>
        </div>
        <div>
          <dt className="type-label text-muted-foreground">{t("lastSync")}</dt>
          <dd className="type-body mt-1">
            {connection.lastSyncAt ? formatDate(connection.lastSyncAt, locale) : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
