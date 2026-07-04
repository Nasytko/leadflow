"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { ConnectionPageShell } from "@/components/features/connections/connection-page-shell";
import { FacebookWebhookDiagnostics } from "@/components/facebook/facebook-webhook-diagnostics";
import { FacebookTestLeadCard } from "@/components/facebook/facebook-test-lead-card";

export function WebhookConnectionContent() {
  const t = useTranslations("connections.webhook");

  return (
    <ConnectionPageShell title={t("title")} description={t("description")} helpKey="webhook">
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
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <FacebookTestLeadCard />
      <FacebookWebhookDiagnostics />
    </ConnectionPageShell>
  );
}
