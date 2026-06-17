"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppFooter } from "@/components/layout/footer";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [turnstileSiteKey] = useState<string | null>(
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim() || null
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (!token) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? t("verifyFailed"));
        return;
      }
      if (data.data?.status === "pending_approval") {
        toast.success(t("verifyOkPendingApproval"));
        window.location.href = "/pending-approval";
        return;
      }
      toast.success(t("verifyOk"));
      window.location.href = "/login";
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(turnstileSiteKey ? { turnstileToken } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? t("resendFailed"));
        return;
      }
      toast.success(t("resendSent"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("verifyTitle")}</CardTitle>
            <CardDescription>{t("verifySubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {token && (
              <Button className="w-full" onClick={() => void handleVerify()} disabled={verifying}>
                {t("verifyButton")}
              </Button>
            )}

            <div className="rounded-xl border bg-background p-4 space-y-3">
              <p className="text-sm text-muted-foreground">{t("resendHint")}</p>
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {turnstileSiteKey && (
                  <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {t("resendVerification")}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
      <AppFooter compact />
    </div>
  );
}

