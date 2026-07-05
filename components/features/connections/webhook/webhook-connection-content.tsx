"use client";

import { useTranslations } from "next-intl";
import { FacebookWebhookDiagnostics } from "@/components/features/facebook/health/webhook-diagnostics";
import { FacebookTestLeadCard } from "@/components/features/facebook/health/test-lead-card";

export function WebhookConnectionContent() {
  const t = useTranslations("connections.webhook");

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header className="space-y-2">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-body text-muted-foreground max-w-2xl">{t("description")}</p>
      </header>
      <div className="surface px-6 py-6 sm:px-8 space-y-3">
        <h2 className="type-title">{t("testLeadTitle")}</h2>
        <p className="type-body text-muted-foreground">{t("testLeadDesc")}</p>
        <a
          href="https://developers.facebook.com/tools/lead-ads-testing/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline type-body"
        >
          Meta Lead Ads Testing Tool
        </a>
      </div>
      <FacebookTestLeadCard />
      <FacebookWebhookDiagnostics />
    </div>
  );
}
