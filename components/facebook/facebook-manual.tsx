"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ExternalLink, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ManualStep = {
  id: string;
  titleKey: string;
  items: string[];
  tip?: string;
  warning?: string;
};

const MANUAL_STEPS: ManualStep[] = [
  {
    id: "create-app",
    titleKey: "manualStep1Title",
    items: [
      "manualStep1Item1",
      "manualStep1Item2",
      "manualStep1Item3",
      "manualStep1Item4",
    ],
    tip: "manualStep1Tip",
  },
  {
    id: "facebook-login",
    titleKey: "manualStep2Title",
    items: [
      "manualStep2Item1",
      "manualStep2Item2",
      "manualStep2Item3",
      "manualStep2Item4",
    ],
    tip: "manualStep2Tip",
  },
  {
    id: "webhooks",
    titleKey: "manualStep3Title",
    items: [
      "manualStep3Item1",
      "manualStep3Item2",
      "manualStep3Item3",
      "manualStep3Item4",
      "manualStep3Item5",
    ],
    warning: "manualStep3Warning",
    tip: "manualStep3Tip",
  },
  {
    id: "leadflow-fields",
    titleKey: "manualStep4Title",
    items: [
      "manualStep4Item1",
      "manualStep4Item2",
      "manualStep4Item3",
      "manualStep4Item4",
      "manualStep4Item5",
    ],
  },
  {
    id: "connect-fb",
    titleKey: "manualStep5Title",
    items: [
      "manualStep5Item1",
      "manualStep5Item2",
      "manualStep5Item3",
      "manualStep5Item4",
    ],
  },
  {
    id: "pages-forms",
    titleKey: "manualStep6Title",
    items: [
      "manualStep6Item1",
      "manualStep6Item2",
      "manualStep6Item3",
      "manualStep6Item4",
    ],
  },
  {
    id: "production",
    titleKey: "manualStep7Title",
    items: [
      "manualStep7Item1",
      "manualStep7Item2",
      "manualStep7Item3",
    ],
    warning: "manualStep7Warning",
  },
  {
    id: "troubleshooting",
    titleKey: "manualStep8Title",
    items: [
      "manualStep8Item1",
      "manualStep8Item2",
      "manualStep8Item3",
      "manualStep8Item4",
      "manualStep8Item5",
    ],
  },
];

export function FacebookManual() {
  const t = useTranslations("facebook");
  const [openId, setOpenId] = useState<string>("create-app");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2]/10">
            <BookOpen className="h-4 w-4 text-[#1877F2]" />
          </div>
          <div>
            <h3 className="font-semibold">{t("manualTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("manualSubtitle")}</p>
          </div>
        </div>
        <a
          href="https://developers.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
        >
          developers.facebook.com
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-2">
        {MANUAL_STEPS.map((step, index) => {
          const isOpen = openId === step.id;
          return (
            <div
              key={step.id}
              className={cn(
                "rounded-xl border transition-all duration-200",
                isOpen
                  ? "border-[#1877F2]/30 bg-[#1877F2]/[0.03] shadow-sm"
                  : "border-border/60 hover:border-border"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? "" : step.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isOpen
                      ? "bg-[#1877F2] text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <span className="flex-1 font-medium text-sm">{t(step.titleKey)}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pl-14 space-y-3">
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    {step.items.map((itemKey) => (
                      <li key={itemKey} className="leading-relaxed">
                        {t(itemKey)}
                      </li>
                    ))}
                  </ol>
                  {step.tip && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                      💡 {t(step.tip)}
                    </div>
                  )}
                  {step.warning && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ {t(step.warning)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Badge variant="secondary" className="text-xs font-normal">
          pages_show_list
        </Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          leads_retrieval
        </Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          pages_manage_ads
        </Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          pages_read_engagement
        </Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          ads_read
        </Badge>
      </div>
    </div>
  );
}
