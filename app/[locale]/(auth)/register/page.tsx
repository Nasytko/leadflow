"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { AppFooter } from "@/components/layout/footer";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileSiteKey =
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim() || "";
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name,
        locale,
        ...(inviteCode ? { inviteCode } : {}),
        ...(turnstileSiteKey ? { turnstileToken } : {}),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error?.code === "EMAIL_EXISTS" ? t("emailExists") : t("invalidCredentials"));
      setLoading(false);
      return;
    }

    toast.success(t("verificationEmailSent"));
    router.push("/verify-email");
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
          <CardDescription>{t("registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteCode">{t("inviteCode")}</Label>
              <Input id="inviteCode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder={t("inviteCodePlaceholder")} />
            </div>
            {turnstileSiteKey && (
              <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {t("registerButton")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-foreground hover:underline">
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
