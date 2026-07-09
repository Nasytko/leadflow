"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "facebook" as const, href: "/connections/facebook", labelKey: "stepFacebook" },
  { key: "forms" as const, href: "/connections/facebook?step=forms", labelKey: "stepForms" },
  { key: "telegram" as const, href: "/connections/telegram", labelKey: "stepTelegram" },
  { key: "testLead" as const, href: "/connections/facebook?step=webhook", labelKey: "stepTestLead" },
];

type Props = {
  steps: Record<(typeof STEPS)[number]["key"], boolean>;
  completed: number;
  total: number;
  onRefresh: () => void;
};

export function ActivationMode({ steps, completed, total, onRefresh }: Props) {
  const t = useTranslations("dashboard.activation");
  const percent = Math.round((completed / total) * 100);
  const nextStep = STEPS.find((s) => !steps[s.key]);

  return (
    <div className="mx-auto max-w-[720px] space-y-8 py-4">
      <header className="text-center space-y-3">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-body text-muted-foreground max-w-md mx-auto">{t("subtitle")}</p>
        <div className="flex items-center justify-center gap-2 type-caption">
          <span className="font-semibold tabular-nums text-primary">{percent}%</span>
          <span className="text-muted-foreground">{t("progress", { done: completed, total })}</span>
        </div>
        <ProgressBar value={completed} max={total} className="max-w-sm mx-auto" />
      </header>

      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const done = steps[step.key];
          const isNext = nextStep?.key === step.key;
          return (
            <li
              key={step.key}
              className={cn(
                "rounded-2xl border px-5 py-4 flex items-center gap-4 transition-shadow",
                done && "border-emerald-500/25 bg-emerald-500/[0.03]",
                isNext && !done && "border-primary/30 bg-primary/[0.03] shadow-sm",
                !done && !isNext && "border-border bg-card"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border type-caption font-semibold">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className={cn("h-5 w-5", isNext ? "text-primary" : "text-muted-foreground")} />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="type-caption text-muted-foreground">{t("stepLabel", { n: index + 1 })}</p>
                <p className="type-body font-medium">{t(step.labelKey)}</p>
              </div>
              {!done && (
                <Button size="sm" asChild variant={isNext ? "default" : "outline"}>
                  <Link href={step.href}>
                    {t("start")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          {t("refresh")}
        </Button>
      </div>
    </div>
  );
}
