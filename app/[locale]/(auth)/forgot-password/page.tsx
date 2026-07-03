"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandMark } from "@/components/auth/auth-brand-mark";
import { AppFooter } from "@/components/layout/footer";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey =
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim() || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        ...(turnstileSiteKey ? { turnstileToken } : {}),
      }),
    });
    if (res.status === 429) {
      toast.error(tErrors("rateLimited"));
    } else {
      toast.success(t("resetEmailSent"));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AuthBrandMark />
          <CardTitle className="text-2xl">{t("resetTitle")}</CardTitle>
          <CardDescription>{t("resetSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {t("sendResetLink")}
            </Button>
            {turnstileSiteKey && (
              <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
            )}
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
      <AppFooter compact />
    </div>
  );
}
