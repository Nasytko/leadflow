"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function FacebookLoginConfigCard({
  configId,
  configIdPresent,
  configIdValid,
  className,
}: {
  configId?: string | null;
  configIdPresent?: boolean;
  configIdValid?: boolean;
  className?: string;
}) {
  const t = useTranslations("facebook");
  const present = configIdPresent ?? !!configId;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        present && configIdValid
          ? "border-emerald-500/30 bg-emerald-500/5"
          : present
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-border/60 bg-muted/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-[#1877F2] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="font-medium text-sm">{t("loginConfigCardTitle")}</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("loginConfigCardIdLabel")}
              </p>
              <p className="font-mono text-sm mt-0.5 break-all">
                {configId ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("loginConfigCardStatusLabel")}
              </p>
              <Badge
                variant={present && configIdValid ? "success" : present ? "warning" : "secondary"}
                className="mt-1"
              >
                {present && configIdValid
                  ? t("loginConfigStatusPresent")
                  : present
                  ? t("loginConfigStatusInvalid")
                  : t("loginConfigStatusMissing")}
              </Badge>
            </div>
          </div>
          {!present && (
            <p className="text-xs text-muted-foreground">{t("loginConfigCardMissingHint")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
