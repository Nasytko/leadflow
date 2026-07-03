"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { AppFooter } from "@/components/layout/footer";

export default function PendingApprovalPage() {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AuthBrandMark />
            <CardTitle className="text-2xl">{t("approvalTitle")}</CardTitle>
            <CardDescription>{t("approvalSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("approvalHint")}</p>
          </CardContent>
        </Card>
      </div>
      <AppFooter compact />
    </div>
  );
}

