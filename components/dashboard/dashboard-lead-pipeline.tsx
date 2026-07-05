"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  sourceOk: boolean;
  processingOk: boolean;
  deliveryOk: boolean;
};

export function DashboardLeadPipeline({ sourceOk, processingOk, deliveryOk }: Props) {
  const t = useTranslations("dashboard.pipeline");

  const steps = [
    { id: "source", label: t("source"), ok: sourceOk, href: "/connections/facebook" },
    { id: "processing", label: t("processing"), ok: processingOk, href: "/connections/webhook" },
    { id: "delivery", label: t("delivery"), ok: deliveryOk, href: "/connections/telegram" },
  ];

  return (
    <section className="surface px-6 py-6 sm:px-8">
      <h2 className="type-title mb-4">{t("title")}</h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-3 flex-1 min-w-0">
            <Link
              href={step.href}
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 min-h-11 transition-colors hover:bg-muted/50",
                step.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
              )}
            >
              <p className="type-caption text-muted-foreground">{step.label}</p>
              <p className="type-body font-medium mt-0.5">
                {step.ok ? t("statusOk") : t("statusNeedsAttention")}
              </p>
            </Link>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
