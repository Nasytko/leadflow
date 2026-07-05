"use client";

import { useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  RefreshCw,
  FileText,
  Layers,
  Download,
  Megaphone,
  FlaskConical,
  ScrollText,
  Link2,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/navigation";
import { useMetaAccountActions } from "@/hooks/use-meta-account-actions";
import {
  getFacebookActionDisabledReason,
  type FacebookActionContext,
} from "@/lib/connections/facebook-sync-errors";

type Props = {
  context: FacebookActionContext;
  onRefresh: () => void | Promise<void>;
  syncingResource?: string | null;
  onSyncResource?: (resource: "pages" | "forms" | "adAccounts") => void | Promise<void>;
  onImportLeads?: () => void | Promise<void>;
  importingLeads?: boolean;
};

function ActionButton({
  label,
  icon: Icon,
  loading,
  disabled,
  disabledReason,
  variant = "outline",
  destructive,
  onClick,
  href,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  variant?: "default" | "outline" | "destructive" | "ghost";
  destructive?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const button = href && !disabled ? (
    <Button
      variant={destructive ? "outline" : variant}
      className={`min-h-11 w-full sm:w-auto justify-start ${destructive ? "text-destructive hover:text-destructive" : ""}`}
      disabled={loading}
      asChild
    >
      <Link href={href}>
        <Icon className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        {label}
      </Link>
    </Button>
  ) : (
    <Button
      variant={destructive ? "outline" : variant}
      className={`min-h-11 w-full sm:w-auto justify-start ${destructive ? "text-destructive hover:text-destructive" : ""}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      <Icon className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full sm:w-auto">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function FacebookActionCenter({
  context,
  onRefresh,
  syncingResource,
  onSyncResource,
  onImportLeads,
  importingLeads,
}: Props) {
  const t = useTranslations("connections.facebook.overview.actions");
  const tDisabled = useTranslations("connections.facebook.overview.actions.disabled");
  const { run, loadingAction } = useMetaAccountActions(onRefresh);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const reason = (action: Parameters<typeof getFacebookActionDisabledReason>[0]) => {
    const key = getFacebookActionDisabledReason(action, context);
    return key ? tDisabled(key) : null;
  };

  function scrollToImport() {
    document.getElementById("import-leads")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleImport() {
    const importDisabled = getFacebookActionDisabledReason("importLeads", context);
    if (importDisabled) {
      scrollToImport();
      return;
    }
    await onImportLeads?.();
  }

  const isBusy =
    loadingAction !== null ||
    !!importingLeads ||
    syncingResource != null;

  return (
    <TooltipProvider delayDuration={300}>
      <section className="surface px-6 py-6 sm:px-8 space-y-6">
        <div>
          <h2 className="type-title">{t("title")}</h2>
          <p className="type-caption text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
          <p className="type-label text-muted-foreground">{t("primary")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ActionButton
              label={t("refresh")}
              icon={RefreshCw}
              loading={loadingAction === "refresh"}
              disabled={!!reason("refresh") || isBusy}
              disabledReason={reason("refresh")}
              variant="default"
              onClick={() => void run("refresh")}
            />
            <ActionButton
              label={t("syncPages")}
              icon={Layers}
              loading={loadingAction === "syncPages" || syncingResource === "pages"}
              disabled={!!reason("syncPages") || isBusy}
              disabledReason={reason("syncPages")}
              onClick={() => void (onSyncResource ? onSyncResource("pages") : run("syncPages"))}
            />
            <ActionButton
              label={t("syncForms")}
              icon={FileText}
              loading={loadingAction === "syncForms" || syncingResource === "forms"}
              disabled={!!reason("syncForms") || isBusy}
              disabledReason={reason("syncForms")}
              onClick={() => void (onSyncResource ? onSyncResource("forms") : run("syncForms"))}
            />
            <ActionButton
              label={t("importLeads")}
              icon={Download}
              loading={importingLeads}
              disabled={!!reason("importLeads") || isBusy}
              disabledReason={reason("importLeads")}
              variant="default"
              onClick={() => void handleImport()}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="type-label text-muted-foreground">{t("secondary")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ActionButton
              label={t("syncAdAccounts")}
              icon={Megaphone}
              loading={syncingResource === "adAccounts"}
              disabled={!!reason("syncAdAccounts") || isBusy}
              disabledReason={reason("syncAdAccounts")}
              onClick={() => void onSyncResource?.("adAccounts")}
            />
            <ActionButton
              label={t("testLead")}
              icon={FlaskConical}
              disabled={!!reason("testLead") || isBusy}
              disabledReason={reason("testLead")}
              href="/connections/webhook"
            />
            <ActionButton
              label={t("viewActivity")}
              icon={ScrollText}
              href="/activity"
            />
            <ActionButton
              label={t("reconnect")}
              icon={Link2}
              loading={loadingAction === "reconnect"}
              disabled={isBusy}
              onClick={() => void run("reconnect")}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <p className="type-label text-destructive">{t("danger")}</p>
          {!confirmDisconnect ? (
            <ActionButton
              label={t("disconnect")}
              icon={Unplug}
              destructive
              disabled={isBusy}
              onClick={() => setConfirmDisconnect(true)}
            />
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                className="min-h-11"
                disabled={isBusy}
                onClick={() => void run("disconnect")}
              >
                {t("disconnectConfirm")}
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setConfirmDisconnect(false)}>
                {t("cancel")}
              </Button>
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
