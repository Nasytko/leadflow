"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStepKey =
  | "metaApp"
  | "businessLoginConfig"
  | "facebookAccount"
  | "pagesSelected"
  | "formsEnabled"
  | "telegram"
  | "testLead";

export type WizardStepsState = Record<WizardStepKey, boolean>;

const STEP_KEYS: WizardStepKey[] = [
  "metaApp",
  "businessLoginConfig",
  "facebookAccount",
  "pagesSelected",
  "formsEnabled",
  "telegram",
  "testLead",
];

const STEP_I18N: Record<WizardStepKey, string> = {
  metaApp: "wizardStep1",
  businessLoginConfig: "wizardStep2",
  facebookAccount: "wizardStep3",
  pagesSelected: "wizardStep4",
  formsEnabled: "wizardStep5",
  telegram: "wizardStep6",
  testLead: "wizardStep7",
};

function WizardStep({
  done,
  active,
  title,
  step,
}: {
  done: boolean;
  active: boolean;
  title: string;
  step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[52px]">
      <div
        className={cn(
          "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-bold transition-all",
          done
            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
            : active
            ? "bg-[#1877F2] text-white ring-4 ring-[#1877F2]/20"
            : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <p
        className={cn(
          "text-[9px] sm:text-[10px] text-center leading-tight max-w-[64px] sm:max-w-[72px]",
          active ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        {title}
      </p>
    </div>
  );
}

export function FacebookSetupWizard({ steps }: { steps: WizardStepsState }) {
  const t = useTranslations("facebook");
  const completedCount = STEP_KEYS.filter((k) => steps[k]).length;
  const firstIncomplete = STEP_KEYS.findIndex((k) => !steps[k]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1877F2] to-emerald-500 transition-all duration-500"
            style={{ width: `${(completedCount / STEP_KEYS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          {t("wizardProgress", { done: completedCount, total: STEP_KEYS.length })}
        </span>
      </div>
      <div className="flex items-start justify-between gap-0.5 sm:gap-1 overflow-x-auto pb-1">
        {STEP_KEYS.map((key, i) => (
          <WizardStep
            key={key}
            step={i + 1}
            done={steps[key]}
            active={i === firstIncomplete}
            title={t(STEP_I18N[key])}
          />
        ))}
      </div>
    </div>
  );
}
