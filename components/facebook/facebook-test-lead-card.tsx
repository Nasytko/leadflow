"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const META_TESTING_TOOL_URL =
  "https://developers.facebook.com/tools/lead-ads-testing/";

export function FacebookTestLeadCard() {
  const t = useTranslations("facebook");

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("testLeadTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <ol className="list-decimal list-inside space-y-1">
          <li>{t("testLeadStep1")}</li>
          <li>{t("testLeadStep2")}</li>
          <li>{t("testLeadStep3")}</li>
          <li>{t("testLeadStep4")}</li>
          <li>{t("testLeadStep5")}</li>
          <li>{t("testLeadStep6")}</li>
        </ol>
        <Button asChild variant="default" size="sm">
          <a href={META_TESTING_TOOL_URL} target="_blank" rel="noopener noreferrer">
            {t("testLeadCta")}
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
