"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  resolveFacebookNextSteps,
  type FacebookNextStepsInput,
} from "@/lib/connections/facebook-next-steps";

export function FacebookNextSteps(props: FacebookNextStepsInput) {
  const t = useTranslations("connections.facebook.overview.nextSteps");
  const { steps, allSet } = resolveFacebookNextSteps(props);

  return (
    <section className="surface px-6 py-5 sm:px-8 space-y-4">
      <h2 className="type-title">{t("title")}</h2>

      {allSet ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <p className="type-body text-emerald-900 dark:text-emerald-100">{t("allSet")}</p>
        </div>
      ) : steps.length === 0 ? null : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 min-h-11 hover:bg-muted/50 transition-colors"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary type-caption font-semibold">
                  {index + 1}
                </span>
                <span className="type-body flex-1">{t(`steps.${step.messageKey}`)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
