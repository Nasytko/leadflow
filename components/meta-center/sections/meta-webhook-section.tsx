"use client";

import { useTranslations } from "next-intl";
import { MetaSectionShell } from "@/components/meta-center/meta-section-shell";
import { FacebookWebhookDiagnostics } from "@/components/facebook/facebook-webhook-diagnostics";
import { FacebookTestLeadCard } from "@/components/facebook/facebook-test-lead-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function MetaWebhookSection() {
  const t = useTranslations("metaCenter.webhook");

  return (
    <MetaSectionShell title={t("title")} description={t("description")} helpKey="webhook">
      <Card className="rounded-2xl border-[#1877F2]/20 bg-[#1877F2]/5">
        <CardHeader>
          <CardTitle className="text-base">{t("testLeadTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("testLeadDesc")}</p>
          <a
            href="https://developers.facebook.com/tools/lead-ads-testing/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#1877F2] font-medium hover:underline"
          >
            Meta Lead Ads Testing Tool
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
      <FacebookTestLeadCard />
      <FacebookWebhookDiagnostics />
    </MetaSectionShell>
  );
}
