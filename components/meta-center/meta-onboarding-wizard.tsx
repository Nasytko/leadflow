"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStepsState } from "@/components/facebook/facebook-setup-wizard";

const STEP_ROUTES: { key: keyof WizardStepsState; href: string; labelKey: string }[] = [
  { key: "facebookAccount", href: "/meta/connect", labelKey: "wizard.step1" },
  { key: "businessPortfolio", href: "/meta/businesses", labelKey: "wizard.step2" },
  { key: "adAccountSelected", href: "/meta/ad-accounts", labelKey: "wizard.step3" },
  { key: "pagesSelected", href: "/meta/pages", labelKey: "wizard.step4" },
  { key: "formsEnabled", href: "/meta/forms", labelKey: "wizard.step5" },
  { key: "telegram", href: "/meta/telegram", labelKey: "wizard.step6" },
  { key: "testLead", href: "/meta/webhook", labelKey: "wizard.step7" },
  { key: "adAuditOpened", href: "/meta/audit", labelKey: "wizard.step8" },
];

export function MetaOnboardingWizard({
  steps,
  progress,
  total,
}: {
  steps: WizardStepsState;
  progress: number;
  total: number;
}) {
  const t = useTranslations("metaCenter");
  const firstIncomplete = STEP_ROUTES.find((s) => !steps[s.key]);

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t("wizard.title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("wizard.subtitle")}</p>
        </div>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          {t("wizard.progress", { done: progress, total })}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1877F2] to-emerald-500 transition-all"
          style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
        />
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_ROUTES.map((step, i) => {
          const done = steps[step.key];
          const isNext = firstIncomplete?.key === step.key;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-start gap-2 rounded-xl border p-3 text-sm transition-colors hover:bg-muted/50",
                  done && "border-emerald-500/30 bg-emerald-500/5",
                  isNext && !done && "border-[#1877F2]/40 ring-2 ring-[#1877F2]/20",
                  !done && !isNext && "border-border/60"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-emerald-500 text-white"
                      : isNext
                      ? "bg-[#1877F2] text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="font-medium leading-tight">{t(step.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      {firstIncomplete && (
        <p className="text-sm text-muted-foreground">
          {t("wizard.nextStep")}:{" "}
          <Link href={firstIncomplete.href} className="text-[#1877F2] font-medium hover:underline">
            {t(firstIncomplete.labelKey)}
          </Link>
        </p>
      )}
    </div>
  );
}
